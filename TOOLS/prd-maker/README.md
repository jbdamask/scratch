# PRD Maker

A modern, AI-powered Product Requirements Document (PRD) creation tool built with React, TypeScript, and Claude AI.

## Features

- **Two-Panel Layout**: Chat interface with Claude AI and real-time PRD editing/preview
- **AI-Powered Assistance**: Leverage Claude 4 Sonnet to help create comprehensive PRDs
- **Real-time Preview**: Instant markdown rendering with support for Mermaid diagrams
- **Interactive Diagrams**: Expandable diagrams with zoom and pan functionality
- **Resizable Panels**: Customizable workspace with drag-to-resize panels
- **Export Functionality**: Save your PRD as a markdown document
- **Dark Mode**: Modern, eye-friendly dark theme optimized for long work sessions
- **SQLite Integration**: Local data persistence for your PRDs

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with Catalyst UI components
- **Build Tool**: Vite
- **AI Integration**: Claude API via Anthropic SDK
- **Markdown**: React Markdown with GitHub Flavored Markdown support
- **Diagrams**: Mermaid.js with modal zoom functionality
- **Database**: SQLite3 with better-sqlite3
- **UI Components**: Headless UI, Heroicons

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Claude API key from Anthropic

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd prd-maker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Claude API key:
   ```
   VITE_CLAUDE_API_KEY=your_claude_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Chat Interface**: Use the left panel to communicate with Claude AI about your PRD requirements
2. **Real-time Editing**: Switch between Preview and Edit tabs in the right panel
3. **Diagram Support**: Add Mermaid diagrams using code blocks with `mermaid` language identifier
4. **Export**: Use the Export button to download your PRD as a markdown file
5. **Resize Panels**: Drag the handle between panels to adjust the workspace layout

## Project Structure

```
src/
├── components/          # React components
│   ├── ChatPanel.tsx   # AI chat interface
│   ├── PRDPanel.tsx    # Main PRD panel with tabs
│   ├── PreviewTab.tsx  # Markdown preview with diagram support
│   ├── EditTab.tsx     # Markdown editor
│   └── DiagramModal.tsx # Modal for expanded diagram view
├── hooks/              # Custom React hooks
├── services/           # API and database services
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── App.tsx            # Main application component
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.