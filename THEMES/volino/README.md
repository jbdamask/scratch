# Volino Theme

A clean, modern UI theme with professional blue accents and a light design aesthetic. Perfect for dashboards, applications, and any interface that needs a polished, trustworthy look.

## Features

- **Clean light design** with professional aesthetics
- **Blue accent colors** for a trustworthy, modern feel
- **System fonts** for optimal readability across platforms
- **Comprehensive component system** for modern UIs
- **Tailwind CSS** integration with custom preset
- **Accessibility-focused** with proper focus states and keyboard navigation

## Installation

```bash
# Install from local file
npm install file:../THEMES/volino

# Or from git (when published)
npm install git+https://github.com/jbdamask/scratch.git#subdirectory=THEMES/volino
```

## Usage

### 1. Add to Tailwind Config

```javascript
// tailwind.config.js
const volino = require('@johnthemes/volino/tailwind.preset')

module.exports = {
  presets: [volino],
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // your other config...
}
```

### 2. Import Base Styles

```css
/* globals.css */
@import '@johnthemes/volino/styles/globals.css';
```

### 3. Use Components

```tsx
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  MetricValue,
  MetricLabel,
  Badge
} from '@johnthemes/volino'

function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card variant="metric">
          <MetricValue>24</MetricValue>
          <MetricLabel>Active Projects</MetricLabel>
        </Card>
        <Card variant="metric">
          <MetricValue>12</MetricValue>
          <MetricLabel>Team Members</MetricLabel>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Project Status</span>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="flex gap-3">
              <Input variant="search" placeholder="Search projects..." />
              <Button>Add New</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

## Color Palette

- **Background**: `#f8fafc` (Light gray-blue)
- **Foreground**: `#334155` (Dark slate)
- **Primary**: `#3b82f6` (Professional blue)
- **Success**: `#10b981` (Green for positive states)
- **Warning**: `#f59e0b` (Orange for warnings)
- **Danger**: `#ef4444` (Red for errors/critical states)
- **Info**: `#0ea5e9` (Light blue for informational content)

## Components

### Button
- **Variants**: default, destructive, outline, secondary, ghost, link
- **Sizes**: sm, default, lg, icon
- **Loading state**: Shows spinner automatically when `loading` prop is true

### Input
- **Variants**: default, search (with left padding for search icon)
- **Accessibility**: Proper focus states and keyboard navigation
- **Clean styling**: Consistent with overall theme aesthetic

### Card
- **Variants**: default, compact, metric
- **Sub-components**: Header, Title, Description, Content, Footer
- **Metric components**: MetricValue, MetricLabel for dashboard statistics

### Badge
- **Variants**: default, secondary, success, warning, danger, info, outline
- **Perfect for**: Status indicators, tags, categories, priority levels

## General Utilities

```tsx
import { formatNumber, getStatusVariant, formatFileSize } from '@johnthemes/volino'

// Format numbers with specific decimal places
const formatted = formatNumber(12.5678, 2) // "12.57"

// Get appropriate color class for status
const colorClass = getStatusVariant('success') // "text-success"

// Format file sizes
const fileSize = formatFileSize(1024000) // "1.0 MB"
```

## Design Tokens

Access design tokens programmatically:

```javascript
import { tokens } from '@johnthemes/volino'

// Colors
console.log(tokens.colors.primary) // '#3b82f6'
console.log(tokens.colors.success) // '#10b981'

// UI-specific tokens
console.log(tokens.ui.statusTypes.active) // { color: '#10b981', label: 'Active' }

// Typography
console.log(tokens.fontFamily.sans) // ['-apple-system', 'BlinkMacSystemFont', ...]
```

## CSS Classes

The theme provides utility classes for common UI patterns:

```css
/* Cards */
.volino-card              /* Standard card with padding and shadow */
.volino-card-compact      /* Compact card with less padding */
.volino-metric-card       /* Centered card for dashboard metrics */

/* Inputs and buttons */
.volino-input             /* Standard input styling */
.volino-search            /* Search input with left padding */
.volino-button-primary    /* Primary button styling */
.volino-button-outline    /* Outline button styling */

/* Status indicators */
.volino-badge-success     /* Green badge for positive status */
.volino-badge-warning     /* Orange badge for warnings */
.volino-badge-danger      /* Red badge for critical status */
.volino-badge-info        /* Blue badge for informational content */

/* Navigation */
.sidebar                  /* Sidebar container styling */
.sidebar-item             /* Individual sidebar navigation items */
.sidebar-item-active      /* Active sidebar item styling */
```

## Best Practices

1. **Use semantic colors**: success for positive actions, warning for caution, danger for errors
2. **Leverage metric cards**: Perfect for dashboard KPIs and key statistics
3. **Consistent spacing**: Use the provided card variants for consistent layouts
4. **Accessibility**: All components include proper focus states and ARIA attributes
5. **Modern patterns**: Components follow current React and design system best practices

## Integration Examples

### Project Dashboard
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <Card className="lg:col-span-2">
    <CardHeader>
      <CardTitle>Recent Projects</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {projects.map(project => (
          <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium">{project.name}</div>
              <div className="text-sm text-muted-foreground">{project.description}</div>
            </div>
            <Badge variant={project.status === 'active' ? 'success' : 'warning'}>
              {project.status}
            </Badge>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Quick Actions</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <Button className="w-full">New Project</Button>
      <Button variant="outline" className="w-full">Invite Team</Button>
    </CardContent>
  </Card>
</div>
```

### Status Management
```tsx
<div className="flex gap-2 flex-wrap">
  <Badge variant="success">Active</Badge>
  <Badge variant="warning">Pending</Badge>
  <Badge variant="danger">Overdue</Badge>
  <Badge variant="info">Draft</Badge>
</div>
```

This theme is designed for modern applications where clean design, professional appearance, and excellent user experience are priorities.