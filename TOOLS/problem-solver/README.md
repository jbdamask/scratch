# McKinsey Problem Solver

A sophisticated problem-solving tool that combines AI-powered McKinsey-style consulting with interactive Mermaid diagram generation. This application guides users through structured problem-solving methodologies while providing real-time visual frameworks.

![Problem Solver Interface](https://via.placeholder.com/800x400/2563eb/ffffff?text=Chat+|+Mermaid+Editor+|+Diagram+Viewer)

## Features

- **Expert McKinsey Guidance**: AI assistant trained on "Bulletproof Problem Solving" principles
- **Interactive Diagrams**: Support for Issue Trees, Decision Trees, 2x2 Matrices, and Hypothesis Trees
- **Project-Based Organization**: Manage multiple projects with dedicated sessions and diagram catalogs
- **Real-time Collaboration**: Three-panel layout with chat, code editor, and diagram viewer
- **Advanced Visualization**: Zoom, pan, and drag functionality for diagrams
- **Professional Document Export**: AI-generated executive summaries with recommendations
- **Diagram Catalog**: Automatic storage and organization of all diagrams by project
- **Persistent Storage**: SQLite database with localStorage fallback
- **Resizable Interface**: Customizable panel layouts

## Problem-Solving Frameworks

### Issue Trees / Logic Trees
Break down complex problems into mutually exclusive, collectively exhaustive (MECE) components.

### Decision Trees
Analyze decisions with uncertainty, probabilities, and expected values.

### 2x2 Matrices
Prioritize and compare options across two dimensions (e.g., Impact vs. Effort).

### Hypothesis Trees
Structure and test assumptions with evidence-based validation.

## Setup

### Prerequisites

- Node.js (v20.17+ recommended)
- Anthropic API key (Claude 4)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```bash
   VITE_ANTHROPIC_API_KEY=your_claude_api_key_here
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:5173`

## Usage

### Getting Started

1. **Describe Your Problem**: Start by clearly articulating your specific challenge
2. **Follow the Guidance**: The AI will ask probing questions to understand your situation
3. **Generate Diagrams**: The assistant will suggest appropriate visual frameworks
4. **Iterate and Refine**: Edit diagram code and visualize different approaches
5. **Export Results**: Save your diagrams and insights

### Interface Layout

- **Header**: Project selector, session management, and export controls
- **Left Panel (Chat)**: Interactive conversation with the McKinsey-trained assistant
- **Middle Panel (Editor)**: Mermaid code editor with syntax highlighting
- **Right Panel (Viewer)**: Live diagram rendering with zoom/pan controls

### Project Management

1. **Create Projects**: Organize your problem-solving work into distinct projects
2. **Multiple Sessions**: Have separate conversation threads within each project
3. **Diagram Catalog**: All generated diagrams are automatically cataloged by project
4. **Export Reports**: Generate comprehensive markdown reports with executive summaries

### Professional Document Export

The **Export Report** feature generates comprehensive business documents including:

- **Executive Summary**: High-level overview for senior leadership
- **Overview**: Detailed background and context
- **Key Findings**: Critical insights discovered during analysis
- **Considerations**: Important factors to consider
- **Strategic Options**: Multiple approaches with pros/cons analysis
- **Recommendations**: Prioritized action items with next steps
- **Supporting Diagrams**: All project diagrams with descriptions

### Keyboard Shortcuts

- **Ctrl/Cmd + Enter**: Send message in chat
- **Ctrl/Cmd + S**: Copy Mermaid code  
- **Ctrl/Cmd + D**: Download diagram as image

## Architecture

### Core Components

- `McKinseyBot`: AI assistant with structured problem-solving logic
- `DiagramClasses`: Modular diagram generators (Issue Tree, Decision Tree, etc.)
- `ChatDatabase`: SQLite storage for conversation persistence
- `MermaidRenderer`: Advanced diagram visualization with pan/zoom

### Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + Shadcn/ui
- **AI Integration**: Anthropic Claude 4
- **Diagram Engine**: Mermaid.js
- **Database**: Better-SQLite3
- **Layout**: React Resizable Panels

## Development

### Build for Production

```bash
npm run build
```

### Run Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run build # Includes type checking
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Based on "Bulletproof Problem Solving" by Charles Conn and Robert McLean
- Powered by Anthropic's Claude 4
- Built with modern React and TypeScript
