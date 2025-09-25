# JSONL Eval Maker

A simple, browser-based tool for creating evaluation datasets in JSONL format. Perfect for machine learning practitioners who need to quickly label data for model evaluation, fine-tuning, or classification tasks.

## What It Does

JSONL Eval Maker helps you transform raw text data into labeled evaluation datasets. You can:

- **Import data** from text files, CSV files, or by pasting directly
- **Create custom labels** for your classification tasks
- **Add custom columns** to capture additional metadata or annotations
- **Label data efficiently** with a streamlined click-to-label interface
- **Edit any cell content** with right-click editing
- **Export clean JSONL files** ready for use with ML frameworks

## Why It's Useful

Creating evaluation datasets is a common but tedious task in machine learning. This tool eliminates the friction by providing:

- **No setup required** - runs entirely in your browser
- **Intuitive interface** - just click rows to apply labels
- **Flexible input** - supports various file formats and multi-column CSV files
- **Smart export options** - choose to export only labeled data or include partial work
- **Standard format** - outputs JSONL that works with popular ML tools

## How to Use

1. **Open** `jsonl-eval-maker.html` in your browser
2. **Load your data** by:
   - Pasting text (one record per line)
   - Uploading a text file
   - Uploading a CSV/TSV file (choose which column to label)
3. **Create labels** using the input box and "Add" button
4. **Select an active label** from the dropdown
5. **Click rows** to instantly apply the label
6. **Customize your dataset**:
   - Add extra columns using the "+" button
   - Right-click any cell to edit its content
   - Drag column borders to resize for better visibility
   - Delete unwanted rows using the × button
7. **Export** your labeled dataset as JSONL

## Features

### Data Management
- **Multi-format input**: Text files, CSV files with header detection
- **Column selection**: For multi-column CSV files, choose which column to label
- **Custom columns**: Add unlimited additional columns for extra metadata or annotations
- **Row management**: Delete individual rows with confirmation
- **Resizable columns**: Drag column borders to adjust widths for optimal viewing

### Editing & Labeling
- **Custom column names**: Rename any column header with inline editing
- **Cell-level editing**: Right-click any cell to edit its content directly
- **Keyboard shortcuts**: Enter to save, Escape to cancel when editing
- **Visual feedback**: Color-coded rows show labeling progress
- **Bulk operations**: "Label All Unlabeled" for efficient workflow

### Export & Compatibility
- **OpenAI compatibility**: Optional Item Schema format for OpenAI fine-tuning
- **Smart export**: Options for partial or complete datasets
- **Custom column export**: All additional columns included in JSONL output
- **No data loss**: All work is preserved until export

## Technical Details

Built as a single HTML file with vanilla JavaScript - no dependencies or build process required. The app runs entirely client-side, so your data never leaves your browser.

**Export formats:**

Standard format:
```json
{"input": "your text data", "ideal": "your_label"}
{"input": "more text data", "ideal": "another_label"}
```

With additional columns:
```json
{"input": "your text data", "ideal": "your_label", "comment": "reasoning", "confidence": "high"}
{"input": "more text data", "ideal": "another_label", "comment": "uncertain", "confidence": "medium"}
```

OpenAI Item Schema format (for fine-tuning):
```json
{"item": {"input": "your text data", "ideal": "your_label", "comment": "reasoning"}}
{"item": {"input": "more text data", "ideal": "another_label", "comment": "uncertain"}}
```

## Use Cases

- **Text classification** datasets for sentiment analysis, topic classification, etc.
- **Evaluation sets** for testing model performance
- **Fine-tuning data** for language models
- **Research datasets** for academic or commercial ML projects
- **Data annotation** for any text-based machine learning task

## Getting Started

Simply download the `jsonl-eval-maker.html` file and open it in any modern web browser. No installation, no server setup, no dependencies - just start labeling your data!