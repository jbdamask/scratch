/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        // Core healthcare theme colors from Solutis design
        background: '#f8fafc',
        foreground: '#334155',
        primary: '#3b82f6', // Blue accent from the design
        'primary-foreground': '#ffffff',
        secondary: '#e2e8f0',
        'secondary-foreground': '#475569',
        muted: '#f1f5f9',
        'muted-foreground': '#64748b',
        accent: '#0ea5e9', // Lighter blue for highlights
        'accent-foreground': '#0f172a',
        destructive: '#ef4444',
        'destructive-foreground': '#fef2f2',
        border: '#e2e8f0',
        input: '#ffffff',
        ring: '#3b82f6',

        // Extended palette for healthcare UI
        card: '#ffffff',
        'card-foreground': '#1e293b',
        popover: '#ffffff',
        'popover-foreground': '#1e293b',

        // Medical status colors
        success: '#10b981', // Green for healthy ranges
        warning: '#f59e0b', // Orange for borderline
        danger: '#ef4444',  // Red for out of range
        info: '#0ea5e9',    // Blue for informational

        // Sidebar and navigation
        sidebar: '#ffffff',
        'sidebar-foreground': '#64748b',
        'sidebar-active': '#f1f5f9',
        'sidebar-active-foreground': '#3b82f6',

        // Chart colors for medical data
        chart: {
          1: '#3b82f6', // Primary blue
          2: '#10b981', // Success green
          3: '#f59e0b', // Warning orange
          4: '#ef4444', // Danger red
          5: '#8b5cf6', // Purple
          6: '#06b6d4', // Cyan
        }
      },
      fontFamily: {
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
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      borderRadius: {
        'none': '0',
        'sm': '0.25rem',
        'DEFAULT': '0.375rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        'full': '9999px'
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      }
    }
  },
  plugins: []
}