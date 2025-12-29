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

# Model configurations with pricing (per million tokens) and limits
MODEL_CONFIGS = {
    "claude-3-5-haiku-latest": {
        "name": "Claude 3.5 Haiku",
        "input_price": 0.80,
        "output_price": 4.00,
        "max_context": 200000,
        "max_output": 8192,
    },
    "claude-sonnet-4-20250514": {
        "name": "Claude Sonnet 4",
        "input_price": 3.00,
        "output_price": 15.00,
        "max_context": 200000,
        "max_output": 8192,
    },
    "claude-opus-4-5-20250514": {
        "name": "Claude Opus 4.5",
        "input_price": 15.00,
        "output_price": 75.00,
        "max_context": 200000,
        "max_output": 16384,
    },
}
DEFAULT_MODEL = "claude-sonnet-4-20250514"
ESTIMATED_OUTPUT_TOKENS = 4000  # Estimate for 3-6 diagrams with descriptions

# Default exclusions - files that don't help LLM understand code architecture
DEFAULT_EXCLUDE_PATTERNS = {
    # Tests
    "tests/**",
    "test/**",
    "__tests__/**",
    "**/*_test.py",
    "**/*_test.go",
    "**/test_*.py",
    "**/*.test.js",
    "**/*.test.ts",
    "**/*.spec.js",
    "**/*.spec.ts",
    # Documentation and text files
    "docs/**",
    "doc/**",
    "**/*.md",
    "LICENSE*",
    "CHANGELOG*",
    "HISTORY*",
    # Lock files and dependencies
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "Cargo.lock",
    "poetry.lock",
    "Pipfile.lock",
    "composer.lock",
    "Gemfile.lock",
    "go.sum",
    # Build artifacts and generated files
    "dist/**",
    "build/**",
    "out/**",
    "target/**",
    "node_modules/**",
    "__pycache__/**",
    "*.pyc",
    ".next/**",
    ".nuxt/**",
    "vendor/**",
    # IDE and editor files
    ".idea/**",
    ".vscode/**",
    "*.swp",
    "*.swo",
    ".DS_Store",
    # CI/CD (usually not needed for architecture)
    ".github/**",
    ".gitlab-ci.yml",
    ".circleci/**",
    ".travis.yml",
    # Assets and media
    "**/*.png",
    "**/*.jpg",
    "**/*.jpeg",
    "**/*.gif",
    "**/*.ico",
    "**/*.svg",
    "**/*.woff",
    "**/*.woff2",
    "**/*.ttf",
    "**/*.eot",
    "**/*.mp3",
    "**/*.mp4",
    "**/*.webp",
    "**/*.pdf",
    # Minified files
    "**/*.min.js",
    "**/*.min.css",
    # Misc
    ".git/**",
    ".env*",
    "*.log",
}


class EstimateRequest(BaseModel):
    """Request model for cost estimation."""
    repo_url: str
    model: str = DEFAULT_MODEL
    github_token: Optional[str] = None

    @field_validator('repo_url')
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        pattern = r'^https?://github\.com/[\w.-]+/[\w.-]+/?.*$'
        if not re.match(pattern, v):
            raise ValueError('Invalid GitHub repository URL')
        return v.rstrip('/')

    @field_validator('model')
    @classmethod
    def validate_model(cls, v: str) -> str:
        if v not in MODEL_CONFIGS:
            raise ValueError(f'Invalid model. Choose from: {", ".join(MODEL_CONFIGS.keys())}')
        return v


class EstimateResponse(BaseModel):
    """Response model for cost estimation."""
    input_tokens: int
    estimated_output_tokens: int
    input_cost: float
    output_cost: float
    total_cost: float
    file_count: int
    repo_size_kb: float
    model_name: str
    max_context: int
    exceeds_limit: bool
    warning: Optional[str] = None


class RepoRequest(BaseModel):
    """Request model for repository analysis."""
    repo_url: str
    api_key: str
    model: str = DEFAULT_MODEL
    github_token: Optional[str] = None

    @field_validator('repo_url')
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        """Validate that the URL is a valid GitHub repository URL."""
        pattern = r'^https?://github\.com/[\w.-]+/[\w.-]+/?.*$'
        if not re.match(pattern, v):
            raise ValueError('Invalid GitHub repository URL. Expected format: https://github.com/owner/repo')
        return v.rstrip('/')

    @field_validator('model')
    @classmethod
    def validate_model(cls, v: str) -> str:
        if v not in MODEL_CONFIGS:
            raise ValueError(f'Invalid model. Choose from: {", ".join(MODEL_CONFIGS.keys())}')
        return v


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

CLICKABLE LINKS: Add clickable links to diagram elements that link to the source code on GitHub.
The repository base URL is: {repo_url}

