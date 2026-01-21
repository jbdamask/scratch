"""Image processing utilities for handling base64 and URL-based images."""

import base64
import re

import httpx

SUPPORTED_MIME_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


def decode_base64_image(data_url: str) -> bytes:
    """Decode a base64 data URL to raw image bytes.

    Args:
        data_url: A data URL in format data:image/<type>;base64,<data>

    Returns:
        Raw image bytes

    Raises:
        ValueError: If the data URL format is invalid or mime type is unsupported
    """
    pattern = r"^data:(image/(?:jpeg|png|gif|webp));base64,(.+)$"
    match = re.match(pattern, data_url)

    if not match:
        raise ValueError(
            "Invalid data URL format. Expected: data:image/<type>;base64,<data> "
            f"where type is one of: {', '.join(sorted(SUPPORTED_MIME_TYPES))}"
        )

    mime_type = match.group(1)
    base64_data = match.group(2)

    if mime_type not in SUPPORTED_MIME_TYPES:
        raise ValueError(
            f"Unsupported mime type: {mime_type}. "
            f"Supported types: {', '.join(sorted(SUPPORTED_MIME_TYPES))}"
        )

    try:
        return base64.b64decode(base64_data)
    except Exception as e:
        raise ValueError(f"Failed to decode base64 data: {e}") from e


async def fetch_image_from_url(url: str) -> bytes:
    """Fetch an image from a URL and return raw bytes.

    Args:
        url: The URL to fetch the image from

    Returns:
        Raw image bytes

    Raises:
        Exception: If the fetch fails (404, timeout, network error, etc.)
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            return response.content
        except httpx.TimeoutException as e:
            raise Exception(f"Timeout fetching image from URL: {url}") from e
        except httpx.HTTPStatusError as e:
            raise Exception(
                f"HTTP error {e.response.status_code} fetching image from URL: {url}"
            ) from e
        except httpx.RequestError as e:
            raise Exception(f"Failed to fetch image from URL: {url} - {e}") from e
