import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Box, Typography, Stack, Avatar, TextField, IconButton, Paper,
  Divider, Badge, CircularProgress, InputAdornment, Tooltip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { formatDistanceToNow, parseISO, format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const LAVENDER = '#7C5CBF';
const LAVENDER_BG = '#F0EBF8';

interface ChatUser { id: string; name: string; avatar?: string | null; role: string; photoUrl?: string | null; profileId?: string | null; }
interface Message { id: string; fromUserId: string; toUserId: string; text: string; read: boolean; createdAt: string; fromUser: { id: string; name: string; avatar: string }; }
interface Conversation { partner: ChatUser; lastMessage: Message; unread: number; }

function msgDate(iso: string) {
  const d = parseISO(iso);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'вчера';
  return format(d, 'd MMM', { locale: ru });
}

function dayLabel(iso: string) {
  const d = parseISO(iso);
  if (isToday(d)) return 'Сегодня';
  if (isYesterday(d)) return 'Вчера';
  return format(d, 'd MMMM yyyy', { locale: ru });
}

const URL_RE = /^https?:\/\//;

function renderText(text: string) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    URL_RE.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer"
        style={{ color: 'inherit', textDecoration: 'underline', wordBreak: 'break-all', opacity: 0.85 }}>
        {part}
      </a>
    ) : part
  );
}

