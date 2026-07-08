import { Box, InputBase, useTheme } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export default function SearchBar({ value, onChange, placeholder = 'Search...', autoFocus }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ p: 1.5 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          bgcolor: isDark ? 'background.paper' : 'background.default',
          borderRadius: 2,
          px: 1.5,
          py: 0.5,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
        <InputBase
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          fullWidth
          autoFocus={autoFocus}
          sx={{ 
            color: 'text.primary', 
            fontSize: '0.9rem',
            '& .MuiInputBase-input::placeholder': {
              color: 'text.secondary',
              opacity: 0.8,
            }
          }}
        />
      </Box>
    </Box>
  );
}
