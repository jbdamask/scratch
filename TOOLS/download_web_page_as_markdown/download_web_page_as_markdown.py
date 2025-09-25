#!/usr/bin/env python3
import argparse
import os
import random
import sys
from urllib.parse import urlparse

import requests
import html2text


def extract_root_domain(url):
    parsed = urlparse(url)
    return parsed.netloc.replace('www.', '')


def download_and_convert(url, output_dir):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()

        h = html2text.HTML2Text()
        h.ignore_links = False
        h.ignore_images = False
        markdown_content = h.handle(response.text)

        root_domain = extract_root_domain(url)
        # Replace dots with underscores in the domain name
        root_domain = root_domain.replace('.', '_')
        random_digits = f"{random.randint(10, 99):02d}"
        filename = f"{root_domain}_{random_digits}.md"
        filepath = os.path.join(output_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(markdown_content)

        print(f"Downloaded: {url} -> {filename}")
        return True

    except Exception as e:
        print(f"Error downloading {url}: {e}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(description='Download webpages and convert to markdown')
    parser.add_argument('urls', nargs='+', help='URLs to download')
    parser.add_argument('-o', '--output', default='output', help='Output directory (default: output)')

    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)

    success_count = 0
    for url in args.urls:
        if download_and_convert(url, args.output):
            success_count += 1

    print(f"Successfully downloaded {success_count}/{len(args.urls)} pages")


if __name__ == '__main__':
    main()