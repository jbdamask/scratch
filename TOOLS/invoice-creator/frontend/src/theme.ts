export const theme = {
  colors: {
    // Primary brand colors - Deep purples from the image
    primary: {
      main: '#8B5FBF',
      light: '#A584D1',
      dark: '#6B4595',
      bg: 'rgba(139, 95, 191, 0.1)',
      border: 'rgba(139, 95, 191, 0.2)',
    },
    
    // Secondary/accent colors - Bright magenta/purple
    secondary: {
      main: '#D946EF',
      light: '#E879F9',
      dark: '#C026D3',
      bg: 'rgba(217, 70, 239, 0.1)',
    },
    
    // Status colors - Updated with cyberpunk palette
    success: {
      main: '#00FF41',
      light: '#4DFF7A',
      dark: '#00D935',
      bg: 'rgba(0, 255, 65, 0.1)',
      text: '#00FF41',
    },
    
    warning: {
      main: '#FFD700',
      light: '#FFED4E',
      dark: '#F7B500',
      bg: 'rgba(255, 215, 0, 0.1)',
      text: '#CC8F00',
      bgLight: 'rgba(255, 215, 0, 0.05)',
    },
    
    // Additional status colors
    info: {
      main: '#00BFFF',
      light: '#4DD4FF',
      dark: '#009FDD',
      bg: 'rgba(0, 191, 255, 0.1)',
      text: '#0099CC',
    },
    
    draft: {
      main: '#8B949E',
      light: '#A5B3BB',
      dark: '#6E7681',
      bg: 'rgba(139, 148, 158, 0.1)',
      text: '#8B949E',
    },
    
    error: {
      main: '#FF1744',
      light: '#FF5983',
      dark: '#D50000',
      bg: 'rgba(255, 23, 68, 0.1)',
      text: '#B71C1C',
    },
    
    // Neutral colors - Dark cyberpunk theme
    gray: {
      50: '#1A1B23',
      100: '#252631',
      200: '#2D2E3F',
      300: '#383A4D',
      400: '#4A4D63',
      500: '#6B7280',
      600: '#9CA3AF',
      700: '#D1D5DB',
      800: '#E5E7EB',
      900: '#F9FAFB',
    },
    
    // Background colors - Dark cyberpunk backgrounds
    background: {
      main: '#0F0F17',
      card: '#1A1B23',
      sidebar: '#8B5FBF',
    },
    
    // Text colors - Light text for dark backgrounds
    text: {
      primary: '#F9FAFB',
      secondary: '#D1D5DB',
      light: 'rgba(255, 255, 255, 0.7)',
      white: '#ffffff',
    },
    
    // Border colors - Subtle cyberpunk borders
    border: {
      main: '#383A4D',
      light: 'rgba(255, 255, 255, 0.1)',
      focus: '#D946EF',
    },
    
    // Shadow colors - Purple/blue glows
    shadow: {
      sm: '0 1px 3px rgba(139, 95, 191, 0.3)',
      md: '0 4px 6px rgba(139, 95, 191, 0.3)',
      lg: '0 10px 15px rgba(217, 70, 239, 0.2)',
    },
  },
  
  // Common style combinations
  card: {
    base: {
      backgroundColor: '#1A1B23',
      borderRadius: '12px',
      border: '1px solid #383A4D',
      boxShadow: '0 1px 3px rgba(139, 95, 191, 0.3)',
    },
  },
  
  button: {
    primary: {
      backgroundColor: '#D946EF',
      color: '#ffffff',
      hoverBg: '#C026D3',
    },
    secondary: {
      backgroundColor: 'transparent',
      color: '#D946EF',
      border: '1px solid #D946EF',
      hoverBg: 'rgba(217, 70, 239, 0.1)',
    },
  },
  
  status: {
    draft: {
      bg: 'rgba(139, 148, 158, 0.1)',
      text: '#8B949E',
    },
    sent: {
      bg: 'rgba(0, 191, 255, 0.1)',
      text: '#0099CC',
    },
    pending: {
      bg: 'rgba(255, 215, 0, 0.05)',
      text: '#CC8F00',
    },
    paid: {
      bg: 'rgba(0, 255, 65, 0.1)',
      text: '#00FF41',
    },
    overdue: {
      bg: 'rgba(255, 23, 68, 0.1)',
      text: '#FF1744',
    },
  },
} as const

// Type for theme colors
export type Theme = typeof theme
export type ThemeColors = typeof theme.colors