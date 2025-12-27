"""
Unit tests for ShareIt Lambda handler.

Run with: pytest lambda/test_handler.py -v
"""

import json
import os
import pytest
from unittest.mock import patch, MagicMock
from botocore.exceptions import ClientError

# Set environment variables before importing handler
os.environ['S3_BUCKET'] = 'test-bucket'
os.environ['S3_REGION'] = 'us-east-1'
os.environ['ALLOWED_ORIGINS'] = 'https://example.com,https://test-domain.com'
os.environ['ALLOWED_IPS'] = '1.2.3.4,5.6.7.8'
os.environ['WEBSITE_ENDPOINT'] = 'http://test-bucket.s3-website-us-east-1.amazonaws.com'

from handler import handler, is_origin_allowed, object_exists, FILENAME_PATTERN


class TestOriginValidation:
    """Tests for origin validation logic."""

    def test_allowed_production_origin(self):
        """Production origin in allowlist should be allowed."""
        assert is_origin_allowed('https://example.com', '9.9.9.9') is True
        assert is_origin_allowed('https://test-domain.com', '9.9.9.9') is True

    def test_blocked_unknown_origin(self):
        """Unknown origin should be blocked."""
        assert is_origin_allowed('https://evil.com', '9.9.9.9') is False
        assert is_origin_allowed('https://other.com', '1.2.3.4') is False

    def test_localhost_with_valid_ip(self):
        """Localhost with allowed IP should be allowed."""
        assert is_origin_allowed('http://localhost:3000', '1.2.3.4') is True
        assert is_origin_allowed('http://localhost:8080', '5.6.7.8') is True
        assert is_origin_allowed('http://127.0.0.1:3000', '1.2.3.4') is True

    def test_localhost_with_invalid_ip(self):
        """Localhost with non-allowed IP should be blocked."""
        assert is_origin_allowed('http://localhost:3000', '9.9.9.9') is False
        assert is_origin_allowed('http://127.0.0.1:8080', '10.10.10.10') is False

    def test_empty_origin(self):
        """Empty origin should be blocked."""
        assert is_origin_allowed('', '1.2.3.4') is False
        assert is_origin_allowed(None, '1.2.3.4') is False


class TestFilenameValidation:
    """Tests for filename validation regex."""

    def test_valid_filenames(self):
        """Valid filenames should match the pattern."""
        valid_names = [
            'myfile',
            'my-file',
            'my_file',
            'MyFile123',
            'a',
            'a' * 100,  # Max length
        ]
        for name in valid_names:
            assert FILENAME_PATTERN.match(name), f"'{name}' should be valid"

    def test_invalid_filenames(self):
        """Invalid filenames should not match."""
        invalid_names = [
            '',
            'my file',  # Space
            'my.file',  # Dot
            'my/file',  # Slash
            'my@file',  # Special char
            '<script>',  # HTML
            'a' * 101,  # Too long
        ]
        for name in invalid_names:
            assert not FILENAME_PATTERN.match(name), f"'{name}' should be invalid"


