import { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, Avatar, Button, TextField,
  CircularProgress, Divider, Fade, InputAdornment, 
  Paper, useTheme, Alert, Link
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import PhoneIcon from '@mui/icons-material/Phone';
import LockIcon from '@mui/icons-material/Lock';
import useAppStore from '../store/useAppStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAppStore((s) => s.login);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/chat');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phone.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      await login({
        phone_number: phone.trim(),
        password: password,
      });
      navigate('/chat');
    } catch (err) {
      setError(err.message || 'Incorrect phone number or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: isDark ? '#111B21' : '#F0F2F5',
        p: 3,
      }}
    >
      {/* Top accent bar */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 220,
          background: 'linear-gradient(135deg, #00A884 0%, #005C4B 100%)',
          zIndex: 0,
        }}
      />

      <Fade in timeout={600}>
        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            maxWidth: 420,
            bgcolor: isDark ? '#1F2C33' : '#FFFFFF',
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              textAlign: 'center',
              pt: 4,
              pb: 3,
              px: 3,
              background: 'linear-gradient(180deg, rgba(0,168,132,0.15) 0%, transparent 100%)',
            }}
          >
            <Avatar
              sx={{
                width: 64,
                height: 64,
                mx: 'auto',
                mb: 2,
                bgcolor: '#00A884',
                boxShadow: '0 4px 20px rgba(0,168,132,0.3)',
              }}
            >
              <ChatIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 700 }}>
              Login to WhatsApp
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Enter your phone number and password to continue
            </Typography>
          </Box>

          <Divider />

          <Box sx={{ p: 4 }} component="form" onSubmit={handleLogin}>
            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              size="medium"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={loading}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon sx={{ color: '#8696A0', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              type="password"
              size="medium"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: '#8696A0', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || !phone.trim() || !password}
              sx={{
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                backgroundColor: '#00A884',
                '&:hover': {
                  backgroundColor: '#008F72',
                },
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Log In'}
            </Button>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Don't have an account?{' '}
                <Link
                  component={RouterLink}
                  to="/register"
                  sx={{
                    color: '#00A884',
                    fontWeight: 600,
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Register here
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Fade>
    </Box>
  );
}
