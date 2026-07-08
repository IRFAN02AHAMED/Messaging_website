import { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, List, ListItem, ListItemAvatar,
  ListItemText, IconButton, Typography, Divider,
  Box, Chip,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import UserAvatar from './UserAvatar';
import useAppStore from '../store/useAppStore';

export default function ParticipantManager({ open, onClose }) {
  const [showAddSection, setShowAddSection] = useState(false);
  const selectedChat = useAppStore((s) => s.selectedChat);
  const participants = useAppStore((s) => s.participants);
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const addParticipant = useAppStore((s) => s.addParticipant);
  const removeParticipant = useAppStore((s) => s.removeParticipant);
  const fetchParticipants = useAppStore((s) => s.fetchParticipants);

  const chatParticipants = useMemo(() => {
    if (!selectedChat) return [];
    return participants.filter((p) => p.chat_id === selectedChat.chat_id);
  }, [participants, selectedChat]);

  const participantUserIds = chatParticipants.map((p) => p.user_id);

  const nonParticipants = users.filter(
    (u) => !participantUserIds.includes(u.user_id || u.id)
  );

  const handleAdd = async (userId) => {
    try {
      await addParticipant({
        chat_id: selectedChat.chat_id,
        user_id: userId,
        role: 'member',
      });
      await fetchParticipants();
    } catch (err) {
      console.error('Failed to add participant:', err);
    }
  };

  const handleRemove = async (participantId) => {
    try {
      await removeParticipant(participantId);
      await fetchParticipants();
    } catch (err) {
      console.error('Failed to remove participant:', err);
    }
  };

  const getUserName = (userId) =>
    users.find((u) => u.user_id === userId)?.name || 'Unknown';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Participants — Chat #{selectedChat?.chat_id}</DialogTitle>
      <DialogContent>
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
          Current Members ({chatParticipants.length})
        </Typography>
        <List dense>
          {chatParticipants.map((p) => (
            <ListItem
              key={p.chat_participant_id}
              secondaryAction={
                p.user_id !== currentUser?.user_id && (
                  <IconButton edge="end" onClick={() => handleRemove(p.chat_participant_id)} size="small">
                    <RemoveCircleOutlineIcon sx={{ color: '#EA4335' }} />
                  </IconButton>
                )
              }
            >
              <ListItemAvatar>
                <UserAvatar name={getUserName(p.user_id)} width={32} height={32} />
              </ListItemAvatar>
              <ListItemText
                primary={getUserName(p.user_id)}
                secondary={
                  <Chip label={p.role} size="small" variant="outlined"
                    sx={{ height: 20, fontSize: '0.65rem',
                      borderColor: p.role === 'admin' ? '#00A884' : '#8696A0',
                      color: p.role === 'admin' ? '#00A884' : '#8696A0',
                    }}
                  />
                }
              />
            </ListItem>
          ))}
        </List>

        {nonParticipants.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Add Members
              </Typography>
              <IconButton size="small" onClick={() => setShowAddSection(!showAddSection)}>
                <PersonAddIcon sx={{ fontSize: 18, color: '#00A884' }} />
              </IconButton>
            </Box>
            {showAddSection && (
              <List dense>
                {nonParticipants.map((user) => (
                  <ListItem
                    key={user.user_id}
                    secondaryAction={
                      <Button size="small" onClick={() => handleAdd(user.user_id)} sx={{ minWidth: 'auto' }}>
                        Add
                      </Button>
                    }
                  >
                    <ListItemAvatar>
                      <UserAvatar name={user.name} profilePicture={user.profile_picture} width={32} height={32} />
                    </ListItemAvatar>
                    <ListItemText primary={user.name} secondary={user.phone_number} />
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
