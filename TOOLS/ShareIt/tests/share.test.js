/**
 * Unit tests for ShareIt client library.
 *
 * Run with: npm test
 * @jest-environment jsdom
 */

// Load ShareIt - jsdom environment is configured via jest
const ShareIt = require('../share.js');

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined)
  },
  writable: true,
  configurable: true
});


describe('ShareIt', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '<div id="content">Test Content</div>';
    // Clear any modals
    document.querySelectorAll('.shareit-overlay').forEach(el => el.remove());
  });

  describe('validateFilename', () => {
    test('accepts valid alphanumeric filenames', () => {
      expect(ShareIt.validateFilename('myfile')).toBe(true);
      expect(ShareIt.validateFilename('MyFile123')).toBe(true);
      expect(ShareIt.validateFilename('file123')).toBe(true);
    });

    test('accepts filenames with hyphens and underscores', () => {
      expect(ShareIt.validateFilename('my-file')).toBe(true);
      expect(ShareIt.validateFilename('my_file')).toBe(true);
      expect(ShareIt.validateFilename('my-file_123')).toBe(true);
    });

    test('accepts single character filenames', () => {
      expect(ShareIt.validateFilename('a')).toBe(true);
      expect(ShareIt.validateFilename('1')).toBe(true);
    });

    test('accepts maximum length filenames (100 chars)', () => {
      expect(ShareIt.validateFilename('a'.repeat(100))).toBe(true);
    });

    test('rejects empty filenames', () => {
      expect(ShareIt.validateFilename('')).toBe(false);
    });

    test('rejects filenames with spaces', () => {
      expect(ShareIt.validateFilename('my file')).toBe(false);
      expect(ShareIt.validateFilename(' myfile')).toBe(false);
    });

    test('rejects filenames with special characters', () => {
      expect(ShareIt.validateFilename('my.file')).toBe(false);
      expect(ShareIt.validateFilename('my/file')).toBe(false);
      expect(ShareIt.validateFilename('my@file')).toBe(false);
      expect(ShareIt.validateFilename('my!file')).toBe(false);
      expect(ShareIt.validateFilename('<script>')).toBe(false);
    });

    test('rejects filenames over 100 characters', () => {
      expect(ShareIt.validateFilename('a'.repeat(101))).toBe(false);
    });
  });

  describe('captureDOM', () => {
    test('captures body content', () => {
      document.body.innerHTML = '<div>Hello World</div>';
      const html = ShareIt.captureDOM();

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('Hello World');
    });

    test('removes script tags', () => {
      document.body.innerHTML = '<div>Content</div><script>alert("xss")</script>';
      const html = ShareIt.captureDOM();

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('alert');
      expect(html).toContain('Content');
    });

    test('removes input elements', () => {
      document.body.innerHTML = '<div>Content</div><input type="text" value="secret">';
      const html = ShareIt.captureDOM();

      expect(html).not.toContain('<input');
      expect(html).not.toContain('secret');
    });

    test('removes textarea elements', () => {
      document.body.innerHTML = '<div>Content</div><textarea>Private notes</textarea>';
      const html = ShareIt.captureDOM();

      expect(html).not.toContain('<textarea');
      expect(html).not.toContain('Private notes');
    });

    test('removes select elements', () => {
      document.body.innerHTML = '<div>Content</div><select><option>A</option></select>';
      const html = ShareIt.captureDOM();

      expect(html).not.toContain('<select');
    });

    test('removes submit buttons', () => {
      document.body.innerHTML = '<div>Content</div><button type="submit">Submit</button>';
      const html = ShareIt.captureDOM();

      expect(html).not.toContain('type="submit"');
    });

    test('preserves regular buttons', () => {
      document.body.innerHTML = '<div>Content</div><button type="button">Click</button>';
      const html = ShareIt.captureDOM();

      expect(html).toContain('Click');
    });

    test('preserves links', () => {
      document.body.innerHTML = '<a href="https://example.com">Link</a>';
      const html = ShareIt.captureDOM();

      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('Link');
    });

    test('preserves images with external URLs', () => {
      document.body.innerHTML = '<img src="https://example.com/image.png" alt="test">';
      const html = ShareIt.captureDOM();

      expect(html).toContain('src="https://example.com/image.png"');
    });

    test('includes proper HTML structure', () => {
      const html = ShareIt.captureDOM();

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<meta charset="UTF-8">');
      expect(html).toContain('<meta name="viewport"');
      expect(html).toContain('<title>Shared Content</title>');
    });
  });

  describe('inlineStyles', () => {
    test('applies computed styles to cloned elements', () => {
      // Create a styled element
      const original = document.createElement('div');
      original.style.color = 'red';
      original.style.fontSize = '16px';
      document.body.appendChild(original);

      const clone = original.cloneNode(true);
      ShareIt.inlineStyles(original, clone);

      // Clone should have styles applied
      expect(clone.style.cssText).toBeTruthy();
    });
  });

  describe('copyToClipboard', () => {
    test('copies text to clipboard successfully', async () => {
      navigator.clipboard.writeText.mockResolvedValue(undefined);

      const result = await ShareIt.copyToClipboard('https://example.com');

      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com');
    });

    test('returns false on clipboard error', async () => {
      navigator.clipboard.writeText.mockRejectedValue(new Error('Permission denied'));

      const result = await ShareIt.copyToClipboard('https://example.com');

      expect(result).toBe(false);
    });
  });

  describe('Modal UI', () => {
    test('createOverlay creates a modal overlay', () => {
      const overlay = ShareIt.createOverlay();

      expect(overlay.className).toBe('shareit-overlay');
      expect(overlay.style.position).toBe('fixed');
      expect(overlay.style.zIndex).toBe('999999');
    });

    test('removeExistingModals cleans up overlays', () => {
      // Create some modals
      const overlay1 = ShareIt.createOverlay();
      const overlay2 = ShareIt.createOverlay();
      document.body.appendChild(overlay1);
      document.body.appendChild(overlay2);

      expect(document.querySelectorAll('.shareit-overlay').length).toBe(2);

      ShareIt.removeExistingModals();

      expect(document.querySelectorAll('.shareit-overlay').length).toBe(0);
    });

    test('showLoading creates loading modal', () => {
      ShareIt.showLoading();

      const loading = document.getElementById('shareit-loading');
      expect(loading).toBeTruthy();
      expect(loading.textContent).toContain('Uploading');
    });

    test('showError creates error modal', () => {
      ShareIt.showError('Test error message');

      const overlay = document.querySelector('.shareit-overlay');
      expect(overlay).toBeTruthy();
      expect(overlay.textContent).toContain('Test error message');
      expect(overlay.textContent).toContain('Share failed');
    });

    test('showResult creates result modal with URL', () => {
      ShareIt.showResult('https://example.com/test.html', true);

      const overlay = document.querySelector('.shareit-overlay');
      expect(overlay).toBeTruthy();
      expect(overlay.textContent).toContain('https://example.com/test.html');
      expect(overlay.textContent).toContain('successfully');
    });
  });

  describe('getUploadUrl', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    test('returns presigned URL on success', async () => {
      const mockResponse = {
        presignedUrl: 'https://s3.amazonaws.com/presigned',
        publicUrl: 'https://bucket.s3-website.amazonaws.com/test.html',
        finalFilename: 'test.html'
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await ShareIt.getUploadUrl('test');

      expect(result.presignedUrl).toBe(mockResponse.presignedUrl);
      expect(result.publicUrl).toBe(mockResponse.publicUrl);
    });

    test('throws on error response', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid filename' })
      });

      await expect(ShareIt.getUploadUrl('bad file'))
        .rejects.toThrow('Invalid filename');
    });
  });

  describe('uploadToS3', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    test('uploads HTML content successfully', async () => {
      global.fetch.mockResolvedValue({ ok: true });

      await expect(ShareIt.uploadToS3('https://presigned-url.com', '<html>'))
        .resolves.not.toThrow();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://presigned-url.com',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'text/html' },
          body: '<html>'
        })
      );
    });

    test('throws on upload failure', async () => {
      global.fetch.mockResolvedValue({ ok: false });

      await expect(ShareIt.uploadToS3('https://presigned-url.com', '<html>'))
        .rejects.toThrow('Failed to upload to S3');
    });
  });

  describe('MAX_SIZE', () => {
    test('is set to 50MB', () => {
      expect(ShareIt.MAX_SIZE).toBe(50 * 1024 * 1024);
    });
  });
});
