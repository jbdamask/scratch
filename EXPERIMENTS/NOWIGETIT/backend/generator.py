import os
import re

import anthropic

SYSTEM_PROMPT = (
    "make a really freaking cool-looking interactive single-page website "
    "that demonstrates the contents of this paper to a layperson"
)


def generate_html(pdf_url: str) -> str:
    """Send a PDF URL to Claude Opus 4.6 and get back a single-page HTML app."""
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    response_text = ""
    stop_reason = None

    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=64000,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "url",
                            "url": pdf_url,
                        },
                    },
                ],
            }
        ],
    ) as stream:
        for text in stream.text_stream:
            response_text += text
        stop_reason = stream.get_final_message().stop_reason

    if stop_reason == "max_tokens":
        raise ValueError("Claude response was truncated (hit token limit).")

    # Extract HTML from the response (Claude may wrap it in ```html blocks)
    html_match = re.search(r"```html\s*([\s\S]*?)```", response_text)
    if html_match:
        return html_match.group(1).strip()

    # Handle truncated code block (opening ```html but no closing ```)
    html_match = re.search(r"```html\s*([\s\S]*)", response_text)
    if html_match:
        return html_match.group(1).strip()

    # If response looks like raw HTML, use it directly
    if "<html" in response_text.lower() or "<!doctype" in response_text.lower():
        return response_text.strip()

    raise ValueError("Claude did not return valid HTML.")
