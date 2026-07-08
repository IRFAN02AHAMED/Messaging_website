import { useState, useRef } from 'react';
import { Box, TextField, IconButton, Tooltip, Popover, CircularProgress, useTheme } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import EmojiPicker from 'emoji-picker-react';
import useAppStore from '../store/useAppStore';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function MessageInput() {
  const [text, setText] = useState('');
  const currentUser = useAppStore((s) => s.currentUser);
  const selectedChat = useAppStore((s) => s.selectedChat);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const createMediaFile = useAppStore((s) => s.createMediaFile);
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleEmojiClick = (emojiObject) => {
    setText((prev) => prev + emojiObject.emoji);
  };

  const handleSend = async () => {
    if (!text.trim() || !selectedChat || !currentUser) return;

    try {
      await sendMessage({
        chat_id: selectedChat.chat_id,
        content: text.trim(),
        message_type: 'text',
      });
      setText('');
    } catch (err) {
      console.error('Send failed:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedChat || !currentUser) return;

    setUploading(true);
    try {
      // Convert file to base64 data URL so it persists across sessions
      const dataUrl = await fileToBase64(file);
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      let contentLabel = `📎 ${file.name}`;
      if (isImage) contentLabel = '📷 Image';
      else if (isVideo) contentLabel = '🎥 Video';

      const msg = await sendMessage({
        chat_id: selectedChat.chat_id,
        content: contentLabel,
        message_type: 'file',
      });

      await createMediaFile({
        message_id: msg.message_id,
        file_url: dataUrl,
        file_name: file.name,
        file_size: file.size,
      });
    } catch (err) {
      console.error('Attach failed:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1.2,
        bgcolor: isDark ? '#1F2C33' : '#F0F2F5',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
        <EmojiEmotionsOutlinedIcon />
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        sx={{ mb: 1 }}
      >
        <EmojiPicker onEmojiClick={handleEmojiClick} theme={isDark ? 'dark' : 'light'} />
      </Popover>

      <Tooltip title="Attach file">
        <IconButton size="small" onClick={handleAttachClick} disabled={uploading}>
          {uploading ? <CircularProgress size={20} /> : <AttachFileIcon sx={{ transform: 'rotate(45deg)' }} />}
        </IconButton>
      </Tooltip>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <TextField
        fullWidth
        size="small"
        placeholder="Type a message"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: isDark ? '#2A3942' : '#FFFFFF',
            borderRadius: 2,
            fontSize: '0.9rem',
          },
        }}
      />

      <IconButton
        onClick={handleSend}
        disabled={!text.trim()}
        sx={{
          color: text.trim() ? '#00A884' : '#8696A0',
          transition: 'color 0.2s',
        }}
      >
        <SendIcon />
      </IconButton>
    </Box>
  );
}
