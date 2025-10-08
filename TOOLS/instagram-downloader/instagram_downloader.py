#!/usr/bin/env python3
"""
Instagram Video Downloader
Simple Python application to download videos from Instagram URLs using yt-dlp
"""

import sys
import os
import argparse
from pathlib import Path
from datetime import datetime
import time
import yt_dlp
import cv2
import glob


class InstagramDownloader:
    def __init__(self, base_output_dir="downloads", extract_frames=False):
        # Always use "downloads" as the base directory
        self.base_output_dir = Path("downloads")
        self.base_output_dir.mkdir(exist_ok=True)
        self.extract_frames = extract_frames

        # Create date-stamped directory (YYYY-MM-DD format)
        today = datetime.now().strftime("%Y-%m-%d")
        self.date_dir = self.base_output_dir / today
        self.date_dir.mkdir(exist_ok=True)

        # Create timestamp subdirectory (Unix timestamp for sorting)
        timestamp = str(int(time.time()))
        self.timestamp_dir = self.date_dir / timestamp
        self.timestamp_dir.mkdir(exist_ok=True)

        # Frames will go in a subdirectory within the timestamp folder
        self.frames_dir = self.timestamp_dir / "frames"
        if self.extract_frames:
            self.frames_dir.mkdir(exist_ok=True)

        self.ydl_opts = {
            'outtmpl': str(self.timestamp_dir / '%(uploader)s_%(title)s_%(id)s.%(ext)s'),
            'format': 'best[ext=mp4]/best',
            'writeinfojson': False,
            'writethumbnail': False,
            'quiet': False,
        }

    def extract_frames_from_video(self, video_path, video_id):
        """Extract one frame per second from video"""
        try:
            cap = cv2.VideoCapture(str(video_path))
            fps = cap.get(cv2.CAP_PROP_FPS)

            if fps <= 0:
                print(f"Warning: Could not determine FPS for {video_path}")
                return False

            # Create subdirectory for this video's frames within the frames folder
            video_frames_dir = self.frames_dir / video_id
            video_frames_dir.mkdir(exist_ok=True)

            frame_number = 0
            second = 0

            print(f"Extracting frames (1 per second) from {video_path.name}...")

            while True:
                # Jump to the frame at the current second
                cap.set(cv2.CAP_PROP_POS_FRAMES, int(second * fps))
                ret, frame = cap.read()

                if not ret:
                    break

                # Save frame
                frame_filename = video_frames_dir / f"frame_{second:04d}.jpg"
                cv2.imwrite(str(frame_filename), frame)

                second += 1

            cap.release()
            print(f"✓ Extracted {second} frames to {video_frames_dir}")
            return True

        except Exception as e:
            print(f"✗ Error extracting frames from {video_path}: {str(e)}")
            return False

    def download_video(self, url):
        """Download a single video from Instagram URL"""
        try:
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                print(f"Downloading from: {url}")

                # Get video info to extract ID
                info = ydl.extract_info(url, download=False)
                video_id = info.get('id', 'unknown')

                # Download the video
                ydl.download([url])
                print(f"✓ Successfully downloaded video from {url}")

                # Extract frames if requested
                if self.extract_frames:
                    # Find the downloaded video file
                    pattern = str(self.timestamp_dir / f"*{video_id}*.mp4")
                    video_files = glob.glob(pattern)

                    if video_files:
                        video_path = Path(video_files[0])
                        self.extract_frames_from_video(video_path, video_id)
                    else:
                        print(f"Warning: Could not find downloaded video file for frame extraction")

                return True
        except Exception as e:
            print(f"✗ Error downloading {url}: {str(e)}")
            return False

    def download_videos(self, urls):
        """Download multiple videos from a list of URLs"""
        successful = 0
        failed = 0

        for url in urls:
            if self.download_video(url):
                successful += 1
            else:
                failed += 1

        print(f"\nDownload Summary:")
        print(f"Successful: {successful}")
        print(f"Failed: {failed}")
        print(f"Total: {len(urls)}")

        return successful, failed


def main():
    parser = argparse.ArgumentParser(
        description="Download videos from Instagram URLs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python instagram_downloader.py https://www.instagram.com/p/ABC123/
  python instagram_downloader.py -f https://www.instagram.com/p/ABC123/
  python instagram_downloader.py url1 url2 url3

Note: Videos are saved to downloads/YYYY-MM-DD/timestamp/ with frames in downloads/YYYY-MM-DD/timestamp/frames/
        """
    )

    parser.add_argument(
        'urls',
        nargs='+',
        help='Instagram URLs to download'
    )

    # Remove the output argument since we always use date-stamped directories

    parser.add_argument(
        '-f', '--extract-frames',
        action='store_true',
        help='Extract one frame per second from downloaded videos'
    )

    args = parser.parse_args()

    # Validate URLs
    valid_urls = []
    for url in args.urls:
        if 'instagram.com' in url:
            valid_urls.append(url)
        else:
            print(f"Warning: Skipping invalid Instagram URL: {url}")

    if not valid_urls:
        print("Error: No valid Instagram URLs provided")
        sys.exit(1)

    # Create downloader and download videos
    downloader = InstagramDownloader(extract_frames=args.extract_frames)

    print(f"Starting download of {len(valid_urls)} video(s)...")
    print(f"Output directory: {downloader.timestamp_dir.absolute()}")
    print("-" * 50)

    successful, failed = downloader.download_videos(valid_urls)

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()