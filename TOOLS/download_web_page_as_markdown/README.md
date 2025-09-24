# Web Page to Markdown Converter

A simple Python script that downloads web pages and converts them to markdown format.

## Features

- Downloads web pages from URLs
- Converts HTML content to clean markdown
- Saves files with domain-based naming
- Handles multiple URLs in a single run
- Preserves links and images in markdown

## Requirements

```bash
pip install requests html2text
```

## Usage

Basic usage:
```bash
./download_web_page_as_markdown.py https://example.com
```

Multiple URLs:
```bash
./download_web_page_as_markdown.py https://example.com https://github.com https://stackoverflow.com
```

Custom output directory:
```bash
./download_web_page_as_markdown.py -o my_pages https://example.com
```

## Output

Files are saved as `{domain}_{random_number}.md` in the output directory (default: `output/`).

Example: `example.com_42.md`