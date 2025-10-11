# John's Web App Themes

A collection of reusable theme packages for consistent styling across web applications.

## Available Themes

### 🌙 [`webapp-dark`](./webapp-dark/)

Dark terminal-aesthetic theme with monospace fonts and green accents.

- **Style**: Dark background, blue-gray tones, green highlights
- **Font**: JetBrains Mono stack
- **Best for**: Technical tools, dashboards, developer apps

[View Documentation →](./webapp-dark/README.md)

## Quick Start

### Option 1: Local Installation

```bash
# From any new project directory
npm install file:../THEMES/webapp-dark
```

### Option 2: Git Installation

```bash
# Install directly from git
npm install git+https://github.com/jbdamask/scratch.git#subdirectory=THEMES/webapp-dark
```

## Usage Pattern

1. **Install theme package**
2. **Add preset to Tailwind config**
3. **Import base styles**
4. **Use components and classes**

```javascript
// tailwind.config.js
const webappDark = require('@johnthemes/webapp-dark/tailwind.preset')

module.exports = {
  presets: [webappDark],
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
}
```

```css
/* globals.css */
@import '@johnthemes/webapp-dark/styles/globals.css';
```

```tsx
// App.tsx
import { Button, Card } from '@johnthemes/webapp-dark'

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Card className="p-6">
        <Button>Themed Button</Button>
      </Card>
    </div>
  )
}
```

## Adding New Themes

Each theme should follow this structure:

```
new-theme/
├── package.json           # Theme package info
├── tailwind.preset.js     # Tailwind configuration
├── styles/
│   └── globals.css       # Base styles and utility classes
├── components/           # Styled React components
│   ├── Button.tsx
│   ├── Input.tsx
│   └── Card.tsx
├── tokens.js            # Design tokens as JS exports
├── utils.ts             # Utility functions (cn helper)
├── index.js             # Main export file
└── README.md            # Theme documentation
```

## Theme Philosophy

- **Consistent APIs** across all themes
- **Tailwind-first** approach with utility classes
- **Component library** for complex patterns
- **Design tokens** for programmatic access
- **Zero runtime** overhead (build-time CSS)