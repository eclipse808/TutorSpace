import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#7C5CBF',
      light: '#9B83CF',
      dark: '#6A4DAD',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#B39DDB',
      contrastText: '#2D1B69',
    },
    background: {
      default: '#F7F5FC',
      paper: '#ffffff',
    },
    text: {
      primary: '#2D1B69',
      secondary: '#7C6B9E',
    },
    error: { main: '#ef4444' },
    success: { main: '#22c55e' },
    warning: { main: '#f59e0b' },
    info: { main: '#3b82f6' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          fontWeight: 600,
          padding: '8px 20px',
        },
        contained: {
          boxShadow: '0 2px 8px rgba(124,92,191,0.25)',
          '&:hover': { boxShadow: '0 4px 16px rgba(124,92,191,0.35)' },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': { borderWidth: 2 },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 4px rgba(124,92,191,0.08)',
          border: '1px solid rgba(124,92,191,0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 16 },
        elevation1: { boxShadow: '0 1px 4px rgba(124,92,191,0.08)' },
        elevation2: { boxShadow: '0 2px 8px rgba(124,92,191,0.12)' },
        elevation3: { boxShadow: '0 4px 16px rgba(124,92,191,0.15)' },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', fullWidth: true },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '& fieldset': { borderColor: '#D5C9EE' },
            '&:hover fieldset': { borderColor: '#9B83CF' },
            '&.Mui-focused fieldset': { borderColor: '#7C5CBF', borderWidth: 2 },
          },
          '& .MuiInputLabel-root.Mui-focused': { color: '#7C5CBF' },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '& fieldset': { borderColor: '#D5C9EE' },
          '&:hover fieldset': { borderColor: '#9B83CF' },
          '&.Mui-focused fieldset': { borderColor: '#7C5CBF', borderWidth: 2 },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 20, fontWeight: 500 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#2D1B69',
          boxShadow: '0 1px 0 rgba(124,92,191,0.12)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderRadius: 0 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 20 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 6, height: 8 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500 },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { height: 3, borderRadius: 2 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { borderRadius: 8, fontSize: 12 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: { borderRadius: '12px !important', '&:before': { display: 'none' } },
      },
    },
  },
});
