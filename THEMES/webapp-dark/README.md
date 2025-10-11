# Webapp Dark Theme

A dark terminal-aesthetic theme extracted from the Instagram downloader app, featuring monospace fonts and a green accent color.

## Features

- **Dark background** with subtle blue-gray tones
- **JetBrains Mono** font stack for terminal feel
- **Green accent** (#34d399) for highlights and actions
- **Tailwind CSS** integration with custom preset
- **Ready-to-use components** (Button, Input, Card)

## Installation

```bash
# Install from local file
npm install file:../THEMES/webapp-dark

# Or from git (when published)
npm install git+https://github.com/jbdamask/scratch.git#subdirectory=THEMES/webapp-dark
```

## Usage

### 1. Add to Tailwind Config

```javascript
// tailwind.config.js
const webappDark = require('@johnthemes/webapp-dark/tailwind.preset')

module.exports = {
  presets: [webappDark],
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // your other config...
}
```

### 2. Import Base Styles

```css
/* globals.css */
@import '@johnthemes/webapp-dark/styles/globals.css';
```

### 3. Use Components

```tsx
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@johnthemes/webapp-dark'

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Card>
        <CardHeader>
          <CardTitle>Dark Theme Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input placeholder="Enter something..." />
            <Button>Submit</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

## Color Palette

- **Background**: `#0a0e1a` (Deep dark blue)
- **Foreground**: `#a3b8cc` (Light blue-gray text)
- **Primary**: `#34d399` (Bright green)
- **Secondary**: `#1e293b` (Dark blue-gray cards)
- **Muted**: `#334155` (Medium blue-gray borders)

## Design Tokens

Access design tokens programmatically:

```javascript
import { tokens } from '@johnthemes/webapp-dark'

console.log(tokens.colors.primary) // '#34d399'
console.log(tokens.fontFamily.mono) // ['JetBrains Mono', ...]
```

## Components

### Button

- **Default**: Green outline, fills on hover
- **Loading state**: Shows spinner automatically
- **Variants**: default, outline, ghost, destructive
- **Sizes**: sm, default, lg, icon

### Input

- **Style**: Dark background with green focus border
- **Monospace font** for technical feel

### Card

- **Hover effects**: Border changes to green
- **Consistent spacing** and rounded corners
- **Header components** with proper typography