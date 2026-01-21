"""Ollama client for vision-language model inference."""

import base64

import httpx

OLLAMA_BASE_URL = "http://localhost:11434"
MODEL_NAME = "llava"


async def generate_completion(
    messages: list, images: list[bytes] | None = None
) -> dict:
    """Generate a completion using Ollama's vision model.

    Args:
        messages: List of message dicts with 'role' and 'content' keys
        images: Optional list of raw image bytes to include with the request

    Returns:
        Dict with 'content' (response text), 'prompt_eval_count', 'eval_count'

    Raises:
        httpx.ConnectError: If Ollama is not running
    """
    # Format messages for Ollama API
    ollama_messages = []
    for msg in messages:
        ollama_msg = {"role": msg["role"], "content": msg["content"]}
        ollama_messages.append(ollama_msg)

    # If images are provided, add them to the last user message as base64
    if images and ollama_messages:
        # Find the last user message to attach images
        for i in range(len(ollama_messages) - 1, -1, -1):
            if ollama_messages[i]["role"] == "user":
                ollama_messages[i]["images"] = [
                    base64.b64encode(img).decode("utf-8") for img in images
                ]
                break

    payload = {
        "model": MODEL_NAME,
        "messages": ollama_messages,
        "stream": False,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json=payload,
        )
        response.raise_for_status()
        data = response.json()

        return {
            "content": data.get("message", {}).get("content", ""),
            "prompt_eval_count": data.get("prompt_eval_count", 0),
            "eval_count": data.get("eval_count", 0),
        }
