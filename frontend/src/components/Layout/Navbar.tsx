import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Box, Button, IconButton, Drawer, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Divider, Avatar, Chip,
  Typography, useMediaQuery, useTheme, Badge, Popover, Stack,
  CircularProgress,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SchoolIcon from '@mui/icons-material/School';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleIcon from '@mui/icons-material/People';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import ShieldIcon from '@mui/icons-material/Shield';
import LogoutIcon from '@mui/icons-material/Logout';
import BoltIcon from '@mui/icons-material/Bolt';
import RateReviewIcon from '@mui/icons-material/RateReview';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CloseIcon from '@mui/icons-material/Close';
import { useAuthStore } from '../../store/authStore';
import { Notification } from '../../types';
import api from '../../api/client';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

const LAVENDER = '#7C5CBF';
const LAVENDER_BG = '#F0EBF8';
const LAVENDER_LIGHT = '#EEE9F8';

const NOTIF_ICON: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  SUCCESS: { icon: <CheckCircleIcon sx={{ fontSize: 18 }} />, color: '#16a34a', bg: '#F0FDF4' },
  ERROR: { icon: <ErrorIcon sx={{ fontSize: 18 }} />, color: '#dc2626', bg: '#FEF2F2' },
  WARNING: { icon: <WarningIcon sx={{ fontSize: 18 }} />, color: '#d97706', bg: '#FFFBEB' },
  INFO: { icon: <InfoIcon sx={{ fontSize: 18 }} />, color: '#2563eb', bg: '#EFF6FF' },
};

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState('');
  const [chatUnread, setChatUnread] = useState(0);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) { setProfilePhoto(''); return; }
    api.get('/auth/me').then((r) => {
      setProfilePhoto(r.data.studentProfile?.photoUrl || r.data.tutorProfile?.photoUrl || '');
    }).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user || user.role === 'ADMIN') return;
    if (user.role === 'TUTOR' && user.tutorStatus !== 'APPROVED') return;
    const fetchChatUnread = async () => {
      try { const { data } = await api.get('/chat/unread'); setChatUnread(data.count); } catch {}
    };
    fetchChatUnread();
    const id = setInterval(fetchChatUnread, 30000);
    return () => clearInterval(id);
  }, [user]);

  const openNotifPanel = async (e: React.MouseEvent<HTMLElement>) => {
    setNotifAnchor(e.currentTarget);
    if (notifications.some((n) => !n.read)) {
      setNotifLoading(true);
      try {
        await api.put('/notifications/read-all');
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } finally {
        setNotifLoading(false);
      }
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotifClick = (n: Notification) => {
    setNotifAnchor(null);
    if (n.link) navigate(n.link);
  };

  const deleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {}
  };

  const handleLogout = () => { logout(); navigate('/'); setDrawerOpen(false); };
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const studentLinks = [
    { to: '/tutors', label: 'Репетиторы', icon: <PeopleIcon fontSize="small" /> },
    { to: '/student/sessions', label: 'Занятия', icon: <CalendarMonthIcon fontSize="small" /> },
    { to: '/student/goals', label: 'Мои цели', icon: <TrackChangesIcon fontSize="small" /> },
    { to: '/student/progress', label: 'Прогресс', icon: <BarChartIcon fontSize="small" /> },
  ];
  const tutorLinks = user?.tutorStatus === 'PENDING' ? [] : [
    { to: '/tutor/sessions', label: 'Журнал', icon: <CalendarMonthIcon fontSize="small" /> },
    { to: '/tutor/goals', label: 'Цели учеников', icon: <TrackChangesIcon fontSize="small" /> },
    { to: '/tutor/criteria', label: 'Критерии', icon: <MenuBookIcon fontSize="small" /> },
    { to: '/tutor/reviews', label: 'Отзывы', icon: <RateReviewIcon fontSize="small" /> },
    { to: '/tutor/achievements', label: 'Достижения', icon: <EmojiEventsIcon fontSize="small" /> },
  ];
  const adminLinks = [
    { to: '/admin', label: 'Заявки', icon: <ShieldIcon fontSize="small" /> },
    { to: '/tutors', label: 'Репетиторы', icon: <PeopleIcon fontSize="small" /> },
  ];
  const guestLinks = [{ to: '/tutors', label: 'Репетиторы', icon: <PeopleIcon fontSize="small" /> }];

  const navLinks = user?.role === 'STUDENT' ? studentLinks
    : user?.role === 'TUTOR' ? tutorLinks
    : user?.role === 'ADMIN' ? adminLinks
    : guestLinks;

  const dashboardPath = user?.role === 'STUDENT' ? '/student/dashboard'
    : user?.role === 'ADMIN' ? '/admin'
    : '/tutor/dashboard';

  const userInitials = user ? user.name.slice(0, 2).toUpperCase() : '';

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
        {/* Logo */}
        <Box component={Link} to="/"
          sx={{ display: 'flex', alignItems: 'center', gap: 1.25, textDecoration: 'none', mr: 2, flexShrink: 0 }}>
          <Box sx={{ width: 36, height: 36, bgcolor: LAVENDER, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(124,92,191,0.3)' }}>
            <SchoolIcon sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#2D1B69', display: { xs: 'none', sm: 'block' }, letterSpacing: '-0.3px' }}>
            TutorSpace
          </Typography>
        </Box>

        {/* Desktop nav */}
        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 0.25, flexGrow: 1 }}>
            {navLinks.map((l) => (
              <Button key={l.to} component={Link} to={l.to} startIcon={l.icon}
                sx={{
                  color: isActive(l.to) ? LAVENDER : '#7C6B9E',
                  bgcolor: isActive(l.to) ? LAVENDER_BG : 'transparent',
                  borderRadius: 2.5, px: 1.75, fontSize: 13, fontWeight: isActive(l.to) ? 600 : 500,
                  '&:hover': { bgcolor: LAVENDER_LIGHT },
                }}>
                {l.label}
              </Button>
            ))}
          </Box>
        )}

        {/* Desktop auth */}
        {!isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
            {user ? (
              <>
                {user.role === 'STUDENT' && user.level && (
                  <Chip
                    icon={<BoltIcon sx={{ color: '#f59e0b !important', fontSize: '13px !important' }} />}
                    label={`Ур. ${user.level}`}
                    size="small"
                    sx={{ bgcolor: LAVENDER_BG, color: LAVENDER, fontWeight: 700, fontSize: 11, height: 26 }}
                  />
                )}

                {/* Chat icon — hidden for non-approved tutors */}
                {user.role !== 'ADMIN' && !(user.role === 'TUTOR' && user.tutorStatus !== 'APPROVED') && (
                  <IconButton size="small" component={Link} to="/chat"
                    sx={{ color: chatUnread > 0 ? LAVENDER : '#9B83CF', '&:hover': { bgcolor: LAVENDER_BG } }}>
                    <Badge badgeContent={chatUnread || null} color="error" max={9}
                      sx={{ '& .MuiBadge-badge': { fontSize: 10, minWidth: 16, height: 16, top: 2, right: 2 } }}>
                      <ChatBubbleOutlineIcon fontSize="small" />
                    </Badge>
                  </IconButton>
                )}

                {/* Notification bell */}
                <IconButton size="small" onClick={openNotifPanel}
                  sx={{ color: unreadCount > 0 ? LAVENDER : '#9B83CF', '&:hover': { bgcolor: LAVENDER_BG } }}>
                  <Badge badgeContent={unreadCount} color="error" max={9}
                    sx={{ '& .MuiBadge-badge': { fontSize: 10, minWidth: 16, height: 16, top: 2, right: 2 } }}>
                    <NotificationsIcon fontSize="small" />
                  </Badge>
                </IconButton>

                <Box component={Link} to={dashboardPath}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', px: 1, py: 0.5, borderRadius: 2, '&:hover': { bgcolor: LAVENDER_LIGHT, opacity: 0.9 } }}>
                  <Avatar src={profilePhoto || undefined} sx={{ width: 30, height: 30, bgcolor: LAVENDER, color: 'white', fontSize: 11, fontWeight: 700 }}>
                    {userInitials}
                  </Avatar>
                  <Typography variant="body2" sx={{ color: '#2D1B69', fontWeight: 600, fontSize: 13 }}>
                    {user.name.split(' ')[0]}
                  </Typography>
                </Box>

                <IconButton onClick={handleLogout} size="small"
                  sx={{ color: '#9B83CF', '&:hover': { color: '#dc2626', bgcolor: '#FEF2F2' } }}>
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </>
            ) : (
              <>
                <Button component={Link} to="/login" sx={{ color: LAVENDER, fontWeight: 500 }}>Войти</Button>
                <Button component={Link} to="/register" variant="contained" size="small">
                  Зарегистрироваться
                </Button>
              </>
            )}
          </Box>
        )}

        {/* Mobile */}
        {isMobile && (
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {user && user.role !== 'ADMIN' && !(user.role === 'TUTOR' && user.tutorStatus !== 'APPROVED') && (
              <IconButton size="small" component={Link} to="/chat"
                sx={{ color: chatUnread > 0 ? LAVENDER : '#9B83CF', '&:hover': { bgcolor: LAVENDER_BG } }}>
                <Badge badgeContent={chatUnread || null} color="error" max={9}
                  sx={{ '& .MuiBadge-badge': { fontSize: 10, minWidth: 16, height: 16, top: 2, right: 2 } }}>
                  <ChatBubbleOutlineIcon fontSize="small" />
                </Badge>
              </IconButton>
            )}
            {user && (
              <IconButton size="small" onClick={openNotifPanel}
                sx={{ color: unreadCount > 0 ? LAVENDER : '#9B83CF' }}>
                <Badge badgeContent={unreadCount} color="error" max={9}>
                  <NotificationsIcon fontSize="small" />
                </Badge>
              </IconButton>
            )}
            <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: LAVENDER }}>
              <MenuIcon />
            </IconButton>
          </Box>
        )}
      </Toolbar>

      {/* Notifications popover */}
      <Popover
        open={Boolean(notifAnchor)}
        anchorEl={notifAnchor}
        onClose={() => setNotifAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: { width: 360, maxHeight: 480, borderRadius: 3, mt: 0.5, overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(124,92,191,0.15), 0 2px 8px rgba(0,0,0,0.08)' },
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid #F0EBF8' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" fontWeight={700} color="text.primary">Уведомления</Typography>
            {unreadCount > 0 && (
              <Button size="small" startIcon={markingAll ? <CircularProgress size={12} /> : <DoneAllIcon sx={{ fontSize: 14 }} />}
                onClick={markAllRead} disabled={markingAll}
                sx={{ color: LAVENDER, fontSize: 12, p: '2px 8px' }}>
                Прочитать все
              </Button>
            )}
          </Stack>
        </Box>

        <Box sx={{ overflowY: 'auto', maxHeight: 390 }}>
          {notifLoading && notifications.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
              <NotificationsIcon sx={{ fontSize: 40, color: '#D5C9EE', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">Нет уведомлений</Typography>
            </Box>
          ) : (
            notifications.slice(0, 20).map((n, i) => {
              const cfg = NOTIF_ICON[n.type] || NOTIF_ICON.INFO;
              return (
                <Box
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  sx={{
                    display: 'flex', gap: 1.5, px: 2, py: 1.5, cursor: n.link ? 'pointer' : 'default',
                    bgcolor: n.read ? 'transparent' : '#FAFAFF',
                    borderBottom: i < notifications.length - 1 ? '1px solid #F7F5FC' : 'none',
                    transition: 'background 0.15s',
                    '&:hover': n.link ? { bgcolor: LAVENDER_LIGHT } : {},
                  }}
                >
                  <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25 }}>
                    {cfg.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={0.5}>
                      <Typography variant="body2" fontWeight={n.read ? 500 : 700} color="text.primary" sx={{ lineHeight: 1.3 }}>
                        {n.title}
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={0.5} flexShrink={0}>
                        {!n.read && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: LAVENDER, mt: 0.5 }} />}
                        <IconButton
                          size="small"
                          onClick={(e) => deleteNotification(e, n.id)}
                          sx={{ width: 20, height: 20, color: '#C4B5D8', '&:hover': { color: '#dc2626', bgcolor: '#FEF2F2' } }}
                        >
                          <CloseIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                      </Stack>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.4 }}>
                      {n.message}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#B39DDB', display: 'block', mt: 0.5 }}>
                      {formatDistanceToNow(parseISO(n.createdAt), { addSuffix: true, locale: ru })}
                    </Typography>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
      </Popover>

      {/* Mobile Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 288, bgcolor: 'background.default' } }}>
        <Box sx={{ p: 2 }}>
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, background: 'linear-gradient(135deg, #7C5CBF, #9B83CF)', borderRadius: 3, mb: 2 }}>
              <Avatar src={profilePhoto || undefined} sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 700, width: 40, height: 40 }}>
                {userInitials}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} sx={{ color: 'white' }} noWrap>{user.name}</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }} noWrap>{user.email}</Typography>
              </Box>
              {user.role === 'STUDENT' && user.level && (
                <Chip label={`Ур.${user.level}`} size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700, fontSize: 11 }} />
              )}
            </Box>
          )}

          <List dense disablePadding>
            {navLinks.map((l) => (
              <ListItem key={l.to} disablePadding>
                <ListItemButton component={Link} to={l.to} onClick={() => setDrawerOpen(false)}
                  selected={isActive(l.to)}
                  sx={{ borderRadius: 2, mb: 0.5, '&.Mui-selected': { bgcolor: LAVENDER_BG, color: LAVENDER }, '&.Mui-selected .MuiListItemIcon-root': { color: LAVENDER } }}>
                  <ListItemIcon sx={{ minWidth: 36, color: '#9B83CF' }}>{l.icon}</ListItemIcon>
                  <ListItemText primary={l.label} primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          {user ? (
            <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, color: 'error.main' }}>
              <ListItemIcon sx={{ minWidth: 36, color: 'error.main' }}><LogoutIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Выйти" primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
            </ListItemButton>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button fullWidth variant="outlined" color="primary" component={Link} to="/login" onClick={() => setDrawerOpen(false)}>Войти</Button>
              <Button fullWidth variant="contained" color="primary" component={Link} to="/register" onClick={() => setDrawerOpen(false)}>Зарегистрироваться</Button>
            </Box>
          )}
        </Box>
      </Drawer>
    </AppBar>
  );
}
