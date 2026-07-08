import { Dialog, DialogTitle, DialogContent, Box, Typography, Switch, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import useAppStore from '../store/useAppStore';

export default function SettingsDialog({ open, onClose }) {
  const themeMode = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  const handleThemeToggle = (e) => {
    const isDark = e.target.checked;
    const newTheme = isDark ? 'dark' : 'light';
    setTheme(newTheme);
  };

  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { bgcolor: 'background.paper', color: 'text.primary', minWidth: 300 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Settings
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
          <Typography>Dark Mode</Typography>
          <Switch
            checked={themeMode === 'dark'}
            onChange={handleThemeToggle}
            color="primary"
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}
