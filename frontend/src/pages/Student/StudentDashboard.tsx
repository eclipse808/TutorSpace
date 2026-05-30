import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, LinearProgress, Chip,
  Stack, Button, Avatar, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Alert, CircularProgress,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import BoltIcon from '@mui/icons-material/Bolt';
import StarIcon from '@mui/icons-material/Star';
import PeopleIcon from '@mui/icons-material/People';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditIcon from '@mui/icons-material/Edit';
import UploadIcon from '@mui/icons-material/Upload';
import { useAuthStore } from '../../store/authStore';
import { Session, ProgressStats, Achievement } from '../../types';
import { PageLoader } from '../../components/Common/LoadingSpinner';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import api from '../../api/client';

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1700, 2400, 3200, 4200];
const LEVEL_NAMES = ['Новичок', 'Ученик', 'Знаток', 'Эксперт', 'Мастер', 'Гуру', 'Легенда', 'Чемпион', 'Виртуоз', 'Гений'];

function getLevelProgress(xp: number, level: number) {
  const cur = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const next = LEVEL_THRESHOLDS[level] ?? cur + 1000;
  return {
    progress: Math.min(100, Math.max(0, ((xp - cur) / (next - cur)) * 100)),
    xpInLevel: xp - cur,
    xpForLevel: next - cur,
    name: LEVEL_NAMES[level - 1] ?? 'Легенда',
  };
}

