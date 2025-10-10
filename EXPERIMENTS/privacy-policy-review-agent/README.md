# Privacy Policy Review Agent

An automated tool for discovering, analyzing, and risk-scoring vendor privacy policies and terms of service. The agent locates policy documents, extracts their full text, and generates a structured compliance risk report based on a predefined rubric.

## What It Does

Given a company URL or name, this agent will:

1. **Locate** the vendor's Privacy Policy and Terms of Service URLs using web search and page scraping
2. **Extract** the complete text from each policy document
3. **Analyze** the policies against 20 risk criteria (10 for privacy, 10 for terms of service)
4. **Score** each criterion as Low/Medium/High risk with supporting verbatim excerpts
5. **Generate** a markdown report saved to `outputs/YYYYMMDD-companyname-policy-report.md`

The scoring rubric evaluates risk to your company if you were to use the vendor. Each category includes:
- A risk score (Low/Medium/High)
- Verbatim excerpts from the policy
- Reasoning for the score
- A confidence level (High/Medium/Low)

## Design

### Architecture

- **Framework**: OpenAI Agents SDK (formerly Swarm)
- **Model**: GPT-5 (configurable via `default_model` in `single_policy_agent.py`)
- **Agent Pattern**: Single autonomous agent with tool access
- **Execution**: Async Python with configurable turn limits

### Tools

The agent has access to three tools:

1. **`scrape_page(url)`** — Retrieves visible text and links from a web page
2. **`WebSearchTool()`** — Performs web searches to locate policy URLs
3. **`write_markdown(filename, content)`** — Writes the final report to disk

### Tracing

Agent execution traces are logged to `logs/agent_traces.jsonl` via the `FileSpanExporter` class for debugging and audit purposes.

## Installation

### Prerequisites

- Python 3.10 or later
- OpenAI API key with access to GPT-5 (or modify `default_model` to use GPT-4)

### Steps

1. **Clone the repository** (or navigate to the project directory)

2. **Create a virtual environment** (recommended)
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set your OpenAI API key**
   ```bash
   export OPENAI_API_KEY='your-api-key-here'
   ```
   
   Or add it to your shell profile (`.zshrc`, `.bashrc`, etc.) to persist across sessions:
   ```bash
   echo 'export OPENAI_API_KEY="your-api-key-here"' >> ~/.zshrc
   source ~/.zshrc
   ```

## Configuration

### Model Selection

To change the model, edit `single_policy_agent.py`:

```python
default_model = "gpt-5"  # Change to "gpt-4" or another model
```

### Turn Limits

The agent has a maximum number of tool-calling turns to prevent runaway execution:

- Agent configuration: `max_turns=20` (line 27 in `single_policy_agent.py`)
- Runner configuration: `max_turns=15` (line 43 in `single_policy_agent.py`)

Adjust these if you find the agent needs more or fewer turns for your use case.

### Rubric Customization

The evaluation rubric is defined in `prompts/policy_police_single_agent_v2.md`. To modify the risk categories, scoring criteria, or report format, edit this file directly. The agent loads it at runtime via the `load_prompt()` utility.

## Usage

Run the agent from the command line:

```bash
python single_policy_agent.py
```

You'll be prompted to enter a company URL or name:

```
What is the URL of the vendor whose policy you would like to review? otter.ai
```

The agent will:
- Search for and locate the Privacy Policy and Terms of Service
- Scrape the full text of each document
- Analyze them against the rubric
- Write a markdown report to `outputs/YYYYMMDD-companyname-policy-report.md`

### Example Output

A sample report is available at `outputs/20251008-otterai-policy-report.md`.

Each report includes:
- **Executive Summary** — Directional guidance on overall risk level
- **Rubric Explanation** — How to interpret the scores
- **Privacy Policy Analysis** — 10 categories with scores, excerpts, and reasoning
- **Terms of Service Analysis** — 10 categories with scores, excerpts, and reasoning
- **Problems Encountered** — Any issues during URL discovery or scraping

## File Structure

```
.
├── single_policy_agent.py        # Main entry point
├── tools.py                       # Custom tool implementations
├── utils.py                       # Utilities (path helpers, tracing, prompt loader)
├── requirements.txt               # Python dependencies
├── prompts/
│   └── policy_police_single_agent_v2.md  # Agent instructions and rubric
├── outputs/                       # Generated reports (created at runtime)
└── logs/
    └── agent_traces.jsonl         # Execution traces (created at runtime)
```

## Limitations

- **English only** — The agent is instructed to locate and analyze only English-language policies
- **Scraping reliability** — Some sites may block or rate-limit scrapers; CAPTCHA-protected pages cannot be accessed
- **Model context limits** — Very long policies may be truncated depending on the model's context window
- **Scoring subjectivity** — Risk scores are based on the rubric and the model's interpretation; human review is recommended for critical decisions

## License

This project is provided as-is for internal use.