Click directive support varies by diagram type:
- FLOWCHARTS: Use `click NodeID "{repo_url}/blob/main/path/to/file.py" _blank` after node definitions
- CLASS DIAGRAMS: Use `click ClassName href "{repo_url}/blob/main/path/to/file.py" _blank`
- SEQUENCE DIAGRAMS: Use `link ActorName: View Code @ {repo_url}/blob/main/path/to/file.py` (creates popup menu on actor)
- ER DIAGRAMS, PIE CHARTS: No click support - do not add click directives
- STATE DIAGRAMS: Limited support - only add if essential

Add line numbers when possible using #L123 suffix (e.g., "{repo_url}/blob/main/src/models.py#L15")
Only add click directives for nodes that correspond to actual files, classes, or functions in the codebase.
Prioritize flowcharts and class diagrams when clickable navigation would be most useful.

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
            "mermaid": "flowchart TD\\n    A[Start] --> B[End]\\n    click A \\"https://github.com/owner/repo/blob/main/file.py#L10\\" _blank"
        }}
    ]
}}

Only output the JSON, no other text or markdown code blocks."""


def truncate_content(content: str, max_tokens: int = 140000) -> str:
    """Truncate content to fit within token limits using accurate token counting."""
    try:
        encoding = tiktoken.get_encoding("cl100k_base")
        tokens = encoding.encode(content)
        if len(tokens) > max_tokens:
            # Truncate tokens and decode back to string
            truncated_tokens = tokens[:max_tokens]
            return encoding.decode(truncated_tokens) + "\n\n[... content truncated for length ...]"
        return content
    except Exception:
        # Fallback: conservative estimate of 2.5 chars per token for code
        max_chars = int(max_tokens * 2.5)
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


@app.get("/api/models")
async def get_models():
    """Get available models with their configurations."""
    models = []
    for model_id, config in MODEL_CONFIGS.items():
        models.append({
            "id": model_id,
            "name": config["name"],
            "input_price": config["input_price"],
            "output_price": config["output_price"],
            "max_context": config["max_context"],
            "max_output": config["max_output"],
        })
    return {"models": models, "default": DEFAULT_MODEL}


@app.post("/api/estimate", response_model=EstimateResponse)
async def estimate_cost(request: EstimateRequest):
    """
    Estimate the cost of analyzing a repository.

    Fetches the repository content and calculates token count and estimated cost.
    """
    # Get model configuration
    model_config = MODEL_CONFIGS[request.model]

    try:
        # Use gitingest to fetch repository content
        summary, tree, content = await asyncio.to_thread(
            ingest,
            request.repo_url,
            token=request.github_token,
            exclude_patterns=DEFAULT_EXCLUDE_PATTERNS
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to fetch repository: {str(e)}"
        )

    # Truncate content if too large
    content = truncate_content(content)
    tree = truncate_content(tree, max_tokens=8000)

    # Build the full prompt to count tokens
    prompt = DIAGRAM_GENERATION_PROMPT.format(
        tree=tree,
        content=content,
        repo_url=request.repo_url
    )

    # Count input tokens
    input_tokens = count_tokens(prompt)

    # Calculate costs using selected model's pricing
    input_cost = (input_tokens / 1_000_000) * model_config["input_price"]
    output_cost = (ESTIMATED_OUTPUT_TOKENS / 1_000_000) * model_config["output_price"]
    total_cost = input_cost + output_cost

    # Get file count and size
    file_count = parse_file_count_from_summary(summary)
    repo_size_kb = len(content.encode('utf-8')) / 1024

    # Check if exceeds model's context limit
    total_tokens = input_tokens + ESTIMATED_OUTPUT_TOKENS
    max_context = model_config["max_context"]
    exceeds_limit = total_tokens > max_context
    warning = None
    if exceeds_limit:
        warning = f"Total tokens ({total_tokens:,}) exceeds {model_config['name']}'s limit ({max_context:,}). Content will be truncated."

    return EstimateResponse(
        input_tokens=input_tokens,
        estimated_output_tokens=ESTIMATED_OUTPUT_TOKENS,
        input_cost=round(input_cost, 4),
        output_cost=round(output_cost, 4),
        total_cost=round(total_cost, 4),
        file_count=file_count,
        repo_size_kb=round(repo_size_kb, 2),
        model_name=model_config["name"],
        max_context=max_context,
        exceeds_limit=exceeds_limit,
        warning=warning
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
            token=request.github_token,
            exclude_patterns=DEFAULT_EXCLUDE_PATTERNS
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to fetch repository: {str(e)}"
        )

    # Truncate content if too large
    content = truncate_content(content)
    tree = truncate_content(tree, max_tokens=8000)

    # Create prompt with repository content
    prompt = DIAGRAM_GENERATION_PROMPT.format(
        tree=tree,
        content=content,
        repo_url=request.repo_url
    )

    try:
        # Get model configuration
        model_config = MODEL_CONFIGS[request.model]

        # Initialize Anthropic client with user-provided API key
        client = anthropic.Anthropic(api_key=request.api_key)

        # Call Claude to analyze and generate diagrams
        message = client.messages.create(
            model=request.model,
            max_tokens=model_config["max_output"],
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
