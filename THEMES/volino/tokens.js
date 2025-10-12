// Design tokens for Volino theme
export const colors = {
  // Core colors
  background: '#f8fafc',
  foreground: '#334155',
  primary: '#3b82f6',
  primaryForeground: '#ffffff',
  secondary: '#e2e8f0',
  secondaryForeground: '#475569',
  muted: '#f1f5f9',
  mutedForeground: '#64748b',
  accent: '#0ea5e9',
  accentForeground: '#0f172a',
  destructive: '#ef4444',
  destructiveForeground: '#fef2f2',
  border: '#e2e8f0',
  input: '#ffffff',
  ring: '#3b82f6',
  card: '#ffffff',
  cardForeground: '#1e293b',

  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#0ea5e9',

  // Sidebar colors
  sidebar: '#ffffff',
  sidebarForeground: '#64748b',
  sidebarActive: '#f1f5f9',
  sidebarActiveForeground: '#3b82f6',

  // Chart colors
  chart: {
    1: '#3b82f6',
    2: '#10b981',
    3: '#f59e0b',
    4: '#ef4444',
    5: '#8b5cf6',
    6: '#06b6d4'
  }
}

export const fontFamily = {
  sans: [
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif'
  ],
  mono: [
    'SF Mono',
    'Monaco',
    'Inconsolata',
    'Roboto Mono',
    'monospace'
  ]
}

export const fontSize = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem'
}

export const spacing = {
  cardPadding: '24px',
  cardCompactPadding: '16px',
  inputPadding: '8px 12px',
  buttonPadding: '8px 16px',
  sidebarPadding: '8px 12px'
}

export const borderRadius = {
  none: '0',
  sm: '0.25rem',
  default: '0.375rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  full: '9999px'
}

export const boxShadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  default: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
}

export const transitions = {
  default: 'all 0.2s',
  fast: 'all 0.1s',
  slow: 'all 0.3s'
}

// UI-specific design tokens
export const ui = {
  statusTypes: {
    active: { color: colors.success, label: 'Active' },
    pending: { color: colors.warning, label: 'Pending' },
    inactive: { color: colors.danger, label: 'Inactive' },
    draft: { color: colors.info, label: 'Draft' }
  },
  fileTypes: {
    pdf: { color: colors.danger, icon: 'FileText' },
    image: { color: colors.info, icon: 'Image' },
    document: { color: colors.primary, icon: 'File' },
    spreadsheet: { color: colors.success, icon: 'Table' }
  },
  priorityLevels: {
    low: { color: colors.info, label: 'Low' },
    medium: { color: colors.warning, label: 'Medium' },
    high: { color: colors.danger, label: 'High' }
  }
}