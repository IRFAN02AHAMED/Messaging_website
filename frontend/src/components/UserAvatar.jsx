import { Avatar, useTheme } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';

export function getAvatarStyles(name, isDark) {
  if (!name) {
    return {
      bgcolor: isDark ? '#2A3942' : '#DFE5E7',
      color: isDark ? '#8696A0' : '#54656F',
      border: isDark ? '2px solid #DFE5E7' : '2px solid #8696A0',
    };
  }

  // Simple string hashing function
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // HSL Color Generation
  const hue = Math.abs(hash) % 360;
  const saturation = 65; // Balanced saturation
  const lightness = isDark ? 35 : 80; // Pastel/light in light mode, deep/dark in dark mode

  const bgcolor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  const color = isDark ? '#E9EDEF' : '#111B21';
  const borderColor = isDark ? '#E9EDEF' : '#8696A0';

  return {
    bgcolor,
    color,
    border: `2px solid ${borderColor}`,
  };
}

export default function UserAvatar({ name, profilePicture, isGroup = false, width = 40, height = 40, fontSize, sx = {} }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const avatarStyles = getAvatarStyles(isGroup ? 'Group' : name, isDark);

  // Generate initials (at most 2 characters)
  const getInitials = () => {
    if (!name || isGroup) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const initials = getInitials();

  return (
    <Avatar
      sx={{
        width,
        height,
        fontSize: fontSize || (width > 50 ? '1.8rem' : width < 35 ? '0.8rem' : '0.95rem'),
        bgcolor: avatarStyles.bgcolor,
        color: avatarStyles.color,
        border: avatarStyles.border,
        fontWeight: 600,
        ...sx,
      }}
    >
      {profilePicture ? (
        <img
          src={profilePicture}
          alt={name || 'User'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : isGroup ? (
        <GroupIcon sx={{ fontSize: width * 0.55 }} />
      ) : (
        initials || <PersonIcon sx={{ fontSize: width * 0.55 }} />
      )}
    </Avatar>
  );
}
