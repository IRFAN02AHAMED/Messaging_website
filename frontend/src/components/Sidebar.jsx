import { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, IconButton, Tabs, Tab, Tooltip,
  Divider, List, ListItemButton, ListItemAvatar,
  ListItemText, Badge, useTheme, CircularProgress
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import AddCommentIcon from '@mui/icons-material/AddComment';
import GroupIcon from '@mui/icons-material/Group';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchBar from './SearchBar';
import CreateChatDialog from './CreateChatDialog';
import SettingsDialog from './SettingsDialog';
import SettingsIcon from '@mui/icons-material/Settings';
import UserAvatar from './UserAvatar';
import useAppStore from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

export default function Sidebar() {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const navigate = useNavigate();
  const currentUser = useAppStore((s) => s.currentUser);
  const users = useAppStore((s) => s.users);
  const loadingUsers = useAppStore((s) => s.loadingUsers);
  const chats = useAppStore((s) => s.chats);
  const selectedChat = useAppStore((s) => s.selectedChat);
  const participants = useAppStore((s) => s.participants);
  const messageStatuses = useAppStore((s) => s.messageStatuses);
  const selectChat = useAppStore((s) => s.selectChat);
  const deleteChat = useAppStore((s) => s.deleteChat);
  const createChat = useAppStore((s) => s.createChat);
  const addParticipant = useAppStore((s) => s.addParticipant);
  const fetchChats = useAppStore((s) => s.fetchChats);
  const fetchParticipants = useAppStore((s) => s.fetchParticipants);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const updateUser = useAppStore((s) => s.updateUser);
  const fetchMessageStatuses = useAppStore((s) => s.fetchMessageStatuses);
  const fetchAllMessages = useAppStore((s) => s.fetchAllMessages);
  const logout = useAppStore((s) => s.logout);

  // Filter chats where current user is a participant
  const userChats = useMemo(() => {
    const userParticipantChatIds = participants
      .filter((p) => p.user_id === (currentUser?.user_id || currentUser?.id))
      .map((p) => p.chat_id);
    return chats.filter((c) => userParticipantChatIds.includes(c.chat_id));
  }, [chats, participants, currentUser]);

  const getChatName = (chat) => {
    if (chat.type === 'group') return `Group Chat #${chat.chat_id}`;
    const chatParticipants = participants.filter((p) => p.chat_id === chat.chat_id);
    const otherParticipant = chatParticipants.find((p) => p.user_id !== (currentUser?.user_id || currentUser?.id));
    const otherUser = users.find((u) => (u.user_id || u.id) === otherParticipant?.user_id);
    return otherUser?.name || `Chat #${chat.chat_id}`;
  };

  const handleLogout = async () => {
    if (currentUser) {
      try {
        await updateUser(currentUser.user_id || currentUser.id, {
          is_online: false,
          last_seen: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to update online status:', err);
      }
    }
    logout();
    navigate('/');
  };

  const isUserSelected = (userId) => {
    if (!selectedChat || selectedChat.type !== 'private') return false;
    const chatParticipants = participants.filter((p) => p.chat_id === selectedChat.chat_id);
    return chatParticipants.some((p) => p.user_id === userId);
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Offline';
    const date = dayjs(lastSeen);
    const now = dayjs();
    
    const diffMinutes = now.diff(date, 'minute');
    if (diffMinutes < 1) return 'Last seen just now';
    if (diffMinutes < 60) return `Last seen ${diffMinutes}m ago`;
    
    const diffHours = now.diff(date, 'hour');
    if (diffHours < 24) return `Last seen ${diffHours}h ago`;
    
    return `Last seen on ${date.format('MMM D, YYYY')}`;
  };

  const handleUserClick = async (user) => {
    const targetUserId = user.user_id || user.id;
    const existingChat = userChats.find((c) => {
      if (c.type !== 'private') return false;
      const chatParticipants = participants.filter((p) => p.chat_id === c.chat_id);
      return chatParticipants.some((p) => p.user_id === targetUserId);
    });

    if (existingChat) {
      selectChat(existingChat);
      setTab(0);
      return;
    }

    try {
      const chat = await createChat({
        type: 'private',
        participant_ids: [currentUser.user_id || currentUser.id, targetUserId]
      });
      await fetchChats();
      await fetchParticipants();
      selectChat(chat);
      setTab(0);
    } catch (err) {
      console.error('Failed to create private chat:', err);
    }
  };

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat?')) {
      try {
        await deleteChat(chatId);
      } catch (err) {
        console.error('Failed to delete chat:', err);
      }
    }
  };

  const filteredChats = userChats.filter((c) =>
    getChatName(c).toLowerCase().includes(search.toLowerCase())
  );

  const otherUsers = users.filter((u) => (u.user_id || u.id) !== (currentUser?.user_id || currentUser?.id));
  const filteredUsers = otherUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.phone_number.includes(search)
  );

  // Compute unread count using allMessages (all messages across all chats)
  const allMessages = useAppStore((s) => s.allMessages);

  const getUnreadCount = (chatId) => {
    const chatMessageIds = allMessages
      .filter((m) => m.chat_id === chatId)
      .map((m) => m.message_id);
    return messageStatuses.filter(
      (s) => s.user_id === currentUser?.user_id && chatMessageIds.includes(s.message_id) && s.status !== 'read'
    ).length;
  };

  const getChatLastMessage = (chatId) => {
    const chatMessages = allMessages.filter((m) => m.chat_id === chatId);
    if (chatMessages.length === 0) return null;
    return chatMessages.reduce((latest, current) => 
      new Date(current.sent_at) > new Date(latest.sent_at) ? current : latest
    );
  };

  const formatLastMessageTime = (sentAt) => {
    if (!sentAt) return '';
    const date = dayjs(sentAt);
    const now = dayjs();
    if (date.isSame(now, 'day')) {
      return date.format('h:mm A');
    }
    if (date.isSame(now.subtract(1, 'day'), 'day')) {
      return 'Yesterday';
    }
    return date.format('DD/MM/YYYY');
  };

  const getMessagePreview = (msg) => {
    if (!msg) return '';
    if (msg.message_type === 'image') return '📷 Photo';
    if (msg.message_type === 'video') return '🎥 Video';
    if (msg.message_type === 'file') return '📄 Document';
    return msg.content || '';
  };

  // Periodically refresh statuses to sync real-time changes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessageStatuses();
      if (fetchAllMessages) fetchAllMessages();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchMessageStatuses, fetchAllMessages]);

  return (
    <Box sx={{ width: 340, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', height: '100%', borderRight: '1px solid', borderColor: 'divider' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, bgcolor: 'background.header', minHeight: 60 }}>
        <UserAvatar name={currentUser?.name} profilePicture={currentUser?.profile_picture} width={40} height={40} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="New Chat">
            <IconButton onClick={() => setCreateDialogOpen(true)}>
              <AddCommentIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Search */}
      <SearchBar value={search} onChange={setSearch} placeholder="Search or start new chat" />

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiTabs-indicator': { backgroundColor: 'primary.main' },
          '& .MuiTab-root': { color: 'text.secondary', '&.Mui-selected': { color: 'primary.main' }, textTransform: 'none' },
        }}
      >
        <Tab icon={<ChatIcon sx={{ fontSize: 20 }} />} label="Chats" />
        <Tab icon={<PersonIcon sx={{ fontSize: 20 }} />} label="Users" />
      </Tabs>

      {/* Tab content — flex: 1 so it fills available space and pushes footer down */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {tab === 0 ? (
          <List disablePadding>
            {filteredChats.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">No chats found</Typography>
              </Box>
            ) : (
              filteredChats.map((chat) => {
                const lastMsg = getChatLastMessage(chat.chat_id);
                return (
                  <ListItemButton
                    key={chat.chat_id}
                    selected={selectedChat?.chat_id === chat.chat_id}
                    onClick={() => selectChat(chat)}
                    sx={{
                      py: 1.5,
                      px: 2,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <ListItemAvatar>
                      <UserAvatar name={getChatName(chat)} isGroup={chat.type === 'group'} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            width: '100%',
                          }}
                        >
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 500,
                              color: 'text.primary',
                              maxWidth: 160,
                            }}
                            noWrap
                          >
                            {getChatName(chat)}
                          </Typography>

                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              minWidth: 50,
                            }}
                          >
                            {lastMsg && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: getUnreadCount(chat.chat_id) > 0
                                    ? 'primary.main'
                                    : 'text.secondary',
                                  fontSize: '0.75rem',
                                }}
                              >
                                {formatLastMessageTime(lastMsg.sent_at)}
                              </Typography>
                            )}

                            {getUnreadCount(chat.chat_id) > 0 && (
                              <Box
                                sx={{
                                  mt: 0.5,
                                  minWidth: 20,
                                  height: 20,
                                  px: 0.5,
                                  borderRadius: '50%',
                                  bgcolor: 'primary.main',
                                  color: 'primary.contrastText',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                }}
                              >
                                {getUnreadCount(chat.chat_id)}
                              </Box>
                            )}
                          </Box>
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: getUnreadCount(chat.chat_id) > 0 ? 'text.primary' : 'text.secondary' }} noWrap>
                          {getMessagePreview(lastMsg) || (chat.type === 'group' ? 'Group Chat' : 'Private Message')}
                        </Typography>
                      }
                    />
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => handleDeleteChat(e, chat.chat_id)}
                        sx={{
                          color: 'text.secondary',
                          opacity: 0.6,
                          '&:hover': { color: 'error.main', opacity: 1 },
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  </ListItemButton>
                );
              })
            )}
          </List>
        ) : loadingUsers ? (
          <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={28} sx={{ color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary">Loading users...</Typography>
          </Box>
        ) : filteredUsers.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No users found</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filteredUsers.map((user) => (
              <ListItemButton
                key={user.user_id || user.id}
                selected={isUserSelected(user.user_id || user.id)}
                onClick={() => handleUserClick(user)}
                sx={{
                  py: 1.5,
                  px: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <ListItemAvatar>
                  <UserAvatar name={user.name} profilePicture={user.profile_picture} />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary' }}>
                        {user.name}
                      </Typography>
                      {user.is_online ? (
                        <Typography variant="caption" sx={{ color: '#44b700', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#44b700' }} />
                          Online
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#8696A0' }} />
                          {formatLastSeen(user.last_seen)}
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                      {user.phone_number}
                    </Typography>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>

      {/* Bottom footer — anchored at bottom */}
      <Divider />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          bgcolor: 'background.header',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UserAvatar name={currentUser?.name} profilePicture={currentUser?.profile_picture} width={32} height={32} />
          <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }} noWrap>
            {currentUser?.name}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Settings">
            <IconButton size="small" onClick={() => setSettingsOpen(true)}>
              <SettingsIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Logout">
            <IconButton size="small" onClick={handleLogout}>
              <LogoutIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <CreateChatDialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  );
}
