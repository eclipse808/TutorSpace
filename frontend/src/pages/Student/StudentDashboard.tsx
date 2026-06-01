import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, LinearProgress, Chip,
  Stack, Button, Avatar, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Alert, CircularProgress, Tooltip,
  Select, MenuItem, FormControl, InputLabel, TextField, InputAdornment,
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
import PaletteIcon from '@mui/icons-material/Palette';
import PersonIcon from '@mui/icons-material/Person';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuthStore } from '../../store/authStore';
import { Session, ProgressStats, Achievement } from '../../types';
import WelcomeGuide from '../../components/Student/WelcomeGuide';
import { PageLoader } from '../../components/Common/LoadingSpinner';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import api from '../../api/client';
import {
  LEVEL_REWARDS, getLevelReward, getNextLevelReward,
  getLevelProgress, getAvatarFrameSx, effectiveFrame, effectiveBanner,
} from '../../utils/levelRewards';

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
  const [equippedFrame, setEquippedFrame] = useState<number | null>(null);
  const [equippedBanner, setEquippedBanner] = useState<number | null>(null);
  const [equipSaving, setEquipSaving] = useState(false);

  // Profile info state
  const [grade, setGrade] = useState('');
  const [learningGoal, setLearningGoal] = useState('');

  // Dialogs
  const [avatarDialog, setAvatarDialog] = useState(false);
  const [equipDialog, setEquipDialog] = useState(false);
  const [profileDialog, setProfileDialog] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoSuccess, setPhotoSuccess] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);

  const [passwordDialog, setPasswordDialog] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  const GRADE_OPTIONS = [
    '1 класс', '2 класс', '3 класс', '4 класс', '5 класс', '6 класс',
    '7 класс', '8 класс', '9 класс', '10 класс', '11 класс',
    'Студент вуза', 'Взрослый / не в школе',
  ];
  const GOAL_OPTIONS = [
    'Подготовка к ОГЭ', 'Подготовка к ЕГЭ', 'Подготовка к олимпиаде',
    'Изучение иностранного языка', 'Помощь по школьным предметам',
    'Профессиональное развитие', 'Саморазвитие',
  ];

  useEffect(() => {
    Promise.all([
      api.get('/progress/stats').then((r) => setStats(r.data)),
      api.get('/sessions?status=SCHEDULED').then((r) => setUpcoming(r.data.slice(0, 3))),
      api.get('/progress/achievements').then((r) => setEarnedAchievements(r.data.earned || [])).catch(() => {}),
      api.get('/auth/me').then((r) => {
        const sp = r.data.studentProfile;
        setPhotoUrl(sp?.photoUrl || '');
        setStudentProfileId(sp?.id || '');
        setEquippedFrame(sp?.equippedFrame ?? null);
        setEquippedBanner(sp?.equippedBanner ?? null);
        setGrade(sp?.grade || '');
        setLearningGoal(sp?.learningGoal || '');
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const openAvatarDialog = () => {
    setPhotoFile(null); setPhotoPreview(''); setPhotoError(''); setPhotoSuccess('');
    setAvatarDialog(true);
  };

  const openProfileDialog = () => {
    setProfileError(''); setProfileSuccess(false);
    setProfileDialog(true);
  };

  const saveProfile = async () => {
    setProfileSaving(true); setProfileError('');
    try {
      await api.put('/students/me/profile', { grade: grade || null, learningGoal: learningGoal || null });
      setProfileSuccess(true);
      setTimeout(() => setProfileDialog(false), 1000);
    } catch (err: any) {
      setProfileError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setProfileSaving(false);
    }
  };

  const savePhoto = async () => {
    if (!photoFile) return;
    setPhotoSaving(true); setPhotoError('');
    try {
      const fd = new FormData();
      fd.append('photo', photoFile);
      const { data } = await api.post('/upload/photo', fd);
      setPhotoUrl(data.photoUrl);
      setPhotoSuccess('Фото обновлено!');
      setPhotoFile(null); setPhotoPreview('');
    } catch (err: any) {
      setPhotoError(err.response?.data?.error || 'Ошибка загрузки');
    } finally {
      setPhotoSaving(false);
    }
  };

  // Optimistic update — updates locally immediately, then syncs to server
  const saveEquipment = async (newFrame: number | null, newBanner: number | null) => {
    setEquippedFrame(newFrame);
    setEquippedBanner(newBanner);
    setEquipSaving(true);
    try {
      await api.put('/students/me/equipment', { equippedFrame: newFrame, equippedBanner: newBanner });
    } catch {
      // Silently ignore — visual change is already applied locally
    } finally {
      setEquipSaving(false);
    }
  };

  const openPasswordDialog = () => {
    setPwForm({ current: '', next: '', confirm: '' });
    setPwError(''); setPwSuccess(false);
    setShowPw({ current: false, next: false, confirm: false });
    setPasswordDialog(true);
  };

  const savePassword = async () => {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) { setPwError('Заполните все поля'); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError('Новые пароли не совпадают'); return; }
    if (pwForm.next.length < 6) { setPwError('Новый пароль должен быть не менее 6 символов'); return; }
    setPwSaving(true); setPwError('');
    try {
      await api.put('/auth/password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwSuccess(true);
      setTimeout(() => setPasswordDialog(false), 1500);
    } catch (err: any) {
      setPwError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  const xp = stats?.xp ?? user?.xp ?? 0;
  const level = stats?.level ?? user?.level ?? 1;
  const li = getLevelProgress(xp, level);

  const fLevel = effectiveFrame(level, equippedFrame);
  const bLevel = effectiveBanner(level, equippedBanner);
  const bannerReward = getLevelReward(bLevel);
  const nextReward = getNextLevelReward(level);
  const frameSx = getAvatarFrameSx(fLevel);

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
      {/* ── Profile header ─────────────────────────────────────────────── */}
      <Card elevation={1} sx={{ mb: 3, background: bannerReward.bannerGradient, color: 'white', border: 'none', position: 'relative' }}>
        {/* Help button — tucked in top-right corner, separate from action buttons */}
        <Tooltip title="Как пользоваться платформой" placement="left">
          <IconButton size="small"
            onClick={() => window.dispatchEvent(new Event('ts:open-guide'))}
            sx={{ position: 'absolute', top: 10, right: 10, color: 'rgba(255,255,255,0.45)', '&:hover': { color: 'rgba(255,255,255,0.9)', bgcolor: 'rgba(255,255,255,0.12)' } }}>
            <HelpOutlineIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ sm: 'center' }}>
            {/* Avatar */}
            <Box sx={{ position: 'relative', flexShrink: 0, alignSelf: 'center' }}>
              <Avatar src={photoUrl} sx={{ width: 72, height: 72, bgcolor: 'rgba(255,255,255,0.25)', fontSize: 22, fontWeight: 700, ...frameSx }}>
                {!photoUrl && (user?.avatar || user?.name?.slice(0, 2).toUpperCase())}
              </Avatar>
              <IconButton
                size="small"
                onClick={openAvatarDialog}
                sx={{ position: 'absolute', bottom: -2, right: -2, bgcolor: 'white', color: LAVENDER, width: 22, height: 22, '&:hover': { bgcolor: LAVENDER_BG } }}
              >
                <EditIcon sx={{ fontSize: 11 }} />
              </IconButton>
            </Box>

            {/* Name + level */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                <Typography variant="h5" fontWeight={700} sx={{ color: 'white' }}>{user?.name}</Typography>
                {bannerReward.title && (
                  <Chip label={bannerReward.title} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 700, fontSize: 11, height: 20 }} />
                )}
              </Stack>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 0.25 }}>
                Уровень {level} · {xp} XP
              </Typography>
            </Box>

            {/* Action buttons — logical order: edit info → appearance → view public */}
            <Stack direction="row" spacing={1} flexShrink={0} flexWrap="wrap" justifyContent="flex-end">
              <Button
                size="small"
                startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                onClick={openProfileDialog}
                sx={{ color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 2, px: 1.5, fontSize: 12, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
              >
                Анкета
              </Button>
              <Button
                size="small"
                startIcon={<LockOpenIcon sx={{ fontSize: 14 }} />}
                onClick={openPasswordDialog}
                sx={{ color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 2, px: 1.5, fontSize: 12, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
              >
                Пароль
              </Button>
              <Button
                size="small"
                startIcon={<PaletteIcon sx={{ fontSize: 14 }} />}
                onClick={() => setEquipDialog(true)}
                sx={{ color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 2, px: 1.5, fontSize: 12, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
              >
                Оформление
              </Button>
              {studentProfileId && (
                <Button
                  component={Link}
                  to={`/students/${studentProfileId}`}
                  size="small"
                  startIcon={<PersonIcon sx={{ fontSize: 14 }} />}
                  sx={{ color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 2, px: 1.5, fontSize: 12, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
                >
                  Мой профиль
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* ── XP card + Future rewards ────────────────────────────────────── */}
      <Card elevation={0} sx={{ background: bannerReward.bannerGradient, color: 'white', mb: 3, border: 'none', opacity: 0.92 }}>
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
                <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5}>
                  <BoltIcon sx={{ fontSize: 14, color: '#fbbf24' }} />
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>{xp} XP накоплено</Typography>
                </Stack>
              </Box>
            </Stack>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>До следующего уровня</Typography>
              <Typography variant="subtitle1" fontWeight={700}>{li.xpToNext} XP</Typography>
            </Box>
          </Stack>

          <LinearProgress
            variant="determinate"
            value={li.progress}
            sx={{ height: 10, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#fbbf24', borderRadius: 5 } }}
          />
          <Stack direction="row" justifyContent="space-between" mt={0.5} mb={2}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>{li.xpInLevel} XP</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>{li.xpForLevel} XP</Typography>
          </Stack>

          {/* XP sources */}
          <Stack direction="row" spacing={3} sx={{ pb: 2, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
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

          {/* Future rewards — compact row */}
          {nextReward && (
            <Box sx={{ mt: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                <LockOpenIcon sx={{ fontSize: 15, color: 'rgba(255,255,255,0.7)' }} />
                <Typography variant="caption" fontWeight={700} sx={{ color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Уровень {nextReward.level} — {nextReward.name}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                {/* Frame swatch */}
                <Tooltip title={nextReward.reward.frameLabel} arrow>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2, px: 1.5, py: 0.75 }}>
                    <Avatar sx={{
                      width: 28, height: 28, bgcolor: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700,
                      ...(nextReward.reward.frameColor ? {
                        border: `2px solid ${nextReward.reward.frameColor}`,
                        boxShadow: nextReward.reward.frameGlow ? `0 0 6px ${nextReward.reward.frameColor}` : undefined,
                      } : {}),
                    }}>
                      {user?.name?.slice(0, 1)}
                    </Avatar>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap' }}>Рамка</Typography>
                  </Box>
                </Tooltip>
                {/* Banner swatch */}
                <Tooltip title={nextReward.reward.bannerLabel} arrow>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2, px: 1.5, py: 0.75 }}>
                    <Box sx={{ width: 32, height: 14, borderRadius: 1, background: nextReward.reward.bannerGradient, flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap' }}>Лента</Typography>
                  </Box>
                </Tooltip>
                {nextReward.reward.title && (
                  <Tooltip title="Новое звание" arrow>
                    <Box sx={{ bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2, px: 1.5, py: 0.75 }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>
                        {nextReward.reward.title}
                      </Typography>
                    </Box>
                  </Tooltip>
                )}
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', ml: 'auto' }}>ещё {li.xpToNext} XP</Typography>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
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
                <Button component={Link} to="/student/sessions" endIcon={<ArrowForwardIcon />} size="small" sx={{ color: 'text.secondary' }}>Все</Button>
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
                  <Box key={a.to} component={Link} to={a.to}
                    sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#F7F5FC', borderRadius: 2, textDecoration: 'none', transition: 'all 0.2s', '&:hover': { bgcolor: '#EEE9F8', transform: 'translateX(2px)' } }}>
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
              <Button component={Link} to="/student/achievements" endIcon={<ArrowForwardIcon />} size="small" sx={{ color: 'text.secondary' }}>Все</Button>
            </Stack>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {earnedAchievements.slice(0, 8).map((a) => (
                <Box key={a.id} component={Link} to="/student/achievements" title={a.description}
                  sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, p: 1.5, bgcolor: '#F0EBF8', borderRadius: 2, textDecoration: 'none', minWidth: 72, transition: 'all 0.2s', '&:hover': { bgcolor: '#EEE9F8', transform: 'translateY(-2px)' } }}>
                  <Typography variant="h5">{a.icon}</Typography>
                  <Typography variant="caption" fontWeight={600} color="text.primary" sx={{ textAlign: 'center', lineHeight: 1.2 }} noWrap>{a.name}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ── Equipment dialog ──────────────────────────────────────────── */}
      <Dialog open={equipDialog} onClose={() => setEquipDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700} sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <PaletteIcon sx={{ color: LAVENDER }} />
            <span>Оформление профиля</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {/* Preview */}
          <Box sx={{ mb: 3, p: 2.5, borderRadius: 2, background: getLevelReward(effectiveBanner(level, equippedBanner)).bannerGradient, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={photoUrl} sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.25)', fontWeight: 700, fontSize: 16, ...getAvatarFrameSx(effectiveFrame(level, equippedFrame)) }}>
              {!photoUrl && (user?.avatar || user?.name?.slice(0, 2).toUpperCase())}
            </Avatar>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography fontWeight={700} sx={{ color: 'white' }}>{user?.name}</Typography>
                {getLevelReward(effectiveBanner(level, equippedBanner)).title && (
                  <Chip label={getLevelReward(effectiveBanner(level, equippedBanner)).title} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontSize: 10, height: 18 }} />
                )}
              </Stack>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                {getLevelReward(effectiveFrame(level, equippedFrame)).frameLabel} · {getLevelReward(effectiveBanner(level, equippedBanner)).bannerLabel}
              </Typography>
            </Box>
            {equipSaving && <CircularProgress size={16} sx={{ color: 'rgba(255,255,255,0.7)', ml: 'auto' }} />}
          </Box>

          {/* Frame picker */}
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
            Рамка аватарки
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
            {LEVEL_REWARDS.map((r, idx) => {
              const lvlNum = idx + 1;
              const unlocked = lvlNum <= level;
              const selected = effectiveFrame(level, equippedFrame) === lvlNum;
              return (
                <Tooltip key={lvlNum} title={unlocked ? r.frameLabel : `Уровень ${lvlNum} — ${r.title || 'Новичок'}`} arrow>
                  <Box
                    onClick={() => unlocked && saveEquipment(lvlNum, equippedBanner)}
                    sx={{
                      width: 44, height: 44, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: unlocked ? 'pointer' : 'not-allowed',
                      bgcolor: unlocked ? '#F7F5FC' : '#F0EEF8',
                      border: selected ? `3px solid ${LAVENDER}` : r.frameColor ? `2px solid ${r.frameColor}` : '2px solid #D5C9EE',
                      boxShadow: selected ? `0 0 0 2px ${LAVENDER}44` : r.frameGlow && r.frameColor ? `0 0 8px ${r.frameColor}66` : 'none',
                      opacity: unlocked ? 1 : 0.45,
                      transition: 'all 0.15s',
                      position: 'relative',
                      '&:hover': unlocked ? { transform: 'scale(1.1)' } : {},
                    }}
                  >
                    <Typography variant="caption" fontWeight={700} color={unlocked ? 'text.primary' : 'text.disabled'} sx={{ fontSize: 11 }}>
                      {lvlNum}
                    </Typography>
                    {!unlocked && (
                      <LockIcon sx={{ position: 'absolute', bottom: -4, right: -4, fontSize: 13, color: '#C0B4E4', bgcolor: 'white', borderRadius: '50%', p: '1px' }} />
                    )}
                  </Box>
                </Tooltip>
              );
            })}
          </Box>

          {/* Banner picker */}
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
            Стиль ленты профиля
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {LEVEL_REWARDS.map((r, idx) => {
              const lvlNum = idx + 1;
              const unlocked = lvlNum <= level;
              const selected = effectiveBanner(level, equippedBanner) === lvlNum;
              return (
                <Tooltip key={lvlNum} title={unlocked ? r.bannerLabel : `Уровень ${lvlNum} — ${r.title || 'Новичок'}`} arrow>
                  <Box
                    onClick={() => unlocked && saveEquipment(equippedFrame, lvlNum)}
                    sx={{
                      width: 52, height: 32, borderRadius: 1.5,
                      background: r.bannerGradient,
                      cursor: unlocked ? 'pointer' : 'not-allowed',
                      border: selected ? `2px solid ${LAVENDER}` : '2px solid transparent',
                      boxShadow: selected ? `0 0 0 2px ${LAVENDER}44` : 'none',
                      opacity: unlocked ? 1 : 0.35,
                      transition: 'all 0.15s',
                      position: 'relative',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      '&:hover': unlocked ? { transform: 'scale(1.05)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' } : {},
                    }}
                  >
                    {!unlocked && <LockIcon sx={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }} />}
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="contained" onClick={() => setEquipDialog(false)} fullWidth>Готово</Button>
        </DialogActions>
      </Dialog>

      {/* ── Welcome guide (auto-shows once for new users) ───────────── */}
      {user?.id && <WelcomeGuide userId={user.id} />}

      {/* ── Profile info dialog ──────────────────────────────────────── */}
      <Dialog open={profileDialog} onClose={() => setProfileDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Моя анкета</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {profileSuccess && <Alert severity="success">Сохранено!</Alert>}
            {profileError && <Alert severity="error">{profileError}</Alert>}

            <FormControl fullWidth size="small">
              <InputLabel>Класс / статус учёбы</InputLabel>
              <Select value={grade} label="Класс / статус учёбы" onChange={(e) => setGrade(e.target.value)}>
                <MenuItem value=""><em>Не указывать</em></MenuItem>
                {GRADE_OPTIONS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Цель обучения</InputLabel>
              <Select value={learningGoal} label="Цель обучения" onChange={(e) => setLearningGoal(e.target.value)}>
                <MenuItem value=""><em>Не указывать</em></MenuItem>
                {GOAL_OPTIONS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </Select>
            </FormControl>

          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button variant="outlined" onClick={() => setProfileDialog(false)} sx={{ flex: 1 }}>Отмена</Button>
          <Button variant="contained" onClick={saveProfile} disabled={profileSaving}
            startIcon={profileSaving ? <CircularProgress size={16} color="inherit" /> : null} sx={{ flex: 1 }}>
            {profileSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Avatar dialog ─────────────────────────────────────────────── */}
      <Dialog open={avatarDialog} onClose={() => setAvatarDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Изменить фото профиля</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} alignItems="center" sx={{ pt: 1 }}>
            {photoSuccess && <Alert severity="success" sx={{ width: '100%' }}>{photoSuccess}</Alert>}
            {photoError && <Alert severity="error" sx={{ width: '100%' }}>{photoError}</Alert>}
            <Avatar src={photoPreview || photoUrl} sx={{ width: 96, height: 96, bgcolor: LAVENDER_BG, color: LAVENDER, fontSize: 26, fontWeight: 700 }}>
              {!(photoPreview || photoUrl) && (user?.avatar || user?.name?.slice(0, 2).toUpperCase())}
            </Avatar>
            <Button variant="outlined" startIcon={<UploadIcon />} component="label" fullWidth>
              Выбрать фото
              <input ref={photoRef} type="file" hidden accept="image/*"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); setPhotoSuccess(''); } }} />
            </Button>
            {photoFile && <Typography variant="caption" color="text.secondary">{photoFile.name} · {(photoFile.size / 1024).toFixed(0)} КБ</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button variant="outlined" onClick={() => setAvatarDialog(false)} sx={{ flex: 1 }}>Закрыть</Button>
          <Button variant="contained" onClick={savePhoto} disabled={!photoFile || photoSaving}
            startIcon={photoSaving ? <CircularProgress size={16} color="inherit" /> : null} sx={{ flex: 1 }}>
            {photoSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Password dialog ───────────────────────────────────────────── */}
      <Dialog open={passwordDialog} onClose={() => !pwSaving && setPasswordDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Смена пароля</DialogTitle>
        <DialogContent>
          {pwSuccess ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <LockIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="h6" fontWeight={600}>Пароль изменён!</Typography>
            </Box>
          ) : (
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {pwError && <Alert severity="error">{pwError}</Alert>}
              <TextField
                label="Текущий пароль"
                type={showPw.current ? 'text' : 'password'}
                value={pwForm.current}
                onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                autoComplete="current-password"
                fullWidth
                InputProps={{ endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPw((s) => ({ ...s, current: !s.current }))}>
                      {showPw.current ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )}}
              />
              <TextField
                label="Новый пароль"
                type={showPw.next ? 'text' : 'password'}
                value={pwForm.next}
                onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                autoComplete="new-password"
                helperText="Минимум 6 символов"
                fullWidth
                InputProps={{ endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPw((s) => ({ ...s, next: !s.next }))}>
                      {showPw.next ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )}}
              />
              <TextField
                label="Повторите новый пароль"
                type={showPw.confirm ? 'text' : 'password'}
                value={pwForm.confirm}
                onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                autoComplete="new-password"
                error={!!pwForm.confirm && pwForm.next !== pwForm.confirm}
                helperText={pwForm.confirm && pwForm.next !== pwForm.confirm ? 'Пароли не совпадают' : ''}
                fullWidth
                InputProps={{ endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPw((s) => ({ ...s, confirm: !s.confirm }))}>
                      {showPw.confirm ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )}}
              />
            </Stack>
          )}
        </DialogContent>
        {!pwSuccess && (
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button variant="outlined" onClick={() => setPasswordDialog(false)} disabled={pwSaving} sx={{ flex: 1 }}>Отмена</Button>
            <Button
              variant="contained"
              onClick={savePassword}
              disabled={pwSaving || !pwForm.current || !pwForm.next || !pwForm.confirm || pwForm.next !== pwForm.confirm}
              startIcon={pwSaving ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ flex: 1 }}
            >
              {pwSaving ? 'Сохранение...' : 'Изменить пароль'}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Box>
  );
}
