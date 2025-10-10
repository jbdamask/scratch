# Instagram Video To Pix

A web application to download Instagram videos and extract frames from them. Downloads videos without requiring Instagram login or API access and provides a sleek dark-themed interface to browse extracted frames.

## Features

- Download Instagram videos from URLs
- Extract one frame per second from videos (optional)
- Organized directory structure with date and timestamp folders
- Support for multiple video downloads

## Installation

1. Clone or download this repository
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

### Basic Download
```bash
python instagram_downloader.py "https://www.instagram.com/p/ABC123/"
```

### Download with Frame Extraction
```bash
python instagram_downloader.py -f "https://www.instagram.com/p/ABC123/"
```

### Multiple Videos
```bash
python instagram_downloader.py url1 url2 url3
```

### Command Line Options
- `-f, --extract-frames`: Extract one frame per second from downloaded videos
- `-h, --help`: Show help message

## Directory Structure

Downloads are organized as follows:

```
downloads/
└── YYYY-MM-DD/                    # Date folder
    └── timestamp/                 # Unix timestamp (seconds since epoch)
        ├── video.mp4              # Downloaded video
        └── frames/                # Frames folder (if -f used)
            └── video_id/          # Video-specific frames
                ├── frame_0000.jpg # Frame at 0 seconds
                ├── frame_0001.jpg # Frame at 1 second
                └── ...
```

### Example Structure
```
downloads/
└── 2025-10-08/
    ├── 1728401234/
    │   ├── username_title_ABC123.mp4
    │   └── frames/
    │       └── ABC123/
    │           ├── frame_0000.jpg
    │           ├── frame_0001.jpg
    │           └── frame_0002.jpg
    └── 1728401567/
        ├── username_title_DEF456.mp4
        └── frames/
            └── DEF456/
                ├── frame_0000.jpg
                └── frame_0001.jpg
```

## Requirements

- Python 3.7+
- yt-dlp (video downloading)
- opencv-python (frame extraction, only needed if using `-f` option)

## Notes

- Videos are downloaded in MP4 format when available
- Frame extraction creates JPEG images
- Timestamp folders allow chronological sorting (older timestamps = earlier downloads)
- Each download session creates a new timestamp folder to avoid conflicts
