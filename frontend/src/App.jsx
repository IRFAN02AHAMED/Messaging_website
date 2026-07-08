import { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import getTheme from './theme';
import useAppStore from './store/useAppStore';

function ProtectedRoute({ children }) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/" replace />;
}

function GuestRoute({ children }) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/chat" replace /> : children;
}

export default function App() {
  const currentUser = useAppStore((s) => s.currentUser);

  const theme = useMemo(
    () => getTheme(currentUser?.theme || 'dark'),
    [currentUser?.theme]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
