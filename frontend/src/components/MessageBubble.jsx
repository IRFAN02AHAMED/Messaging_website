import { useState } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, useTheme } from '@mui/material';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DownloadIcon from '@mui/icons-material/Download';
import dayjs from 'dayjs';
import useAppStore from '../store/useAppStore';

function getFileType(fileName) {
  if (!fileName) return 'file';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(ext)) return 'audio';
  return 'file';
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function MediaAttachment({ media, isDark }) {
  const fileType = getFileType(media.file_name);

  if (fileType === 'image') {
    return (
      <Box
        component="img"
        src={media.file_url}
        alt={media.file_name}
        sx={{
          maxWidth: '100%',
          maxHeight: 280,
          borderRadius: 1,
          mb: 0.5,
          display: 'block',
          cursor: 'pointer',
          objectFit: 'cover',
        }}
        onClick={() => window.open(media.file_url, '_blank')}
      />
    );
  }

  if (fileType === 'video') {
    return (
      <Box sx={{ mb: 0.5, borderRadius: 1, overflow: 'hidden', maxWidth: '100%' }}>
        <video
          src={media.file_url}
          controls
          style={{ maxWidth: '100%', maxHeight: 280, display: 'block', borderRadius: 4 }}
        />
      </Box>
    );
  }

  if (fileType === 'audio') {
    return (
      <Box sx={{ mb: 0.5, width: '100%' }}>
        <audio src={media.file_url} controls style={{ width: '100%' }} />
      </Box>
    );
  }

  // Generic file / document
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1,
        mb: 0.5,
        borderRadius: 1,
        bgcolor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.05)',
        cursor: 'pointer',
        '&:hover': { bgcolor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.1)' },
      }}
      onClick={() => window.open(media.file_url, '_blank')}
    >
      <InsertDriveFileIcon sx={{ fontSize: 36, color: isDark ? '#8696A0' : '#667781' }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 500, color: isDark ? '#E9EDEF' : '#111B21', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {media.file_name}
        </Typography>
        <Typography variant="caption" sx={{ color: isDark ? '#8696A0' : '#667781' }}>
          {formatFileSize(media.file_size)}
        </Typography>
      </Box>
      <DownloadIcon sx={{ fontSize: 20, color: isDark ? '#8696A0' : '#667781' }} />
    </Box>
  );
}

export default function MessageBubble({ message, senderName, status }) {
  const currentUser = useAppStore((s) => s.currentUser);
  const updateMessage = useAppStore((s) => s.updateMessage);
  const deleteMessage = useAppStore((s) => s.deleteMessage);
  const mediaFiles = useAppStore((s) => s.mediaFiles);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [anchorEl, setAnchorEl] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content || '');

  // Find ALL media attached to this message (could be multiple)
  const attachedMedia = mediaFiles.filter(m => m.message_id === message.message_id);

  const isSent = message.user_id === currentUser?.user_id;
  const menuOpen = Boolean(anchorEl);
  const isMediaMessage = message.message_type === 'file' || attachedMedia.length > 0;

  const handleEdit = async () => {
    if (editText.trim() && editText !== message.content) {
      await updateMessage(message.message_id, {
        content: editText,
        edited_at: new Date().toISOString(),
      });
    }
    setEditing(false);
    setAnchorEl(null);
  };

  const handleDelete = async () => {
    await deleteMessage(message.message_id);
    setAnchorEl(null);
  };

  const getStatusIcon = () => {
    if (!isSent) return null;
    if (status === 'read') return <DoneAllIcon sx={{ fontSize: 16, color: '#53BDEB' }} />;
    if (status === 'delivered') return <DoneAllIcon sx={{ fontSize: 16, color: isDark ? '#8696A0' : '#667781' }} />;
    return <DoneIcon sx={{ fontSize: 16, color: isDark ? '#8696A0' : '#667781' }} />;
  };

  const sentBg = theme.palette.background.bubbleSent;
  const receivedBg = theme.palette.background.bubbleReceived;
  const textColor = theme.palette.text.primary;
  const metaColor = theme.palette.text.secondary;

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isSent ? 'flex-end' : 'flex-start',
        mb: 0.5,
        px: 2,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          maxWidth: '65%',
          minWidth: 80,
          bgcolor: isSent ? sentBg : receivedBg,
          borderRadius: isSent ? '8px 0 8px 8px' : '0 8px 8px 8px',
          px: 1.5,
          py: 0.8,
          boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
          '&:hover .msg-menu-btn': { opacity: 1 },
        }}
      >
        {isSent && (
          <IconButton
            className="msg-menu-btn"
            size="small"
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              position: 'absolute',
              top: 2,
              right: 2,
              opacity: 0,
              transition: 'opacity 0.2s',
              p: 0.3,
              zIndex: 1,
            }}
          >
            <ExpandMoreIcon sx={{ fontSize: 18, color: metaColor }} />
          </IconButton>
        )}

        <Menu anchorEl={anchorEl} open={menuOpen} onClose={() => setAnchorEl(null)}>
          <MenuItem onClick={() => { setEditing(true); setAnchorEl(null); }}>Edit</MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>Delete</MenuItem>
        </Menu>

        {!isSent && senderName && (
          <Typography variant="caption" sx={{ color: '#06CF9C', fontWeight: 600, display: 'block', mb: 0.2 }}>
            {senderName}
          </Typography>
        )}

        {/* Render media attachments */}
        {attachedMedia.length > 0 && attachedMedia.map((media) => (
          <MediaAttachment key={media.media_files_id} media={media} isDark={isDark} />
        ))}

        {editing ? (
          <Box component="form" onSubmit={(e) => { e.preventDefault(); handleEdit(); }}>
            <input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
              onBlur={handleEdit}
              style={{
                background: 'transparent',
                border: '1px solid #00A884',
                borderRadius: 4,
                color: textColor,
                padding: '4px 8px',
                width: '100%',
                outline: 'none',
                fontSize: '0.875rem',
              }}
            />
          </Box>
        ) : (
          /* Hide the placeholder text for media messages (e.g., "📷 Image", "📎 file.pdf") */
          (!isMediaMessage || !message.content?.match(/^(📷|📎)/)) && (
            <Typography
              variant="body2"
              sx={{ color: textColor, wordBreak: 'break-word', pr: isSent ? 2 : 0, fontSize: '0.875rem', lineHeight: 1.4 }}
            >
              {message.content}
            </Typography>
          )
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mt: 0.2 }}>
          {message.edited_at && (
            <Typography variant="caption" sx={{ color: metaColor, fontSize: '0.65rem', fontStyle: 'italic' }}>
              edited
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: metaColor, fontSize: '0.65rem' }}>
            {dayjs(message.sent_at).format('h:mm A')}
          </Typography>
          {getStatusIcon()}
        </Box>
      </Box>
    </Box>
  );
}
