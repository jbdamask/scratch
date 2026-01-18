---
title: JSONL Viewer
tool_url: /tools/jsonl-viewer
excerpt: A sleek record-by-record viewer for JSONL files with search functionality
permalink: /tools/jsonl-viewer/
---

# JSONL Viewer

A modern, single-page web application for exploring and searching JSONL (JSON Lines) files directly in your browser.

## What is JSONL Viewer?

JSONL Viewer is a lightweight tool for viewing JSONL, NDJSON, and newline-delimited JSON files. It automatically detects the structure of your data and presents each record in a clean, navigable interface. Whether you're debugging API logs, reviewing machine learning datasets, or exploring chat transcripts, this tool makes it easy to browse and search through your data.

## Key Features

### Clean, Minimal Interface
- **Compact Navbar**: File info and actions tucked away in a slim header
- **Expandable Search**: Click the search icon to reveal the search bar when needed
- **Collapsible Results Panel**: Maximize viewing space by collapsing the search results sidebar
- **Full Viewport Height**: Content area fills the screen for maximum data visibility

### File Management
- **Drag & Drop Support**: Drop JSONL files directly into the application
- **File Upload**: Click to browse and select files from your computer
- **Quick File Switching**: Change files instantly via the folder icon

### Data Exploration
- **Record Navigation**: Browse through records one at a time with prev/next buttons
- **Keyboard Shortcuts**: Use arrow keys for quick navigation
- **Nested Field Display**: Automatically flattens nested objects with dot notation (e.g., `message.content`)
- **Type-Aware Formatting**: Color-coded values by type (strings, numbers, booleans, arrays, objects)

### Search Functionality
- **Phrase Search**: Search for exact phrases across all fields
- **Deep Search**: Finds matches in nested objects and arrays
- **Results List**: View all matching records in a clickable sidebar
- **Match Highlighting**: Search terms highlighted in the record display
- **Browse/Results Toggle**: Switch between viewing all records or just search results

## Use Cases

- **API Log Analysis**: Browse through request/response logs to debug issues
- **ML Dataset Review**: Inspect training data records one at a time
- **Chat Transcript Viewing**: Navigate conversation histories stored in JSONL format
- **Data Quality Checks**: Search for specific values or patterns in your data
- **ETL Pipeline Debugging**: Examine intermediate data outputs
- **Event Stream Analysis**: Review event logs and audit trails

## Supported Formats

JSONL Viewer supports files with the following extensions:
- `.jsonl` - JSON Lines
- `.ndjson` - Newline Delimited JSON
- `.json` - Standard JSON (when formatted as newline-delimited records)

## Getting Started

1. Open `jsonl-viewer.html` in any modern web browser
2. Drag a JSONL file into the drop zone or click to browse
3. Use the arrow buttons or keyboard arrows to navigate between records
4. Click the search icon to search for specific content
5. Toggle between "All" and "Results" to filter your view

## Technical Details

- **No Installation Required**: Runs entirely in the browser
- **Client-Side Processing**: All file processing happens locally for privacy
- **Modern Browser Support**: Compatible with Chrome, Firefox, Safari, and Edge
- **Responsive Design**: Adapts to different screen sizes
- **Lightweight**: Single HTML file with embedded CSS and JavaScript

JSONL Viewer is perfect for developers, data scientists, and anyone who works with JSONL files and needs a quick, intuitive way to explore their data without writing code or installing additional software.
