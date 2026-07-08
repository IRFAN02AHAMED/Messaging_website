import { createTheme } from '@mui/material/styles';

const getTheme = (mode = 'dark') => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: '#00A884',
        light: '#06CF9C',
        dark: '#008F72',
      },
      secondary: {
        main: '#8696A0',
      },
      background: {
        default: isDark ? '#111B21' : '#F0F2F5',
        paper: isDark ? '#0B141A' : '#FFFFFF',
        header: isDark ? '#1F2C33' : '#F0F2F5',
        messageInput: isDark ? '#1F2C33' : '#F0F2F5',
        chatBg: isDark ? '#0B141A' : '#EFEAE2',
        bubbleSent: isDark ? '#005C4B' : '#D9FDD3',
        bubbleReceived: isDark ? '#202C33' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#E9EDEF' : '#111B21',
        secondary: isDark ? '#8696A0' : '#667781',
      },
      divider: isDark ? '#2A3942' : '#E9EDEF',
      error: {
        main: '#EA4335',
      },
    },
    typography: {
      fontFamily: "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif",
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },
      body2: {
        color: isDark ? '#8696A0' : '#667781',
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
            fontWeight: 500,
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: isDark ? '#2A3942' : '#F0F2F5',
              borderRadius: 8,
              '& fieldset': {
                borderColor: 'transparent',
              },
              '&:hover fieldset': {
                borderColor: '#00A884',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#00A884',
              },
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#1F2C33' : '#FFFFFF',
            backgroundImage: 'none',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: isDark ? '#202C33' : '#F5F6F6',
            },
            '&.Mui-selected': {
              backgroundColor: isDark ? '#2A3942' : '#E9EDEF',
              '&:hover': {
                backgroundColor: isDark ? '#2A3942' : '#E9EDEF',
              },
            },
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#2A3942' : '#DFE5E7',
            color: isDark ? '#8696A0' : '#54656F',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: isDark ? '#8696A0' : '#54656F',
            '&:hover': {
              backgroundColor: isDark
                ? 'rgba(134, 150, 160, 0.1)'
                : 'rgba(84, 101, 111, 0.1)',
            },
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#233138' : '#FFFFFF',
          },
        },
      },
    },
  });
};

export default getTheme;
