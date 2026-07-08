import { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, ToggleButton, ToggleButtonGroup, Checkbox, Radio,
  List, ListItemButton, ListItemAvatar,
  ListItemText, Typography, Box,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import UserAvatar from './UserAvatar';
import useAppStore from '../store/useAppStore';

export default function CreateChatDialog({ open, onClose }) {
  const [chatType, setChatType] = useState('private');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const chats = useAppStore((s) => s.chats);
  const participants = useAppStore((s) => s.participants);
  const createChat = useAppStore((s) => s.createChat);
  const selectChat = useAppStore((s) => s.selectChat);
  const fetchChats = useAppStore((s) => s.fetchChats);
  const fetchParticipants = useAppStore((s) => s.fetchParticipants);

  const otherUsers = users.filter((u) => (u.user_id || u.id) !== (currentUser?.user_id || currentUser?.id));

  // Filter chats where current user is a participant
  const userChats = useMemo(() => {
    const userParticipantChatIds = participants
      .filter((p) => p.user_id === currentUser?.user_id)
      .map((p) => p.chat_id);
    return chats.filter((c) => userParticipantChatIds.includes(c.chat_id));
  }, [chats, participants, currentUser]);

  const toggleUser = (userId) => {
    if (chatType === 'private') {
      setSelectedUsers([userId]);
    } else {
      setSelectedUsers((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
    }
  };

  const handleChatTypeChange = (_, value) => {
    if (!value) return;
    setChatType(value);
    // When switching to private chat, keep at most one selected user
    if (value === 'private') {
      setSelectedUsers((prev) => (prev.length > 0 ? [prev[0]] : []));
    }
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;
    setLoading(true);
    try {
      const participantIds = [currentUser.user_id, ...selectedUsers];

      // Front-end duplicate check for private chat
      if (chatType === 'private') {
        const targetUserId = selectedUsers[0];
        const existingChat = userChats.find((c) => {
          if (c.type !== 'private') return false;
          const chatParticipants = participants.filter((p) => p.chat_id === c.chat_id);
          return chatParticipants.some((p) => p.user_id === targetUserId);
        });

        if (existingChat) {
          selectChat(existingChat);
          handleClose();
          return;
        }
      }

      // Create chat atomically with participants
      const chat = await createChat({
        type: chatType,
        participant_ids: participantIds,
      });

      await fetchChats();
      await fetchParticipants();
      selectChat(chat);
      handleClose();
    } catch (err) {
      console.error('Failed to create chat:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setChatType('private');
    setSelectedUsers([]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>New Chat</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
            Chat Type
          </Typography>
          <ToggleButtonGroup
            value={chatType}
            exclusive
            onChange={handleChatTypeChange}
            fullWidth
            size="small"
          >
            <ToggleButton value="private" sx={{ textTransform: 'none' }}>
              <PersonIcon sx={{ mr: 0.5, fontSize: 18 }} /> Private
            </ToggleButton>
            <ToggleButton value="group" sx={{ textTransform: 'none' }}>
              <GroupIcon sx={{ mr: 0.5, fontSize: 18 }} /> Group
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
          Select Participants
        </Typography>

        <List sx={{ maxHeight: 300, overflowY: 'auto' }}>
          {otherUsers.map((user) => {
            const targetId = user.user_id || user.id;
            return (
              <ListItemButton key={targetId} onClick={() => toggleUser(targetId)} dense>
                {chatType === 'private' ? (
                  <Radio
                    checked={selectedUsers.includes(targetId)}
                    sx={{ color: '#8696A0', '&.Mui-checked': { color: '#00A884' } }}
                  />
                ) : (
                  <Checkbox
                    checked={selectedUsers.includes(targetId)}
                    sx={{ color: '#8696A0', '&.Mui-checked': { color: '#00A884' } }}
                  />
                )}
                <ListItemAvatar>
                  <UserAvatar name={user.name} profilePicture={user.profile_picture} width={36} height={36} />
                </ListItemAvatar>
                <ListItemText
                  primary={user.name}
                  secondary={user.phone_number}
                />
              </ListItemButton>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} sx={{ color: 'text.secondary' }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={selectedUsers.length === 0 || loading}
        >
          {loading ? 'Creating...' : 'Create Chat'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