const LAVENDER = '#7C5CBF';
const LAVENDER_BG = '#F0EBF8';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [upcoming, setUpcoming] = useState<Session[]>([]);
  const [earnedAchievements, setEarnedAchievements] = useState<(Achievement & { earnedAt: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState('');
  const [studentProfileId, setStudentProfileId] = useState('');

  // Avatar dialog
  const [avatarDialog, setAvatarDialog] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoSuccess, setPhotoSuccess] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      api.get('/progress/stats').then((r) => setStats(r.data)),
      api.get('/sessions?status=SCHEDULED').then((r) => setUpcoming(r.data.slice(0, 3))),
      api.get('/progress/achievements').then((r) => setEarnedAchievements(r.data.earned || [])).catch(() => {}),
      api.get('/auth/me').then((r) => {
        setPhotoUrl(r.data.studentProfile?.photoUrl || '');
        setStudentProfileId(r.data.studentProfile?.id || '');
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const openAvatarDialog = () => {
    setPhotoFile(null);
    setPhotoPreview('');
    setPhotoError('');
    setPhotoSuccess('');
    setAvatarDialog(true);
  };

  const savePhoto = async () => {
    if (!photoFile) return;
    setPhotoSaving(true);
    setPhotoError('');
    try {
      const fd = new FormData();
      fd.append('photo', photoFile);
      const { data } = await api.post('/upload/photo', fd);
      setPhotoUrl(data.photoUrl);
      setPhotoSuccess('Фото обновлено!');
      setPhotoFile(null);
      setPhotoPreview('');
    } catch (err: any) {
      setPhotoError(err.response?.data?.error || 'Ошибка загрузки');
    } finally {
      setPhotoSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  const xp = stats?.xp ?? user?.xp ?? 0;
  const level = stats?.level ?? user?.level ?? 1;
  const li = getLevelProgress(xp, level);

  const statCards = [
    { label: 'Занятий пройдено', value: stats?.totalSessions || 0, icon: <MenuBookIcon />, color: '#F0EBF8', iconColor: LAVENDER },
    { label: 'Предстоящих', value: stats?.upcomingSessions || 0, icon: <CalendarMonthIcon />, color: '#EFF6FF', iconColor: '#3b82f6' },
    { label: 'Достижений', value: stats?.achievementsCount || 0, icon: <EmojiEventsIcon />, color: '#FEFCE8', iconColor: '#f59e0b' },
    { label: 'Средний балл', value: stats?.avgScore ? `${stats.avgScore}/10` : '—', icon: <TrendingUpIcon />, color: '#F0FDF4', iconColor: '#22c55e' },
  ];

  const quickActions = [
    { to: '/student/goals', icon: <TrackChangesIcon />, label: 'Мои цели', desc: 'Задания от репетитора + XP', color: LAVENDER },
    { to: '/student/progress', icon: <BarChartIcon />, label: 'Мой прогресс', desc: 'Радарная диаграмма компетенций', color: '#6A4DAD' },
    { to: '/tutors', icon: <PeopleIcon />, label: 'Найти репетитора', desc: 'Выбрать по предмету или рейтингу', color: '#9B83CF' },
    { to: '/student/sessions', icon: <CalendarMonthIcon />, label: 'Журнал занятий', desc: 'История и предстоящие занятия', color: '#B39DDB' },
  ];

  return (
    <Box>
      {/* Profile header */}
      <Card elevation={1} sx={{ mb: 3, background: 'linear-gradient(135deg, #7C5CBF, #6A4DAD)', color: 'white', border: 'none' }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={2.5} alignItems="center">
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <Avatar
                src={photoUrl}
                sx={{ width: 64, height: 64, bgcolor: 'rgba(255,255,255,0.25)', fontSize: 20, fontWeight: 700 }}
              >
                {!photoUrl && (user?.avatar || user?.name?.slice(0, 2).toUpperCase())}
              </Avatar>
              <IconButton
                size="small"
                onClick={openAvatarDialog}
                sx={{ position: 'absolute', bottom: -4, right: -4, bgcolor: 'white', color: LAVENDER, width: 22, height: 22, '&:hover': { bgcolor: LAVENDER_BG } }}
              >
                <EditIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight={700} sx={{ color: 'white' }}>
                {user?.name}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 0.25 }}>
                Ученик · Уровень {level} · {xp} XP
              </Typography>
            </Box>
            {studentProfileId && (
              <Button
                component={Link}
                to={`/students/${studentProfileId}`}
                size="small"
                sx={{ color: 'rgba(255,255,255,0.85)', borderColor: 'rgba(255,255,255,0.4)', border: '1px solid', borderRadius: 2, px: 1.5, py: 0.5, fontSize: 12, flexShrink: 0, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
              >
                Мой профиль
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* XP Card */}
      <Card elevation={0} sx={{ background: 'linear-gradient(135deg, #6A4DAD, #9B83CF)', color: 'white', mb: 3, border: 'none' }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ width: 48, height: 48, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <StarIcon sx={{ color: '#fbbf24', fontSize: 26 }} />
              </Box>
              <Box>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="h5" fontWeight={700}>Уровень {level}</Typography>
                  <Chip label={li.name} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 11, height: 22 }} />
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
                  <BoltIcon sx={{ fontSize: 14, color: '#fbbf24' }} />
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>{xp} XP накоплено</Typography>
                </Stack>
              </Box>
            </Stack>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>До следующего уровня</Typography>
              <Typography variant="subtitle1" fontWeight={700}>{li.xpForLevel - li.xpInLevel} XP</Typography>
            </Box>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={li.progress}
            sx={{ height: 10, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#fbbf24', borderRadius: 5 } }}
          />
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>{li.xpInLevel} XP</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>{li.xpForLevel} XP</Typography>
          </Stack>
          <Stack direction="row" spacing={3} sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <MenuBookIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>За занятие: +20 XP</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <BoltIcon sx={{ fontSize: 13, color: '#fbbf24' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Серия: +10 XP</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <TrackChangesIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Задания: +15–50 XP</Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {statCards.map((s) => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Card elevation={1}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ width: 40, height: 40, bgcolor: s.color, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, color: s.iconColor }}>
                  {s.icon}
                </Box>
                <Typography variant="h4" fontWeight={700} color="text.primary">{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Upcoming sessions */}
        <Grid item xs={12} md={6}>
          <Card elevation={1} sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CalendarMonthIcon sx={{ fontSize: 18, color: '#9B83CF' }} />
                  <Typography variant="subtitle1" fontWeight={600}>Предстоящие занятия</Typography>
                </Stack>
                <Button component={Link} to="/student/sessions" endIcon={<ArrowForwardIcon />} size="small" sx={{ color: 'text.secondary' }}>
                  Все
                </Button>
              </Stack>
              {upcoming.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <CalendarMonthIcon sx={{ fontSize: 40, opacity: 0.4, mb: 1 }} />
                  <Typography variant="body2" mb={1.5}>Нет предстоящих занятий</Typography>
                  <Button component={Link} to="/tutors" variant="contained" size="small">Найти репетитора</Button>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {upcoming.map((s) => (
                    <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#F7F5FC', borderRadius: 2 }}>
                      <Avatar src={s.tutorProfile?.photoUrl || undefined} sx={{ bgcolor: '#EEE9F8', color: LAVENDER, width: 40, height: 40, fontSize: 12, fontWeight: 700 }}>
                        {s.tutorProfile?.user.avatar || s.tutorProfile?.user.name?.slice(0, 2).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{s.tutorProfile?.user.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.subject} · {s.duration} мин</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                        <Typography variant="caption" fontWeight={600} color="text.primary" display="block">
                          {format(parseISO(s.scheduledAt), 'd MMM', { locale: ru })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{format(parseISO(s.scheduledAt), 'HH:mm')}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick actions */}
        <Grid item xs={12} md={6}>
          <Card elevation={1} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>Быстрые действия</Typography>
              <Stack spacing={1}>
                {quickActions.map((a) => (
                  <Box
                    key={a.to}
                    component={Link}
                    to={a.to}
                    sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#F7F5FC', borderRadius: 2, textDecoration: 'none', transition: 'all 0.2s', '&:hover': { bgcolor: '#EEE9F8', transform: 'translateX(2px)' } }}
                  >
                    <Box sx={{ width: 36, height: 36, bgcolor: a.color, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                      {a.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600} color="text.primary">{a.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{a.desc}</Typography>
                    </Box>
                    <ArrowForwardIcon sx={{ fontSize: 16, color: '#9B83CF' }} />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Achievements */}
      {earnedAchievements.length > 0 && (
        <Card elevation={1} sx={{ mt: 3 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <EmojiEventsIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight={600}>Мои достижения</Typography>
                <Chip label={earnedAchievements.length} size="small" sx={{ bgcolor: '#FEFCE8', color: '#d97706', fontWeight: 700 }} />
              </Stack>
              <Button component={Link} to="/student/achievements" endIcon={<ArrowForwardIcon />} size="small" sx={{ color: 'text.secondary' }}>
                Все
              </Button>
            </Stack>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {earnedAchievements.slice(0, 8).map((a) => (
                <Box
                  key={a.id}
                  component={Link}
                  to="/student/achievements"
                  title={a.description}
                  sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, p: 1.5, bgcolor: '#F0EBF8', borderRadius: 2, textDecoration: 'none', minWidth: 72, transition: 'all 0.2s', '&:hover': { bgcolor: '#EEE9F8', transform: 'translateY(-2px)' } }}
                >
                  <Typography variant="h5">{a.icon}</Typography>
                  <Typography variant="caption" fontWeight={600} color="text.primary" sx={{ textAlign: 'center', lineHeight: 1.2 }} noWrap>{a.name}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Avatar dialog */}
      <Dialog open={avatarDialog} onClose={() => setAvatarDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Изменить фото профиля</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} alignItems="center" sx={{ pt: 1 }}>
            {photoSuccess && <Alert severity="success" sx={{ width: '100%' }}>{photoSuccess}</Alert>}
            {photoError && <Alert severity="error" sx={{ width: '100%' }}>{photoError}</Alert>}
            <Avatar
              src={photoPreview || photoUrl}
              sx={{ width: 96, height: 96, bgcolor: LAVENDER_BG, color: LAVENDER, fontSize: 26, fontWeight: 700 }}
            >
              {!(photoPreview || photoUrl) && (user?.avatar || user?.name?.slice(0, 2).toUpperCase())}
            </Avatar>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              component="label"
              fullWidth
            >
              Выбрать фото
              <input
                ref={photoRef}
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); setPhotoSuccess(''); }
                }}
              />
            </Button>
            {photoFile && (
              <Typography variant="caption" color="text.secondary">
                {photoFile.name} · {(photoFile.size / 1024).toFixed(0)} КБ
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button variant="outlined" onClick={() => setAvatarDialog(false)} sx={{ flex: 1 }}>Закрыть</Button>
          <Button
            variant="contained"
            onClick={savePhoto}
            disabled={!photoFile || photoSaving}
            startIcon={photoSaving ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ flex: 1 }}
          >
            {photoSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
