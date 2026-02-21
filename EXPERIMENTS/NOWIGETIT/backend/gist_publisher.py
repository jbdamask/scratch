import os
from pathlib import Path

import requests

GIST_API_URL = "https://api.github.com/gists"
PREVIEW_BASE = "https://gistpreview.github.io/?"


def create_gist(html_content: str, original_filename: str) -> str:
    """Create a public GitHub Gist and return the gistpreview URL."""
    token = os.environ["GITHUB_TOKEN"]
    stem = Path(original_filename).stem
    gist_filename = f"{stem}.html"

    response = requests.post(
        GIST_API_URL,
        headers={
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github+json",
        },
        json={
            "description": f"NowIGetIt: {original_filename}",
            "public": True,
            "files": {
                gist_filename: {
                    "content": html_content,
                }
            },
        },
        timeout=30,
    )
    response.raise_for_status()

    gist_id = response.json()["id"]
    return f"{PREVIEW_BASE}{gist_id}"
