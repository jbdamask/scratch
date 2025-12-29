"""
GitAid - GitHub Repository Diagram Generator

A FastAPI application that analyzes GitHub repositories using Claude
and generates useful Mermaid diagrams for understanding the codebase.
"""

import os
import re
import json
import asyncio
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel, field_validator
import anthropic
import tiktoken
from gitingest import ingest

app = FastAPI(title="GitAid", description="GitHub Repository Diagram Generator")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Claude Opus 4.5 pricing (per million tokens)
PRICING = {
    "input": 15.00,   # $15 per 1M input tokens
    "output": 75.00,  # $75 per 1M output tokens
}
ESTIMATED_OUTPUT_TOKENS = 4000  # Estimate for 3-6 diagrams with descriptions


class EstimateRequest(BaseModel):
    """Request model for cost estimation."""
    repo_url: str
    github_token: Optional[str] = None

    @field_validator('repo_url')
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        pattern = r'^https?://github\.com/[\w.-]+/[\w.-]+/?.*$'
        if not re.match(pattern, v):
            raise ValueError('Invalid GitHub repository URL')
        return v.rstrip('/')


class EstimateResponse(BaseModel):
    """Response model for cost estimation."""
    input_tokens: int
    estimated_output_tokens: int
    input_cost: float
    output_cost: float
    total_cost: float
    file_count: int
    repo_size_kb: float


class RepoRequest(BaseModel):
    """Request model for repository analysis."""
    repo_url: str
    api_key: str
    github_token: Optional[str] = None

    @field_validator('repo_url')
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        """Validate that the URL is a valid GitHub repository URL."""
        pattern = r'^https?://github\.com/[\w.-]+/[\w.-]+/?.*$'
        if not re.match(pattern, v):
            raise ValueError('Invalid GitHub repository URL. Expected format: https://github.com/owner/repo')
        return v.rstrip('/')


class DiagramResponse(BaseModel):
    """Response model for diagram generation."""
    diagrams: list[dict]
    repo_summary: str


DIAGRAM_GENERATION_PROMPT = """You are an expert software architect analyzing a GitHub repository to generate helpful Mermaid diagrams.

Given the repository content below, analyze the codebase and generate 3-6 Mermaid diagrams that would be most useful for understanding this project.

Consider generating diagrams for:
1. **Architecture Overview** - High-level system/component architecture
2. **Data Flow** - How data moves through the system
3. **Class/Entity Relationships** - Key classes, models, or entities and their relationships
4. **Sequence Diagrams** - Important workflows or processes
5. **Module Dependencies** - How different parts of the code depend on each other
6. **State Diagrams** - State machines or lifecycle flows if relevant
7. **API Flow** - Request/response flows for APIs
8. **Database Schema** - ER diagrams if database models are present

Choose the diagram types that are MOST RELEVANT and USEFUL for this specific codebase. Don't force diagram types that don't fit.

For each diagram:
- Provide a clear, descriptive title
- Write a brief description explaining what the diagram shows and why it's useful
- Generate valid Mermaid syntax
- Keep diagrams focused and readable (not too complex)

IMPORTANT: Use proper Mermaid syntax. For flowcharts use 'flowchart TD' or 'flowchart LR'.
For class diagrams use 'classDiagram'. For sequence diagrams use 'sequenceDiagram'.
Ensure node IDs don't have spaces - use underscores or camelCase.

REPOSITORY CONTENT:
<tree>
{tree}
</tree>

<content>
{content}
</content>

Respond with a JSON object in this exact format:
{{
    "repo_summary": "A 2-3 sentence summary of what this repository does",
    "diagrams": [
        {{
            "title": "Diagram Title",
            "description": "What this diagram shows and why it's useful",
            "type": "flowchart|classDiagram|sequenceDiagram|erDiagram|stateDiagram|pie|gantt",
            "mermaid": "flowchart TD\\n    A[Start] --> B[End]"
        }}
    ]
}}

Only output the JSON, no other text or markdown code blocks."""


