import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import useAppStore from '../store/useAppStore';

export default function ChatPage() {
  const navigate = useNavigate();
  const currentUser = useAppStore((s) => s.currentUser);
  const fetchChats = useAppStore((s) => s.fetchChats);
  const fetchUsers = useAppStore((s) => s.fetchUsers);
  const fetchParticipants = useAppStore((s) => s.fetchParticipants);
  const fetchMessageStatuses = useAppStore((s) => s.fetchMessageStatuses);
  const fetchAllMessages = useAppStore((s) => s.fetchAllMessages);

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }
    fetchChats();
    fetchUsers();
    fetchParticipants();
    fetchMessageStatuses();
    fetchAllMessages();
  }, [currentUser, navigate, fetchChats, fetchUsers, fetchParticipants, fetchMessageStatuses, fetchAllMessages]);

  if (!currentUser) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      <Sidebar />
      <ChatWindow />
    </Box>
  );
}
