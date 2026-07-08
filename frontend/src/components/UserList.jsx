import { List, ListItemButton, ListItemAvatar, ListItemText, Badge, Typography, Box } from '@mui/material';
import UserAvatar from './UserAvatar';

export default function UserList({ users = [], onSelect, selectedId }) {
  if (!users.length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No users found</Typography>
      </Box>
    );
  }

  return (
    <List disablePadding>
      {users.map((user) => {
        const targetId = user.user_id || user.id;
        return (
          <ListItemButton
            key={targetId}
            selected={selectedId === targetId}
            onClick={() => onSelect?.(user)}
            sx={{
              py: 1.5,
              px: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              transition: 'background-color 0.15s ease',
            }}
          >
            <ListItemAvatar>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                variant="dot"
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: user.is_online ? '#44b700' : '#8696A0',
                    color: user.is_online ? '#44b700' : '#8696A0',
                    boxShadow: (theme) => `0 0 0 2px ${theme.palette.background.paper}`,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                  },
                }}
              >
                <UserAvatar name={user.name} profilePicture={user.profile_picture} width={45} height={45} />
              </Badge>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary' }}>
                  {user.name}
                </Typography>
              }
              secondary={
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  {user.phone_number}
                </Typography>
              }
            />
          </ListItemButton>
        );
      })}
    </List>
  );
}
