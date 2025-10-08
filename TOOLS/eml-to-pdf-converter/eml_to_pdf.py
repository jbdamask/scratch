#!/usr/bin/env python3
"""
EML to PDF Converter
A command line tool to convert .eml email files to PDF format.
"""

import argparse
import email
import email.policy
import sys
import os
from pathlib import Path
from datetime import datetime
from email.message import EmailMessage
import html
import re


def parse_eml_file(eml_path):
    """Parse an EML file and extract email content."""
    try:
        with open(eml_path, 'rb') as f:
            msg = email.message_from_bytes(f.read(), policy=email.policy.default)
        return msg
    except Exception as e:
        print(f"Error parsing EML file: {e}")
        return None


def extract_email_content(msg):
    """Extract and format email content for PDF conversion."""
    content = {}

    # Extract headers
    content['subject'] = msg.get('subject', 'No Subject')
    content['from'] = msg.get('from', 'Unknown Sender')
    content['to'] = msg.get('to', 'Unknown Recipient')
    content['date'] = msg.get('date', 'Unknown Date')
    content['cc'] = msg.get('cc', '')
    content['bcc'] = msg.get('bcc', '')

    # Extract body content
    body_text = ""
    body_html = ""

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            if content_type == "text/plain":
                body_text = part.get_content()
            elif content_type == "text/html":
                body_html = part.get_content()
    else:
        content_type = msg.get_content_type()
        if content_type == "text/plain":
            body_text = msg.get_content()
        elif content_type == "text/html":
            body_html = msg.get_content()

    # Prefer HTML content if available, otherwise use plain text
    if body_html:
        content['body'] = body_html
        content['body_type'] = 'html'
    else:
        content['body'] = body_text
        content['body_type'] = 'text'

    return content


def create_html_for_pdf(email_content):
    """Create HTML content suitable for PDF conversion."""

    # Escape text content for HTML
    def escape_text(text):
        if not text:
            return ""
        return html.escape(str(text)).replace('\n', '<br>')

    # Create HTML structure
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                line-height: 1.6;
            }}
            .header {{
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
                margin-bottom: 20px;
            }}
            .header-row {{
                margin-bottom: 10px;
            }}
            .header-label {{
                font-weight: bold;
                display: inline-block;
                width: 80px;
            }}
            .subject {{
                font-size: 1.2em;
                font-weight: bold;
                margin-bottom: 15px;
            }}
            .body {{
                margin-top: 20px;
                word-wrap: break-word;
            }}
            .body pre {{
                white-space: pre-wrap;
                font-family: inherit;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="subject">{escape_text(email_content['subject'])}</div>
            <div class="header-row">
                <span class="header-label">From:</span> {escape_text(email_content['from'])}
            </div>
            <div class="header-row">
                <span class="header-label">To:</span> {escape_text(email_content['to'])}
            </div>
    """

    if email_content['cc']:
        html_content += f"""
            <div class="header-row">
                <span class="header-label">CC:</span> {escape_text(email_content['cc'])}
            </div>
        """

    if email_content['bcc']:
        html_content += f"""
            <div class="header-row">
                <span class="header-label">BCC:</span> {escape_text(email_content['bcc'])}
            </div>
        """

    html_content += f"""
            <div class="header-row">
                <span class="header-label">Date:</span> {escape_text(email_content['date'])}
            </div>
        </div>
        <div class="body">
    """

    # Add body content
    if email_content['body_type'] == 'html':
        # Clean up HTML content
        body = email_content['body']
        if body:
            # Remove script tags for security
            body = re.sub(r'<script[^>]*>.*?</script>', '', body, flags=re.DOTALL | re.IGNORECASE)
            html_content += body
        else:
            html_content += "<p>No content</p>"
    else:
        # Plain text content
        body = email_content['body']
        if body:
            html_content += f"<pre>{escape_text(body)}</pre>"
        else:
            html_content += "<p>No content</p>"

    html_content += """
        </div>
    </body>
    </html>
    """

    return html_content


def convert_to_pdf(html_content, output_path):
    """Convert HTML content to PDF using weasyprint."""
    try:
        from weasyprint import HTML, CSS
        from weasyprint.text.fonts import FontConfiguration

        # Create PDF from HTML
        font_config = FontConfiguration()
        html_doc = HTML(string=html_content)

        # Custom CSS for better PDF formatting
        css = CSS(string='''
            @page {
                margin: 1in;
                size: letter;
            }
            body {
                font-size: 12pt;
            }
        ''', font_config=font_config)

        html_doc.write_pdf(output_path, stylesheets=[css], font_config=font_config)
        return True

    except ImportError:
        print("Error: weasyprint is required for PDF generation.")
        print("Install it with: pip install weasyprint")
        return False
    except Exception as e:
        print(f"Error converting to PDF: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Convert EML email files to PDF format',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  %(prog)s email.eml                    # Convert to email.pdf
  %(prog)s email.eml -o output.pdf      # Convert to output.pdf
  %(prog)s *.eml                        # Convert all EML files in directory
        '''
    )

    parser.add_argument('input_files', nargs='+', help='EML file(s) to convert')
    parser.add_argument('-o', '--output', help='Output PDF file (for single input file)')
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')

    args = parser.parse_args()

    # Check if multiple files but single output specified
    if len(args.input_files) > 1 and args.output:
        print("Error: Cannot specify single output file for multiple input files")
        sys.exit(1)

    success_count = 0
    total_count = len(args.input_files)

    for input_file in args.input_files:
        input_path = Path(input_file)

        # Check if input file exists
        if not input_path.exists():
            print(f"Error: File '{input_file}' not found")
            continue

        # Check if input file is EML
        if input_path.suffix.lower() != '.eml':
            print(f"Warning: '{input_file}' doesn't have .eml extension")

        # Determine output file name
        if args.output:
            output_path = Path(args.output)
        else:
            output_path = input_path.with_suffix('.pdf')

        if args.verbose:
            print(f"Converting '{input_file}' to '{output_path}'...")

        # Parse EML file
        msg = parse_eml_file(input_path)
        if not msg:
            continue

        # Extract email content
        email_content = extract_email_content(msg)

        # Create HTML for PDF conversion
        html_content = create_html_for_pdf(email_content)

        # Convert to PDF
        if convert_to_pdf(html_content, output_path):
            if args.verbose:
                print(f"Successfully converted '{input_file}' to '{output_path}'")
            success_count += 1
        else:
            print(f"Failed to convert '{input_file}'")

    print(f"Converted {success_count}/{total_count} files successfully")

    if success_count == 0:
        sys.exit(1)


if __name__ == '__main__':
    main()