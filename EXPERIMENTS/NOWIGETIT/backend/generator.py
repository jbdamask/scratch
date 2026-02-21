import base64
import os
import re

import anthropic

SYSTEM_PROMPT = (
    "make a really freaking cool-looking interactive single-page website "
    "that demonstrates the contents of this paper to a layperson"
)


def generate_html(pdf_bytes: bytes) -> str:
    """Send PDF directly to Claude Opus 4.6 and get back a single-page HTML app."""
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    pdf_b64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=16000,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "base64",
                            "media_type": "application/pdf",
                            "data": pdf_b64,
                        },
                    },
                ],
            }
        ],
    )

    response_text = message.content[0].text

    # Extract HTML from the response (Claude may wrap it in ```html blocks)
    html_match = re.search(r"```html\s*([\s\S]*?)```", response_text)
    if html_match:
        return html_match.group(1).strip()

    # If response looks like raw HTML, use it directly
    if "<html" in response_text.lower() or "<!doctype" in response_text.lower():
        return response_text.strip()

    raise ValueError("Claude did not return valid HTML.")