export default function ChatPage() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const withParam = searchParams.get('with');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(withParam);
  const [activePartner, setActivePartner] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [convLoading, setConvLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [showThread, setShowThread] = useState(Boolean(withParam)); // mobile
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.partner.id === activeUserId);
  // Use conversation partner if exists, otherwise the separately fetched activePartner
  const currentPartner = activeConv?.partner ?? activePartner;

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/conversations');
      setConversations(data);
    } catch {}
  }, []);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (partnerId: string) => {
    try {
      const { data } = await api.get(`/chat/messages?withUserId=${partnerId}`);
      setMessages(data);
      // Clear unread in local state
      setConversations((prev) => prev.map((c) => c.partner.id === partnerId ? { ...c, unread: 0 } : c));
    } catch {}
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations().finally(() => setConvLoading(false));
  }, [fetchConversations]);

  // Open conversation from URL param
  useEffect(() => {
    if (withParam && withParam !== activeUserId) {
      setActiveUserId(withParam);
      setShowThread(true);
    }
  }, [withParam]);

  // Load messages + partner info when active user changes
  useEffect(() => {
    if (!activeUserId) return;
    setMsgLoading(true);
    setMessages([]);
    fetchMessages(activeUserId).finally(() => setMsgLoading(false));
    // If partner not yet in conversations list, fetch their basic info
    if (!conversations.find((c) => c.partner.id === activeUserId)) {
      api.get(`/chat/user/${activeUserId}`)
        .then((r) => setActivePartner(r.data))
        .catch(() => {});
    }
  }, [activeUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll messages every 4 seconds
  useEffect(() => {
    if (!activeUserId) return;
    const id = setInterval(() => fetchMessages(activeUserId), 4000);
    return () => clearInterval(id);
  }, [activeUserId, fetchMessages]);

  // Poll conversations every 15 seconds
  useEffect(() => {
    const id = setInterval(fetchConversations, 15000);
    return () => clearInterval(id);
  }, [fetchConversations]);

  const openConversation = (partnerId: string) => {
    setActiveUserId(partnerId);
    setShowThread(true);
    setSearchParams({ with: partnerId });
  };

  const sendMessage = async () => {
    if (!text.trim() || !activeUserId || sending) return;
    setSending(true);
    const draft = text.trim();
    setText('');
    try {
      const { data } = await api.post('/chat/messages', { toUserId: activeUserId, text: draft });
      setMessages((prev) => [...prev, data]);
      // Update last message in conversations
      setConversations((prev) => prev.map((c) =>
        c.partner.id === activeUserId ? { ...c, lastMessage: data } : c
      ));
    } catch { setText(draft); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Group messages by day
  const grouped: { day: string; messages: Message[] }[] = [];
  for (const m of messages) {
    const day = m.createdAt.split('T')[0];
    if (!grouped.length || grouped[grouped.length - 1].day !== day) {
      grouped.push({ day, messages: [m] });
    } else {
      grouped[grouped.length - 1].messages.push(m);
    }
  }

  const ConvList = (
    <Box sx={{ width: { xs: '100%', md: 300 }, borderRight: { md: '1px solid #F0EBF8' }, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <Box sx={{ px: 2.5, py: 1.25, borderBottom: '1px solid #F0EBF8' }}>
        <Typography variant="h6" fontWeight={700} color="text.primary">Чат</Typography>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {convLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}><CircularProgress size={28} /></Box>
        ) : conversations.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 8, px: 2 }}>
            <ChatBubbleOutlineIcon sx={{ fontSize: 48, color: '#D5C9EE', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">Нет сообщений</Typography>
            <Typography variant="caption" color="text.disabled">Начните общение через профиль репетитора</Typography>
          </Box>
        ) : (
          conversations.map((conv) => {
            const active = conv.partner.id === activeUserId;
            return (
              <Box
                key={conv.partner.id}
                onClick={() => openConversation(conv.partner.id)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1,
                  cursor: 'pointer', bgcolor: active ? LAVENDER_BG : 'transparent',
                  borderLeft: active ? `3px solid ${LAVENDER}` : '3px solid transparent',
                  transition: 'all 0.15s', '&:hover': { bgcolor: active ? LAVENDER_BG : '#FAFAFF' },
                }}
              >
                <Badge
                  badgeContent={conv.unread || null}
                  color="error"
                  sx={{ '& .MuiBadge-badge': { fontSize: 10, minWidth: 16, height: 16 } }}
                >
                  <Avatar
                    src={conv.partner.photoUrl ?? undefined}
                    sx={{ width: 42, height: 42, bgcolor: active ? LAVENDER : '#EDE9F7', color: active ? 'white' : LAVENDER, fontSize: 14, fontWeight: 700 }}
                  >
                    {conv.partner.avatar || conv.partner.name.slice(0, 2).toUpperCase()}
                  </Avatar>
                </Badge>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                    <Typography variant="body2" fontWeight={conv.unread ? 700 : 500} color="text.primary" noWrap>
                      {conv.partner.name}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0, ml: 1 }}>
                      {msgDate(conv.lastMessage.createdAt)}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                    {conv.lastMessage.fromUserId === user?.id ? 'Вы: ' : ''}
                    {conv.lastMessage.text}
                  </Typography>
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );

  const Thread = (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {!activeUserId ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', gap: 2 }}>
          <ChatBubbleOutlineIcon sx={{ fontSize: 64, color: '#D5C9EE' }} />
          <Typography variant="body1" color="text.secondary">Выберите диалог слева</Typography>
        </Box>
      ) : (
        <>
          {/* Thread header */}
          <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #F0EBF8', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton size="small" sx={{ display: { md: 'none' }, mr: 0.5 }} onClick={() => { setShowThread(false); }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Avatar
              src={currentPartner?.photoUrl ?? undefined}
              sx={{ width: 36, height: 36, bgcolor: LAVENDER_BG, color: LAVENDER, fontSize: 12, fontWeight: 700 }}
            >
              {currentPartner?.avatar || currentPartner?.name?.slice(0, 2)?.toUpperCase() || '?'}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {currentPartner?.profileId ? (
                <Typography
                  component={Link}
                  to={currentPartner.role === 'TUTOR' ? `/tutors/${currentPartner.profileId}` : `/students/${currentPartner.profileId}`}
                  variant="body1" fontWeight={700}
                  sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { color: LAVENDER, textDecoration: 'underline' } }}
                >
                  {currentPartner.name}
                </Typography>
              ) : (
                <Typography variant="body1" fontWeight={700} color="text.primary">{currentPartner?.name}</Typography>
              )}
            </Box>
            {currentPartner && (
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                {currentPartner.role === 'TUTOR' ? 'Репетитор' : 'Ученик'}
              </Typography>
            )}
          </Box>

          {/* Messages */}
          <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}>
            {msgLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress size={24} /></Box>
            ) : messages.length === 0 ? (
              <Box sx={{ textAlign: 'center', pt: 6, color: 'text.secondary' }}>
                <Typography variant="body2">Напишите первое сообщение</Typography>
                <Typography variant="caption" color="text.disabled">Можно отправить ссылку на занятие, вопрос или уточнение</Typography>
              </Box>
            ) : (
              grouped.map(({ day, messages: dayMsgs }) => (
                <Box key={day}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 2 }}>
                    <Divider sx={{ flex: 1 }} />
                    <Typography variant="caption" color="text.disabled" sx={{ px: 1, whiteSpace: 'nowrap' }}>
                      {dayLabel(dayMsgs[0].createdAt)}
                    </Typography>
                    <Divider sx={{ flex: 1 }} />
                  </Box>
                  <Stack spacing={0.75}>
                    {dayMsgs.map((m) => {
                      const isMine = m.fromUserId === user?.id;
                      return (
                        <Box key={m.id} sx={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                          <Tooltip title={format(parseISO(m.createdAt), 'HH:mm')} placement={isMine ? 'left' : 'right'}>
                            <Paper
                              elevation={0}
                              sx={{
                                maxWidth: '70%', px: 1.75, py: 1, borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                bgcolor: isMine ? LAVENDER : '#F0EBF8',
                                color: isMine ? 'white' : 'text.primary',
                                wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                              }}
                            >
                              <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{renderText(m.text)}</Typography>
                              <Typography variant="caption" sx={{ display: 'block', mt: 0.25, opacity: 0.65, fontSize: 10, textAlign: 'right' }}>
                                {format(parseISO(m.createdAt), 'HH:mm')}
                              </Typography>
                            </Paper>
                          </Tooltip>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              ))
            )}
            <div ref={bottomRef} />
          </Box>

          {/* Input */}
          <Box sx={{ px: 2, py: 1, borderTop: '1px solid #F0EBF8', bgcolor: 'background.paper' }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Напишите сообщение... (Enter — отправить, Shift+Enter — новая строка)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              size="small"
              InputProps={{
                sx: { borderRadius: 3, pr: 0.5 },
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={sendMessage}
                      disabled={!text.trim() || sending}
                      sx={{ bgcolor: text.trim() ? LAVENDER : 'transparent', color: text.trim() ? 'white' : '#C4B5D8',
                        '&:hover': { bgcolor: text.trim() ? '#6A4DAD' : 'transparent' }, borderRadius: 2, m: 0.5, p: 0.75, transition: 'all 0.15s' }}
                    >
                      {sending ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : <SendIcon sx={{ fontSize: 18 }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.disabled', fontSize: 10, textAlign: 'center' }}>
              🔒 Переходите только по ссылкам от проверенных репетиторов. TutorSpace не несёт ответственности за внешние сайты.
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );

  return (
    <Box sx={{ height: 'calc(100vh - 140px)', display: 'flex', overflow: 'hidden', bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #F0EBF8' }}>
      {/* Mobile: show list OR thread */}
      <Box sx={{ display: { xs: showThread ? 'none' : 'flex', md: 'flex' }, width: { xs: '100%', md: 'auto' }, flexDirection: 'column' }}>
        {ConvList}
      </Box>
      <Box sx={{ display: { xs: showThread ? 'flex' : 'none', md: 'flex' }, flex: 1, flexDirection: 'column', minWidth: 0 }}>
        {Thread}
      </Box>
    </Box>
  );
}
