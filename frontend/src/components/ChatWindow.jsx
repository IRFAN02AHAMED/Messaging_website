import { useEffect, useRef, useMemo, useState } from 'react';
import {
  Box, Typography, IconButton, CircularProgress,
  Menu, MenuItem, useTheme, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, List, ListItemButton, ListItemAvatar,
  ListItemText, Divider
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import dayjs from 'dayjs';
import SearchBar from './SearchBar';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import UserAvatar from './UserAvatar';
import useAppStore from '../store/useAppStore';

export default function ChatWindow() {
  const selectedChat = useAppStore((s) => s.selectedChat);
  const messages = useAppStore((s) => s.messages);
  const loadingMessages = useAppStore((s) => s.loadingMessages);
  const users = useAppStore((s) => s.users);
  const participants = useAppStore((s) => s.participants);
  const currentUser = useAppStore((s) => s.currentUser);
  const messageStatuses = useAppStore((s) => s.messageStatuses);
  const fetchMessageStatuses = useAppStore((s) => s.fetchMessageStatuses);
  const markChatAsRead = useAppStore((s) => s.markChatAsRead);
  const muteChat = useAppStore((s) => s.muteChat);
  const clearChat = useAppStore((s) => s.clearChat);
  const deleteChat = useAppStore((s) => s.deleteChat);
  const selectChat = useAppStore((s) => s.selectChat);
  const fetchChats = useAppStore((s) => s.fetchChats);
  const fetchParticipants = useAppStore((s) => s.fetchParticipants);
  const isChatMuted = useAppStore((s) => s.isChatMuted);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [muteDialogOpen, setMuteDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  // Auto-scroll logic
  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    if (messagesContainerRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      if (isNearBottom || messages.length <= 15) {
        scrollToBottom();
      }
    } else {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    setSearch('');
    setShowSearch(false);
    setTimeout(() => scrollToBottom('auto'), 50);
  }, [selectedChat?.chat_id]);

  // Periodically refresh message statuses for real-time tick updates
  useEffect(() => {
    if (!selectedChat) return;
    const interval = setInterval(() => {
      fetchMessageStatuses();
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedChat, fetchMessageStatuses]);

  // Mark messages as read when new messages arrive in the selected chat
  useEffect(() => {
    if (selectedChat && messages.length > 0) {
      markChatAsRead(selectedChat.chat_id);
    }
  }, [messages.length, selectedChat, markChatAsRead]);

  const isMuted = useMemo(() => {
    return isChatMuted?.(selectedChat?.chat_id) || false;
  }, [selectedChat?.chat_id, isChatMuted, participants]);

  const handleMuteChat = async (option) => {
    let mutedUntil = null;
    if (option === '8h') {
      mutedUntil = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    } else if (option === '1w') {
      mutedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (option === 'always') {
      mutedUntil = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
    }
    
    try {
      await muteChat(selectedChat.chat_id, mutedUntil);
      setMuteDialogOpen(false);
    } catch (err) {
      console.error('Failed to mute chat:', err);
    }
  };

  const handleClearChat = async () => {
    try {
      await clearChat(selectedChat.chat_id);
      setClearDialogOpen(false);
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  const handleDeleteChat = async () => {
    try {
      await deleteChat(selectedChat.chat_id);
      setDeleteDialogOpen(false);
      selectChat(null);
      await fetchChats();
      await fetchParticipants();
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  const chatParticipants = useMemo(() => {
    if (!selectedChat) return [];
    return participants.filter((p) => p.chat_id === selectedChat.chat_id);
  }, [participants, selectedChat]);

  const getChatName = () => {
    if (!selectedChat) return '';
    if (selectedChat.type === 'group') return `Group Chat #${selectedChat.chat_id}`;
    const otherParticipant = chatParticipants.find((p) => p.user_id !== currentUser?.user_id);
    const otherUser = users.find((u) => u.user_id === otherParticipant?.user_id);
    return otherUser?.name || `Chat #${selectedChat.chat_id}`;
  };

  const getParticipantNames = () => {
    return chatParticipants
      .map((p) => {
        const user = users.find((u) => u.user_id === p.user_id);
        return user?.name || 'Unknown';
      })
      .join(', ');
  };

  const getSenderName = (userId) => {
    const user = users.find((u) => u.user_id === userId);
    return user?.name || 'Unknown';
  };

  const getMessageStatus = (messageId) => {
    const statuses = messageStatuses.filter((s) => s.message_id === messageId);
    if (statuses.some((s) => s.status === 'read')) return 'read';
    if (statuses.some((s) => s.status === 'delivered')) return 'delivered';
    return 'sent';
  };

  const filteredMessages = useMemo(() => {
    if (!search.trim()) return messages;
    return messages.filter((m) => 
      m.content?.toLowerCase().includes(search.toLowerCase())
    );
  }, [messages, search]);

  if (!selectedChat) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          borderLeft: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ width: 320, textAlign: 'center', p: 4 }}>
          <Box
            sx={{
              width: 200,
              height: 200,
              mx: 'auto',
              mb: 3,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00A884 0%, #005C4B 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.15,
            }}
          >
            <PersonIcon sx={{ fontSize: 100, color: '#fff' }} />
          </Box>
          <Typography variant="h5" sx={{ color: 'text.primary', mb: 1 }}>
            WhatsApp Clone
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
            Send and receive messages. Select a chat from the sidebar to start messaging.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: '1px solid', borderColor: 'divider' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1.2,
          bgcolor: 'background.header',
          borderBottom: '1px solid',
          borderColor: 'divider',
          minHeight: 60,
        }}
      >
        <UserAvatar name={getChatName()} isGroup={selectedChat.type === 'group'} width={40} height={40} sx={{ mr: 1.5 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.5 }} noWrap>
            {getChatName()}
            {isMuted && <VolumeOffIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
            {getParticipantNames() || 'No participants'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={() => setShowSearch(!showSearch)}>
          <SearchIcon />
        </IconButton>
        <IconButton size="small" onClick={handleMenuClick}>
          <MoreVertIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={openMenu}
          onClose={handleMenuClose}
          PaperProps={{ sx: { bgcolor: 'background.paper', color: 'text.primary', mt: 1, minWidth: 160 } }}
        >
          <MenuItem onClick={() => { setContactDialogOpen(true); handleMenuClose(); }}>View Contact</MenuItem>
          <MenuItem onClick={() => { setShowSearch(true); handleMenuClose(); }}>Search</MenuItem>
          <MenuItem onClick={() => { setMuteDialogOpen(true); handleMenuClose(); }}>Mute Notifications</MenuItem>
          <MenuItem onClick={() => { setClearDialogOpen(true); handleMenuClose(); }}>Clear Chat</MenuItem>
          <MenuItem onClick={() => { setDeleteDialogOpen(true); handleMenuClose(); }}>Delete Chat</MenuItem>
        </Menu>
      </Box>

      {/* Chat Search Bar */}
      {showSearch && (
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search messages..." autoFocus />
        </Box>
      )}

      {/* Messages */}
      <Box
        ref={messagesContainerRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          py: 1,
          bgcolor: 'background.chatBg',
          backgroundImage: isDark
            ? 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'1\' fill=\'%23172329\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23p)\'/%3E%3C/svg%3E")'
            : 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'1\' fill=\'%23D1C4B2\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23p)\'/%3E%3C/svg%3E")',
        }}
      >
        {loadingMessages ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
            <CircularProgress size={32} sx={{ color: 'primary.main' }} />
          </Box>
        ) : filteredMessages.length === 0 && search ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
            <Typography variant="body2" sx={{ bgcolor: 'background.paper', px: 2, py: 0.8, borderRadius: 2, color: 'text.secondary' }}>
              No messages found for "{search}"
            </Typography>
          </Box>
        ) : filteredMessages.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
            <Typography
              variant="body2"
              sx={{ bgcolor: 'background.paper', px: 2, py: 0.8, borderRadius: 2, color: 'text.secondary' }}
            >
              No messages yet. Say hello! 👋
            </Typography>
          </Box>
        ) : (
          filteredMessages.map((msg) => (
            <MessageBubble
              key={msg.message_id}
              message={msg}
              senderName={getSenderName(msg.user_id)}
              status={getMessageStatus(msg.message_id)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <MessageInput />

      {/* Dialogs */}
      {/* Contact Info Dialog */}
      <Dialog open={contactDialogOpen} onClose={() => setContactDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>{selectedChat.type === 'group' ? 'Group Details' : 'Contact Details'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
            <UserAvatar name={getChatName()} isGroup={selectedChat.type === 'group'} width={80} height={80} sx={{ mb: 2 }} />
            {selectedChat.type === 'group' ? (
              <>
                <Typography variant="h6" gutterBottom>{getChatName()}</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Created on: {dayjs(selectedChat.created_at).format('MMMM DD, YYYY')}
                </Typography>
                <Divider sx={{ width: '100%', my: 2 }} />
                <Typography variant="subtitle2" sx={{ alignSelf: 'flex-start', mb: 1 }}>
                  Members ({chatParticipants.length})
                </Typography>
                <List sx={{ width: '100%', maxHeight: 200, overflowY: 'auto' }}>
                  {chatParticipants.map((p) => {
                    const user = users.find((u) => u.user_id === p.user_id);
                    return (
                      <ListItemButton key={p.chat_participant_id} dense disabled sx={{ '&.Mui-disabled': { opacity: 1 } }}>
                        <ListItemAvatar>
                          <UserAvatar name={user?.name} profilePicture={user?.profile_picture} width={32} height={32} />
                        </ListItemAvatar>
                        <ListItemText 
                          primary={user?.name || 'Unknown'} 
                          secondary={p.role === 'admin' ? 'Admin' : 'Member'} 
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              </>
            ) : (
              (() => {
                const otherParticipant = chatParticipants.find((p) => p.user_id !== currentUser?.user_id);
                const otherUser = users.find((u) => u.user_id === otherParticipant?.user_id);
                return (
                  <>
                    <Typography variant="h6" gutterBottom>{otherUser?.name || 'Unknown'}</Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {otherUser?.phone_number}
                    </Typography>
                    <Divider sx={{ width: '100%', my: 2 }} />
                    <Typography variant="subtitle2" sx={{ alignSelf: 'flex-start' }} gutterBottom>About</Typography>
                    <Typography variant="body2" color="text.primary" sx={{ alignSelf: 'flex-start', bgcolor: 'background.default', p: 1.5, borderRadius: 1, width: '100%' }}>
                      Hey there! I am using WhatsApp.
                    </Typography>
                  </>
                );
              })()
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContactDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Mute Dialog */}
      <Dialog open={muteDialogOpen} onClose={() => setMuteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Mute Notifications</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Other participants won't see that you muted this chat.
          </Typography>
          <List>
            {[
              { label: '8 Hours', value: '8h' },
              { label: '1 Week', value: '1w' },
              { label: 'Always', value: 'always' }
            ].map((opt) => (
              <ListItemButton key={opt.value} onClick={() => handleMuteChat(opt.value)}>
                <ListItemText primary={opt.label} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          {isMuted && (
            <Button onClick={() => handleMuteChat('unmute')} color="warning" sx={{ mr: 'auto' }}>
              Unmute
            </Button>
          )}
          <Button onClick={() => setMuteDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Clear Chat Confirmation */}
      <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)}>
        <DialogTitle>Clear Chat?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to clear all messages in this chat? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleClearChat} color="error" variant="contained">Clear</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Chat Confirmation */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Chat?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete this chat conversation? This will delete the conversation from the server.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteChat} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
