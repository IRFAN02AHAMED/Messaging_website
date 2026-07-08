import { create } from 'zustand';
import * as usersApi from '../api/users';
import * as chatsApi from '../api/chats';
import * as participantsApi from '../api/participants';
import * as messagesApi from '../api/messages';
import * as messageStatusApi from '../api/messageStatus';
import * as mediaFilesApi from '../api/mediaFiles';
import * as authApi from '../api/auth';

const useAppStore = create((set, get) => ({
  // --- State ---
  token: localStorage.getItem('token') || null,
  currentUser: JSON.parse(localStorage.getItem('user')) || null,
  user: JSON.parse(localStorage.getItem('user')) || null,
  isAuthenticated: !!localStorage.getItem('token'),
  theme: localStorage.getItem('theme') || 'dark',
  users: [],
  chats: [],
  selectedChat: null,
  messages: [],
  allMessages: [],  // All messages across all chats (for unread count)
  participants: [],
  messageStatuses: [],
  mediaFiles: [],
  loadingUsers: false,
  loadingChats: false,
  loadingMessages: false,
  ws: null,

  // --- WebSocket Actions ---
  connectWebSocket: () => {
    const state = get();
    if (state.ws) {
      state.ws.close();
    }

    const token = state.token;
    if (!token) return;

    const wsUrl = `ws://${window.location.hostname}:8000/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { event: eventName, data } = payload;

        if (eventName === 'new_message') {
          // Play notification sound if not active chat and not muted
          const currentStoreState = get();
          const isCurrentChat = currentStoreState.selectedChat?.chat_id === data.chat_id;
          const isSender = data.user_id === currentStoreState.currentUser?.user_id;
          
          if (!isSender && (!isCurrentChat || document.hidden)) {
            const isMuted = currentStoreState.isChatMuted(data.chat_id);
            if (!isMuted) {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-500.wav');
              audio.play().catch(() => {});
            }
          }

          set((state) => {
            const allMessages = [...state.allMessages];
            if (!allMessages.some(m => m.message_id === data.message_id)) {
              allMessages.push(data);
            }

            let messages = [...state.messages];
            if (isCurrentChat) {
              if (!messages.some(m => m.message_id === data.message_id)) {
                messages.push(data);
                messages.sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
              }
            }

            return { allMessages, messages };
          });
          
          // Refresh message statuses to detect delivered transitions and get the status record for the new message
          await get().fetchMessageStatuses();

          // Mark chat as read immediately if it's the active chat
          if (isCurrentChat && !isSender) {
            await get().markChatAsRead(data.chat_id);
          }

        } else if (eventName === 'status_update') {
          set((state) => {
            const exists = state.messageStatuses.some(
              (s) => s.message_id === data.message_id && s.user_id === data.user_id
            );

            let messageStatuses = [...state.messageStatuses];
            if (exists) {
              messageStatuses = messageStatuses.map((s) =>
                s.message_id === data.message_id && s.user_id === data.user_id
                  ? { ...s, status: data.status, status_updated_at: new Date().toISOString() }
                  : s
              );
            } else {
              messageStatuses.push({
                message_status_id: Math.random(),
                message_id: data.message_id,
                user_id: data.user_id,
                status: data.status,
                status_updated_at: new Date().toISOString()
              });
            }
            return { messageStatuses };
          });

        } else if (eventName === 'user_online') {
          set((state) => ({
            users: state.users.map((u) =>
              u.user_id === data.user_id ? { ...u, is_online: data.is_online, last_seen: data.last_seen || u.last_seen } : u
            )
          }));
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      set({ ws: null });
      // Auto-reconnect if user is still logged in
      setTimeout(() => {
        if (get().isAuthenticated) {
          get().connectWebSocket();
        }
      }, 3000);
    };

    set({ ws });
  },

  disconnectWebSocket: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
      set({ ws: null });
    }
  },

  // --- Auth Actions ---
  setTheme: async (newTheme) => {
    localStorage.setItem('theme', newTheme);
    set({ theme: newTheme });
    const { currentUser, updateUser } = get();
    if (currentUser) {
      try {
        await updateUser(currentUser.id || currentUser.user_id, { theme: newTheme });
      } catch (err) {
        console.error('Failed to update theme in database:', err);
      }
    }
  },

  login: async (credentials) => {
    try {
      const response = await authApi.login(credentials);
      const { access_token, user } = response;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      const userTheme = user.theme || user.theme_preference || 'dark';
      localStorage.setItem('theme', userTheme);
      set({
        token: access_token,
        currentUser: user,
        user: user,
        isAuthenticated: true,
        theme: userTheme,
      });
      get().connectWebSocket();
      return user;
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    }
  },

  register: async (userData) => {
    try {
      const user = await authApi.register(userData);
      return user;
    } catch (err) {
      console.error('Registration failed:', err);
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    get().disconnectWebSocket();
    set({
      token: null,
      currentUser: null,
      user: null,
      isAuthenticated: false,
      selectedChat: null,
      messages: [],
      allMessages: [],
    });
  },

  // --- User Actions ---
  setCurrentUser: (user) => {
    set({ currentUser: user, user: user });
    if (user) {
      const userTheme = user.theme || user.theme_preference || 'dark';
      localStorage.setItem('theme', userTheme);
      set({ theme: userTheme });
      get().connectWebSocket();
    } else {
      get().disconnectWebSocket();
    }
  },

  fetchUsers: async () => {
    set({ loadingUsers: true });
    try {
      const data = await usersApi.getUsers();
      set({ users: Array.isArray(data) ? data : [] });
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      set({ loadingUsers: false });
    }
  },

  createUser: async (userData) => {
    try {
      const user = await usersApi.createUser(userData);
      set((state) => ({ users: [...state.users, user] }));
      return user;
    } catch (err) {
      console.error('Failed to create user:', err);
      throw err;
    }
  },

  updateUser: async (id, userData) => {
    try {
      const updated = await usersApi.updateUser(id, userData);
      set((state) => {
        const nextUser = { ...state.currentUser, ...updated };
        localStorage.setItem('user', JSON.stringify(nextUser));
        
        const nextState = {
          users: state.users.map((u) => (u.user_id === id || u.id === id ? { ...u, ...updated } : u)),
          currentUser: nextUser,
          user: nextUser,
        };

        if (userData.theme) {
          localStorage.setItem('theme', userData.theme);
          nextState.theme = userData.theme;
        }

        return nextState;
      });
      return updated;
    } catch (err) {
      console.error('Failed to update user:', err);
      throw err;
    }
  },

  deleteUser: async (id) => {
    try {
      await usersApi.deleteUser(id);
      set((state) => ({
        users: state.users.filter((u) => u.user_id !== id),
      }));
    } catch (err) {
      console.error('Failed to delete user:', err);
      throw err;
    }
  },

  // --- Chat Actions ---
  fetchChats: async () => {
    set({ loadingChats: true });
    try {
      const data = await chatsApi.getChats();
      set({ chats: Array.isArray(data) ? data : [] });
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    } finally {
      set({ loadingChats: false });
    }
  },

  createChat: async (chatData) => {
    try {
      const chat = await chatsApi.createChat(chatData);
      set((state) => ({ chats: [...state.chats, chat] }));
      return chat;
    } catch (err) {
      console.error('Failed to create chat:', err);
      throw err;
    }
  },

  updateChat: async (id, chatData) => {
    try {
      const updated = await chatsApi.updateChat(id, chatData);
      set((state) => ({
        chats: state.chats.map((c) => (c.chat_id === id ? updated : c)),
        selectedChat: state.selectedChat?.chat_id === id ? updated : state.selectedChat,
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update chat:', err);
      throw err;
    }
  },

  deleteChat: async (id) => {
    try {
      await chatsApi.deleteChat(id);
      set((state) => ({
        chats: state.chats.filter((c) => c.chat_id !== id),
        selectedChat: state.selectedChat?.chat_id === id ? null : state.selectedChat,
        messages: state.selectedChat?.chat_id === id ? [] : state.messages,
      }));
    } catch (err) {
      console.error('Failed to delete chat:', err);
      throw err;
    }
  },

  selectChat: async (chat) => {
    set({ selectedChat: chat, messages: [] });
    if (chat) {
      await get().fetchMessages(chat.chat_id);
      await get().fetchParticipants();
      await get().fetchMessageStatuses();
      await get().fetchMediaFiles();
      // Mark messages as read when opening the chat
      await get().markChatAsRead(chat.chat_id);
    }
  },

  // --- Message Actions ---
  fetchMessages: async (chatId) => {
    set({ loadingMessages: true });
    try {
      const data = await messagesApi.getMessages(0, 1000);
      const filtered = (Array.isArray(data) ? data : []).filter(
        (m) => m.chat_id === chatId && !m.deleted_at
      );
      filtered.sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));

      // Filter out messages cleared by the current user
      const participant = get().participants.find(
        (p) => p.chat_id === chatId && p.user_id === get().currentUser?.user_id
      );
      const finalMessages = participant?.cleared_at
        ? filtered.filter((m) => new Date(m.sent_at) > new Date(participant.cleared_at))
        : filtered;

      set({ messages: finalMessages });
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      set({ loadingMessages: false });
    }
  },

  // Fetch ALL messages across all chats (for sidebar unread counts)
  fetchAllMessages: async () => {
    try {
      const data = await messagesApi.getMessages(0, 1000);
      const activeMsgs = Array.isArray(data) ? data.filter(m => !m.deleted_at) : [];
      
      // Filter out cleared messages across all chats
      const finalMsgs = activeMsgs.filter((m) => {
        const participant = get().participants.find(
          (p) => p.chat_id === m.chat_id && p.user_id === get().currentUser?.user_id
        );
        if (participant?.cleared_at && new Date(m.sent_at) <= new Date(participant.cleared_at)) {
          return false;
        }
        return true;
      });

      const updates = { allMessages: finalMsgs };
      
      // Keep selected chat messages in sync in real-time
      const selected = get().selectedChat;
      if (selected) {
        const filtered = finalMsgs.filter(m => m.chat_id === selected.chat_id);
        filtered.sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
        updates.messages = filtered;
      }
      
      set(updates);
    } catch (err) {
      console.error('Failed to fetch all messages:', err);
    }
  },

  sendMessage: async (messageData) => {
    try {
      const message = await messagesApi.sendMessage(messageData);
      set((state) => ({
        messages: [...state.messages, message],
        allMessages: [...state.allMessages, message],
      }));
      // Refresh statuses after sending (backend auto-creates status records)
      await get().fetchMessageStatuses();
      return message;
    } catch (err) {
      console.error('Failed to send message:', err);
      throw err;
    }
  },

  updateMessage: async (id, messageData) => {
    try {
      const updated = await messagesApi.updateMessage(id, messageData);
      set((state) => ({
        messages: state.messages.map((m) => (m.message_id === id ? updated : m)),
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update message:', err);
      throw err;
    }
  },

  deleteMessage: async (id) => {
    try {
      await messagesApi.deleteMessage(id);
      set((state) => ({
        messages: state.messages.filter((m) => m.message_id !== id),
        allMessages: state.allMessages.filter((m) => m.message_id !== id),
      }));
    } catch (err) {
      console.error('Failed to delete message:', err);
      throw err;
    }
  },

  // --- Participant Actions ---
  fetchParticipants: async () => {
    try {
      const data = await participantsApi.getParticipants(0, 1000);
      set({ participants: Array.isArray(data) ? data : [] });
    } catch (err) {
      console.error('Failed to fetch participants:', err);
    }
  },

  addParticipant: async (participantData) => {
    try {
      const participant = await participantsApi.addParticipant(participantData);
      set((state) => ({ participants: [...state.participants, participant] }));
      return participant;
    } catch (err) {
      console.error('Failed to add participant:', err);
      throw err;
    }
  },

  removeParticipant: async (id) => {
    try {
      await participantsApi.removeParticipant(id);
      set((state) => ({
        participants: state.participants.filter((p) => p.chat_participant_id !== id),
      }));
    } catch (err) {
      console.error('Failed to remove participant:', err);
      throw err;
    }
  },

  // --- Message Status Actions ---
  fetchMessageStatuses: async () => {
    try {
      const data = await messageStatusApi.getMessageStatuses(0, 1000);
      set({ messageStatuses: Array.isArray(data) ? data : [] });
      await get().markIncomingMessagesAsDelivered();
    } catch (err) {
      console.error('Failed to fetch message statuses:', err);
    }
  },

  markIncomingMessagesAsDelivered: async () => {
    const state = get();
    const { currentUser, messageStatuses } = state;
    if (!currentUser) return;

    // Find statuses for current user that are currently 'sent'
    const sentStatuses = messageStatuses.filter(s => 
      s.user_id === currentUser.user_id && 
      s.status === 'sent'
    );

    if (sentStatuses.length === 0) return;

    // Batch update them to 'delivered'
    const updatePromises = sentStatuses.map(status =>
      state.updateMessageStatus(status.message_status_id, { status: 'delivered' })
        .catch(err => console.error('Error marking status as delivered', err))
    );

    await Promise.all(updatePromises);
  },

  createMessageStatus: async (statusData) => {
    try {
      const status = await messageStatusApi.createMessageStatus(statusData);
      set((state) => ({ messageStatuses: [...state.messageStatuses, status] }));
      return status;
    } catch (err) {
      console.error('Failed to create message status:', err);
      throw err;
    }
  },

  updateMessageStatus: async (id, statusData) => {
    try {
      const updated = await messageStatusApi.updateMessageStatus(id, statusData);
      set((state) => ({
        messageStatuses: state.messageStatuses.map((s) =>
          s.message_status_id === id ? updated : s
        ),
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update message status:', err);
      throw err;
    }
  },

  markChatAsRead: async (chatId) => {
    const state = get();
    const { currentUser, messageStatuses, messages } = state;
    if (!currentUser) return;

    const chatMessageIds = messages.filter(m => m.chat_id === chatId).map(m => m.message_id);
    
    const unreadStatuses = messageStatuses.filter(s => 
      s.user_id === currentUser.user_id && 
      s.status !== 'read' &&
      chatMessageIds.includes(s.message_id)
    );

    // Batch update all unread statuses to 'read'
    const updatePromises = unreadStatuses.map(status =>
      state.updateMessageStatus(status.message_status_id, { status: 'read' })
        .catch(err => console.error('Error marking status as read', err))
    );

    await Promise.all(updatePromises);
  },

  // --- Media File Actions ---
  fetchMediaFiles: async () => {
    try {
      const data = await mediaFilesApi.getMediaFiles(0, 1000);
      set({ mediaFiles: Array.isArray(data) ? data : [] });
    } catch (err) {
      console.error('Failed to fetch media files:', err);
    }
  },

  createMediaFile: async (mediaData) => {
    try {
      const media = await mediaFilesApi.createMediaFile(mediaData);
      set((state) => ({ mediaFiles: [...state.mediaFiles, media] }));
      return media;
    } catch (err) {
      console.error('Failed to create media file:', err);
      throw err;
    }
  },

  muteChat: async (chatId, mutedUntil) => {
    try {
      const state = get();
      const participant = state.participants.find(
        (p) => p.chat_id === chatId && p.user_id === state.currentUser?.user_id
      );
      if (!participant) return;

      await chatsApi.muteChat(chatId, {
        muted_until: mutedUntil
      });

      set((state) => ({
        participants: state.participants.map((p) =>
          p.chat_participant_id === participant.chat_participant_id
            ? { ...p, muted_until: mutedUntil }
            : p
        )
      }));
    } catch (err) {
      console.error('Failed to mute chat:', err);
      throw err;
    }
  },

  clearChat: async (chatId) => {
    try {
      const state = get();
      const participant = state.participants.find(
        (p) => p.chat_id === chatId && p.user_id === state.currentUser?.user_id
      );
      if (!participant) return;

      const clearedAt = new Date().toISOString();
      await chatsApi.clearChat(chatId);

      set((state) => ({
        participants: state.participants.map((p) =>
          p.chat_participant_id === participant.chat_participant_id
            ? { ...p, cleared_at: clearedAt }
            : p
        ),
        messages: state.messages.filter((m) => new Date(m.sent_at) > new Date(clearedAt)),
        allMessages: state.allMessages.filter(
          (m) => m.chat_id !== chatId || new Date(m.sent_at) > new Date(clearedAt)
        )
      }));
    } catch (err) {
      console.error('Failed to clear chat:', err);
      throw err;
    }
  },

  isChatMuted: (chatId) => {
    const state = get();
    const participant = state.participants.find(
      (p) => p.chat_id === chatId && p.user_id === state.currentUser?.user_id
    );
    if (!participant?.muted_until) return false;
    return new Date(participant.muted_until) > new Date();
  },
}));

export default useAppStore;
