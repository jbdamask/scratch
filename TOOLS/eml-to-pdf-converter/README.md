# EML to PDF Converter

A command line tool to convert .eml email files to PDF format.

## Features

- Convert single or multiple .eml files to PDF
- Preserves email headers (From, To, Subject, Date, CC, BCC)
- Handles both plain text and HTML email content
- Removes JavaScript from HTML content for security
- Clean, readable PDF output with proper formatting

## Installation

1. Clone or download this project
2. Navigate to the project directory
3. Create and activate a virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

### Basic Usage

Convert a single EML file:
```bash
python eml_to_pdf.py email.eml
```
This creates `email.pdf` in the same directory.

### Specify Output File

```bash
python eml_to_pdf.py email.eml -o output.pdf
```

### Convert Multiple Files

```bash
python eml_to_pdf.py *.eml
```
This converts all .eml files in the current directory to corresponding .pdf files.

### Verbose Output

```bash
python eml_to_pdf.py email.eml -v
```

### Command Line Options

- `input_files`: One or more .eml files to convert
- `-o, --output`: Output PDF file (only for single input file)
- `-v, --verbose`: Show detailed output during conversion
- `-h, --help`: Show help message

## Requirements

- Python 3.6+
- weasyprint (for PDF generation)

## Dependencies

The tool uses these Python libraries:
- `email` (built-in): For parsing .eml files
- `weasyprint`: For HTML to PDF conversion
- `argparse` (built-in): For command line argument parsing
- `pathlib` (built-in): For file path handling

## Output Format

The generated PDF includes:
- Email subject as a prominent header
- From, To, Date fields
- CC and BCC fields (if present)
- Email body content with preserved formatting

## Limitations

- Attachments are not included in the PDF
- Complex HTML layouts may not render perfectly
- Very large emails may take longer to process

## Examples

```bash
# Convert single file
python eml_to_pdf.py important_email.eml

# Convert with custom output name
python eml_to_pdf.py meeting_notes.eml -o meeting_2024.pdf

# Convert all EML files in directory
python eml_to_pdf.py *.eml

# Verbose conversion
python eml_to_pdf.py email.eml -v
```

## Troubleshooting

If you encounter issues with weasyprint installation, you may need to install system dependencies:

**macOS:**
```bash
brew install cairo pango gdk-pixbuf libffi
```

**Ubuntu/Debian:**
```bash
sudo apt-get install build-essential python3-dev python3-pip python3-setuptools python3-wheel python3-cffi libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info
```