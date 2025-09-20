# JSONL Eval Maker

A simple, browser-based tool for creating evaluation datasets in JSONL format. Perfect for machine learning practitioners who need to quickly label data for model evaluation, fine-tuning, or classification tasks.

## What It Does

JSONL Eval Maker helps you transform raw text data into labeled evaluation datasets. You can:

- **Import data** from text files, CSV files, or by pasting directly
- **Create custom labels** for your classification tasks
- **Label data efficiently** with a streamlined click-to-label interface
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
6. **Export** your labeled dataset as JSONL

## Features

- **Multi-format input**: Text files, CSV files with header detection
- **Column selection**: For multi-column CSV files, choose which column to label
- **Custom column names**: Rename the input column for your use case
- **Visual feedback**: Color-coded rows show labeling progress
- **Bulk operations**: "Label All Rows" for consistent labeling
- **Smart export**: Options for partial or complete datasets
- **No data loss**: All work is preserved until export

## Technical Details

Built as a single HTML file with vanilla JavaScript - no dependencies or build process required. The app runs entirely client-side, so your data never leaves your browser.

**Export format:**
```json
{"input": "your text data", "correct_label": "your_label"}
{"input": "more text data", "correct_label": "another_label"}
```

## Use Cases

- **Text classification** datasets for sentiment analysis, topic classification, etc.
- **Evaluation sets** for testing model performance
- **Fine-tuning data** for language models
- **Research datasets** for academic or commercial ML projects
- **Data annotation** for any text-based machine learning task

## Getting Started

Simply download the `jsonl-eval-maker.html` file and open it in any modern web browser. No installation, no server setup, no dependencies - just start labeling your data!