/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        // Core dark theme colors extracted from instagram-downloader
        background: '#0a0e1a',
        foreground: '#a3b8cc',
        primary: '#34d399',
        'primary-foreground': '#0f172a',
        secondary: '#1e293b',
        'secondary-foreground': '#e2e8f0',
        muted: '#334155',
        'muted-foreground': '#64748b',
        accent: '#34d399',
        'accent-foreground': '#0f172a',
        destructive: '#ef4444',
        'destructive-foreground': '#fef2f2',
        border: '#334155',
        input: '#334155',
        ring: '#34d399',

        // Extended palette for more components
        card: '#1e293b',
        'card-foreground': '#e2e8f0',
        popover: '#1e293b',
        'popover-foreground': '#e2e8f0'
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'Courier New', 'monospace'],
        sans: ['JetBrains Mono', 'Consolas', 'Monaco', 'Courier New', 'monospace'] // Use mono as default
      },
      animation: {
        'spin': 'spin 1s linear infinite'
      },
      borderRadius: {
        lg: '8px',
        md: '6px',
        sm: '4px'
      }
    }
  },
  plugins: []
}