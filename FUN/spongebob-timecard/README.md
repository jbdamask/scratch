# SpongeBob Time Cards Generator

A web app that lets you create authentic SpongeBob SquarePants-style time cards with custom text overlaid on classic backgrounds from the show.

## Features

- Choose from multiple SpongeBob background images
- Add custom text that appears in real-time
- Uses the authentic "Some Time Later" font from the series
- Advanced text styling options (size, color, outline)
- Download your time cards as PNG images
- Responsive design that works on mobile and desktop

## Setup

### 1. Font Installation (Required)

This app uses the authentic "Some Time Later" font from SpongeBob SquarePants. You must install this font locally for it to work properly.

1. Download the font from: https://github.com/ctrlcctrlv/some-time-later
2. Install the `SomeTimeLater.otf` file to your system:
   - **macOS**: Copy to `~/Library/Fonts/` or double-click to install
   - **Windows**: Right-click the font file and select "Install"
   - **Linux**: Copy to `~/.fonts/` or `/usr/share/fonts/`

### 2. Running the App

Since the app loads local images, it must be served from a web server (not opened directly as a file).

#### Easy Start
```bash
./start.sh
```

The start script will:
- Automatically find an available port (8000-8010)
- Start a local web server
- Show you the URL to open in your browser


## Requirements

- Python (2.7+ or 3.x) for the web server
- "Some Time Later" font installed locally
- Modern web browser with HTML5 Canvas support

## Troubleshooting

**Font not displaying correctly:**
- Make sure you've installed the "Some Time Later" font to your system

**Images not loading:**
- Make sure you're accessing via `http://localhost` and not opening the html file directly
- Use the provided `start.sh` script to ensure proper server setup

**Download not working:**
- This is usually due to opening the file directly instead of through a web server
- Use `./start.sh` to serve the app properly

## Credits

- "Some Time Later" font by [ctrlcctrlv](https://github.com/ctrlcctrlv/some-time-later)
- SpongeBob SquarePants backgrounds from the show
- Built with Claude Code