def truncate_content(content: str, max_tokens: int = 150000) -> str:
    """Truncate content to fit within token limits (rough estimate: 4 chars per token)."""
    max_chars = max_tokens * 4
    if len(content) > max_chars:
        return content[:max_chars] + "\n\n[... content truncated for length ...]"
    return content


def count_tokens(text: str) -> int:
    """Count tokens using tiktoken (cl100k_base encoding, used by Claude)."""
    try:
        encoding = tiktoken.get_encoding("cl100k_base")
        return len(encoding.encode(text))
    except Exception:
        # Fallback: rough estimate of 4 chars per token
        return len(text) // 4


def parse_file_count_from_summary(summary: str) -> int:
    """Extract file count from gitingest summary."""
    # Summary format is "Files analyzed: 37"
    match = re.search(r'Files analyzed:\s*(\d+)', summary, re.IGNORECASE)
    return int(match.group(1)) if match else 0


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main HTML page."""
    return FileResponse("static/index.html")


@app.post("/api/estimate", response_model=EstimateResponse)
async def estimate_cost(request: EstimateRequest):
    """
    Estimate the cost of analyzing a repository.

    Fetches the repository content and calculates token count and estimated cost.
    """
    try:
        # Use gitingest to fetch repository content
        summary, tree, content = await asyncio.to_thread(
            ingest,
            request.repo_url,
            token=request.github_token
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to fetch repository: {str(e)}"
        )

    # Truncate content if too large
    content = truncate_content(content)
    tree = truncate_content(tree, max_tokens=10000)

    # Build the full prompt to count tokens
    prompt = DIAGRAM_GENERATION_PROMPT.format(
        tree=tree,
        content=content
    )

    # Count input tokens
    input_tokens = count_tokens(prompt)

    # Calculate costs
    input_cost = (input_tokens / 1_000_000) * PRICING["input"]
    output_cost = (ESTIMATED_OUTPUT_TOKENS / 1_000_000) * PRICING["output"]
    total_cost = input_cost + output_cost

    # Get file count and size
    file_count = parse_file_count_from_summary(summary)
    repo_size_kb = len(content.encode('utf-8')) / 1024

    return EstimateResponse(
        input_tokens=input_tokens,
        estimated_output_tokens=ESTIMATED_OUTPUT_TOKENS,
        input_cost=round(input_cost, 4),
        output_cost=round(output_cost, 4),
        total_cost=round(total_cost, 4),
        file_count=file_count,
        repo_size_kb=round(repo_size_kb, 2)
    )


@app.post("/api/analyze", response_model=DiagramResponse)
async def analyze_repository(request: RepoRequest):
    """
    Analyze a GitHub repository and generate Mermaid diagrams.

    This endpoint:
    1. Uses gitingest to fetch and parse the repository
    2. Sends the content to Claude for analysis
    3. Returns generated Mermaid diagrams
    """
    try:
        # Use gitingest to fetch repository content
        # Run in thread pool to avoid asyncio.run() conflict with FastAPI's event loop
        summary, tree, content = await asyncio.to_thread(
            ingest,
            request.repo_url,
            token=request.github_token
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to fetch repository: {str(e)}"
        )

    # Truncate content if too large
    content = truncate_content(content)
    tree = truncate_content(tree, max_tokens=10000)

    # Create prompt with repository content
    prompt = DIAGRAM_GENERATION_PROMPT.format(
        tree=tree,
        content=content
    )

    try:
        # Initialize Anthropic client with user-provided API key
        client = anthropic.Anthropic(api_key=request.api_key)

        # Call Claude to analyze and generate diagrams
        message = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=8192,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        # Parse the response
        response_text = message.content[0].text

        # Try to parse as JSON
        try:
            result = json.loads(response_text)
        except json.JSONDecodeError:
            # Try to extract JSON from the response
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                result = json.loads(json_match.group())
            else:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to parse Claude's response as JSON"
                )

        return DiagramResponse(
            diagrams=result.get("diagrams", []),
            repo_summary=result.get("repo_summary", "")
        )

    except anthropic.APIError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Anthropic API error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating diagrams: {str(e)}"
        )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
