# Webpage to Markdown Converter

A simple web tool that converts any webpage to markdown format.

## Features

- Load any webpage via URL
- Real-time markdown conversion
- Side-by-side preview (original webpage + markdown)
- Copy to clipboard or save as .md file
- GitHub-compatible markdown formatting

## Usage

1. Open `webpage-as-markdown.html` in your browser
2. Enter a website URL
3. Click "Load" to convert
4. Copy or save the generated markdown

## Technical Notes

- Uses TurndownService for HTML-to-markdown conversion
- Handles CORS via multiple proxy fallbacks
- Removes ads, scripts, and navigation elements
- Preserves code blocks with proper formatting