class TestHandler:
    """Integration tests for the Lambda handler."""

    def create_event(self, filename='test-file', origin='https://example.com', source_ip='9.9.9.9'):
        """Helper to create a test event."""
        return {
            'requestContext': {
                'http': {
                    'method': 'POST',
                    'sourceIp': source_ip
                }
            },
            'headers': {
                'origin': origin
            },
            'body': json.dumps({'filename': filename})
        }

    @patch('handler.s3')
    def test_successful_upload(self, mock_s3):
        """Successful request should return presigned URL."""
        mock_s3.head_object.side_effect = ClientError(
            {'Error': {'Code': '404'}}, 'HeadObject'
        )
        mock_s3.generate_presigned_url.return_value = 'https://presigned-url.com'

        event = self.create_event(filename='my-report')
        response = handler(event, None)

        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['presignedUrl'] == 'https://presigned-url.com'
        assert body['finalFilename'] == 'my-report.html'
        assert 'publicUrl' in body

    @patch('handler.s3')
    def test_collision_appends_timestamp(self, mock_s3):
        """Existing file should trigger timestamp suffix."""
        mock_s3.head_object.return_value = {}  # File exists
        mock_s3.generate_presigned_url.return_value = 'https://presigned-url.com'

        event = self.create_event(filename='existing-file')
        response = handler(event, None)

        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        # Filename should have timestamp
        assert body['finalFilename'].startswith('existing-file-')
        assert body['finalFilename'].endswith('.html')
        assert body['finalFilename'] != 'existing-file.html'

    def test_invalid_origin_rejected(self):
        """Invalid origin should return 403."""
        event = self.create_event(origin='https://evil.com')
        response = handler(event, None)

        assert response['statusCode'] == 403
        body = json.loads(response['body'])
        assert body['code'] == 'INVALID_ORIGIN'

    def test_invalid_filename_rejected(self):
        """Invalid filename should return 400."""
        event = self.create_event(filename='bad file name!')
        response = handler(event, None)

        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert body['code'] == 'INVALID_FILENAME'

    def test_empty_filename_rejected(self):
        """Empty filename should return 400."""
        event = self.create_event(filename='')
        response = handler(event, None)

        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert body['code'] == 'INVALID_FILENAME'

    def test_options_request(self):
        """OPTIONS request should return 200 for CORS preflight."""
        event = {
            'requestContext': {
                'http': {
                    'method': 'OPTIONS',
                    'sourceIp': '1.2.3.4'
                }
            },
            'headers': {}
        }
        response = handler(event, None)

        assert response['statusCode'] == 200

    def test_invalid_json_body(self):
        """Invalid JSON should return 400."""
        event = {
            'requestContext': {
                'http': {
                    'method': 'POST',
                    'sourceIp': '9.9.9.9'
                }
            },
            'headers': {
                'origin': 'https://example.com'
            },
            'body': 'not valid json'
        }
        response = handler(event, None)

        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert body['code'] == 'INVALID_REQUEST'

    @patch('handler.s3')
    def test_s3_error_handling(self, mock_s3):
        """S3 error should return 500."""
        mock_s3.head_object.side_effect = ClientError(
            {'Error': {'Code': '404'}}, 'HeadObject'
        )
        mock_s3.generate_presigned_url.side_effect = ClientError(
            {'Error': {'Code': 'InternalError'}}, 'GeneratePresignedUrl'
        )

        event = self.create_event()
        response = handler(event, None)

        assert response['statusCode'] == 500
        body = json.loads(response['body'])
        assert body['code'] == 'S3_ERROR'

    def test_cors_headers_present(self):
        """Response should include CORS headers."""
        event = self.create_event(origin='https://evil.com')
        response = handler(event, None)

        assert 'Access-Control-Allow-Origin' in response['headers']
        assert 'Access-Control-Allow-Methods' in response['headers']


class TestObjectExists:
    """Tests for S3 object existence check."""

    @patch('handler.s3')
    def test_object_exists_true(self, mock_s3):
        """Should return True when object exists."""
        mock_s3.head_object.return_value = {}
        assert object_exists('test.html') is True

    @patch('handler.s3')
    def test_object_exists_false(self, mock_s3):
        """Should return False when object doesn't exist."""
        mock_s3.head_object.side_effect = ClientError(
            {'Error': {'Code': '404'}}, 'HeadObject'
        )
        assert object_exists('test.html') is False

    @patch('handler.s3')
    def test_object_exists_error(self, mock_s3):
        """Should raise on unexpected S3 error."""
        mock_s3.head_object.side_effect = ClientError(
            {'Error': {'Code': 'AccessDenied'}}, 'HeadObject'
        )
        with pytest.raises(ClientError):
            object_exists('test.html')


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
