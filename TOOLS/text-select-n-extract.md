# Text Select & Extract

A simple single-page web app for extracting text snippets from documents.

## What it does

Upload a text file, markdown file, or PDF and extract specific text selections to save for later. Select any text in the document viewer and press the spacebar to add it to your extraction list. Export all your selections as a plain text file when done.

## How to use

1. Open `text-select-n-extract.html` in a web browser
2. Click "Choose File" to upload a .txt, .md, or .pdf file
3. Select text in the left panel (document viewer)
4. Press spacebar to extract the selected text to the right panel
5. Click the X button to remove unwanted selections
6. Click "Export Selected Text" to download your extractions as a .txt file

## Design

The app uses a two-panel layout with a resizable splitter. The left panel shows your document, the right panel collects your text selections. The splitter between panels can be dragged to adjust panel sizes.

File reading is handled client-side using the File API for text files, Marked.js for markdown rendering, and PDF.js for PDF parsing. No server required.

## Supported file types

- Plain text files (.txt)
- Markdown files (.md) - rendered with formatting
- PDF files (.pdf) - text content extracted

## Browser compatibility

Works in modern browsers that support the File API, HTML5, and ES6 features. Requires JavaScript enabled.