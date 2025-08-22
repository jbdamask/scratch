export const theme = {
  colors: {
    // Primary brand colors
    primary: {
      main: '#5b68eb',
      light: '#7c89f0',
      dark: '#4c59e8',
      bg: 'rgba(91, 104, 235, 0.1)',
      border: 'rgba(91, 104, 235, 0.2)',
    },
    
    // Secondary/accent colors
    secondary: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
      bg: '#dbeafe',
    },
    
    // Status colors
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
      bg: '#dcfce7',
      text: '#166534',
    },
    
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
      bg: '#fed7aa',
      text: '#92400e',
      bgLight: '#fef3c7',
    },
    
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
      bg: '#fecaca',
      text: '#991b1b',
    },
    
    // Neutral colors
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    
    // Background colors
    background: {
      main: '#f8fafc',
      card: '#ffffff',
      sidebar: '#5b68eb',
    },
    
    // Text colors
    text: {
      primary: '#111827',
      secondary: '#6b7280',
      light: 'rgba(255, 255, 255, 0.7)',
      white: '#ffffff',
    },
    
    // Border colors
    border: {
      main: '#e5e7eb',
      light: 'rgba(255, 255, 255, 0.2)',
      focus: '#3b82f6',
    },
    
    // Shadow colors
    shadow: {
      sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
      md: '0 4px 6px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    },
  },
  
  // Common style combinations
  card: {
    base: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
  },
  
  button: {
    primary: {
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      hoverBg: '#2563eb',
    },
    secondary: {
      backgroundColor: 'transparent',
      color: '#3b82f6',
      border: '1px solid #3b82f6',
      hoverBg: '#f1f5f9',
    },
  },
  
  status: {
    paid: {
      bg: '#dcfce7',
      text: '#166534',
    },
    pending: {
      bg: '#fef3c7',
      text: '#92400e',
    },
  },
} as const

// Type for theme colors
export type Theme = typeof theme
export type ThemeColors = typeof theme.colors