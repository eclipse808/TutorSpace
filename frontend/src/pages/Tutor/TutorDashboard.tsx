import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Stack, Button, Avatar,
  Chip, Divider, LinearProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  Alert, CircularProgress, Tab, Tabs, IconButton,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PeopleIcon from '@mui/icons-material/People';
import StarIcon from '@mui/icons-material/Star';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import RateReviewIcon from '@mui/icons-material/RateReview';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import UploadIcon from '@mui/icons-material/Upload';
import { useAuthStore } from '../../store/authStore';
import { Session, StudentProfile, TutorProfile } from '../../types';
import { PageLoader } from '../../components/Common/LoadingSpinner';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import api from '../../api/client';

const ALL_SUBJECTS = [
  'Математика', 'Алгебра', 'Геометрия', 'Физика', 'Химия', 'Биология',
  'Английский язык', 'Французский язык', 'Немецкий язык', 'Русский язык',
  'История', 'География', 'Информатика', 'Литература',
];

const LAVENDER = '#7C5CBF';
const LAVENDER_BG = '#F0EBF8';

const TUTOR_XP_THRESHOLDS = [0, 200, 800, 2000, 5000, 12000];
const TUTOR_LEVEL_NAMES = ['Новичок', 'Практик', 'Опытный', 'Эксперт', 'Мастер', 'Гуру'];
const TUTOR_LEVEL_REWARDS = [
  '',
  '🏷️ Бейдж на профиле',
  '🔍 Приоритет в поиске',
  '✅ Статус "Проверенный"',
  '⭐ Выделение в каталоге',
  '👑 Элитный репетитор',
];

function getTutorLevel(xp: number) {
  const idx = TUTOR_XP_THRESHOLDS.filter((t) => xp >= t).length - 1;
  const safeIdx = Math.max(0, idx);
  const cur = TUTOR_XP_THRESHOLDS[safeIdx];
  const next = TUTOR_XP_THRESHOLDS[safeIdx + 1] ?? null;
  const progress = next ? Math.min(100, ((xp - cur) / (next - cur)) * 100) : 100;
  return {
    level: safeIdx + 1,
    name: TUTOR_LEVEL_NAMES[safeIdx],
    reward: TUTOR_LEVEL_REWARDS[safeIdx],
    nextReward: TUTOR_LEVEL_REWARDS[safeIdx + 1] ?? null,
    cur, next, progress, xp,
  };
}

function getTutorBadges(completed: number, rating: number, reviewCount: number, createdAt?: string) {
  const badges: { icon: string; label: string }[] = [];
  if (completed >= 1) badges.push({ icon: '🎓', label: 'Первое занятие' });
  if (completed >= 10) badges.push({ icon: '🔟', label: 'Десятка' });
  if (completed >= 50) badges.push({ icon: '🏆', label: 'Полсотни' });
  if (completed >= 100) badges.push({ icon: '💯', label: 'Сотня' });
  if (reviewCount >= 10) badges.push({ icon: '💬', label: '10 отзывов' });
  if (rating >= 4.5 && reviewCount >= 3) badges.push({ icon: '⭐', label: 'Высокий рейтинг' });
  if (rating >= 4.9 && reviewCount >= 5) badges.push({ icon: '🌟', label: 'Идеальный рейтинг' });
  if (createdAt) {
    const msOnSite = Date.now() - new Date(createdAt).getTime();
    if (msOnSite >= 365 * 24 * 60 * 60 * 1000) badges.push({ icon: '📅', label: 'Год на сайте' });
  }
  return badges;
}

export default function TutorDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [tutorProfile, setTutorProfile] = useState<TutorProfile | null>(null);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [loading, setLoading] = useState(true);

  // Add subject dialog
  const [subjectDialog, setSubjectDialog] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ subject: '', justification: '' });
  const [subjectFile, setSubjectFile] = useState<File | null>(null);
  const [subjectSaving, setSubjectSaving] = useState(false);
  const [subjectError, setSubjectError] = useState('');
  const [subjectSuccess, setSubjectSuccess] = useState(false);

  // Edit profile dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editTab, setEditTab] = useState(0);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [rateValue, setRateValue] = useState('');
  const [rateSaving, setRateSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ bio: '', education: '', experience: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [editSuccess, setEditSuccess] = useState('');
  const [editError, setEditError] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      api.get('/sessions?status=SCHEDULED').then((r) => setSessions(r.data)),
      api.get('/tutors/me/students').then((r) => setStudents(r.data)),
      api.get('/tutors/me/profile').then((r) => setTutorProfile(r.data)),
      api.get('/tutors/me/stats').then((r) => setCompletedSessions(r.data.completedSessions || 0)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const availableSubjects = ALL_SUBJECTS.filter((s) => !(tutorProfile?.subjects || []).includes(s));

  const openSubjectDialog = () => {
    setSubjectForm({ subject: availableSubjects[0] || '', justification: '' });
    setSubjectFile(null);
    setSubjectError('');
    setSubjectSuccess(false);
    setSubjectDialog(true);
  };

  const submitSubjectRequest = async () => {
    if (!subjectForm.subject || !subjectForm.justification.trim()) {
      setSubjectError('Заполните предмет и обоснование');
      return;
    }
    setSubjectSaving(true);
    setSubjectError('');
    try {
      const formData = new FormData();
      formData.append('subject', subjectForm.subject);
      formData.append('justification', subjectForm.justification);
      if (subjectFile) formData.append('certificate', subjectFile);
      // Do NOT set Content-Type manually — axios sets it with correct boundary
      await api.post('/subject-requests', formData);
      setSubjectSuccess(true);
      setTimeout(() => setSubjectDialog(false), 2000);
    } catch (err: any) {
      setSubjectError(err.response?.data?.error || 'Ошибка отправки');
    } finally {
      setSubjectSaving(false);
    }
  };

  const openEditDialog = () => {
    setEditTab(0);
    setPhotoPreview('');
    setPhotoFile(null);
    setRateValue(String(tutorProfile?.hourlyRate ?? ''));
    setProfileForm({ bio: tutorProfile?.bio || '', education: tutorProfile?.education || '', experience: String(tutorProfile?.experience ?? '') });
    setEditSuccess('');
    setEditError('');
    setEditDialog(true);
  };

  const savePhoto = async () => {
    if (!photoFile) return;
    setPhotoSaving(true);
    setEditError('');
    try {
      const fd = new FormData();
      fd.append('photo', photoFile);
      const { data } = await api.post('/upload/photo', fd);
      setTutorProfile((p) => p ? { ...p, photoUrl: data.photoUrl } : p);
      setEditSuccess('Фото обновлено');
      setPhotoFile(null);
      setPhotoPreview('');
    } catch (err: any) {
      setEditError(err.response?.data?.error || 'Ошибка загрузки');
    } finally {
      setPhotoSaving(false);
    }
  };

  const saveRate = async () => {
    const rate = Number(rateValue);
    if (!rateValue || isNaN(rate) || rate < 100) { setEditError('Укажите корректную ставку (от 100 ₽)'); return; }
    setRateSaving(true);
    setEditError('');
    try {
      await api.put('/tutors/me/hourly-rate', { hourlyRate: rate });
      setTutorProfile((p) => p ? { ...p, hourlyRate: rate } : p);
      setEditSuccess('Ставка обновлена');
    } catch (err: any) {
      setEditError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setRateSaving(false);
    }
  };

  const saveProfileChange = async () => {
    if (!profileForm.bio && !profileForm.education && !profileForm.experience) {
      setEditError('Заполните хотя бы одно поле'); return;
    }
    setProfileSaving(true);
    setEditError('');
    try {
      await api.post('/tutors/me/profile-change', {
        bio: profileForm.bio || undefined,
        education: profileForm.education || undefined,
        experience: profileForm.experience ? Number(profileForm.experience) : undefined,
      });
      setEditSuccess('Заявка на изменение отправлена на проверку администратору');
    } catch (err: any) {
      setEditError(err.response?.data?.error || 'Ошибка отправки');
    } finally {
      setProfileSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  const statCards = [
    { label: 'Предстоящих занятий', value: sessions.length, icon: <CalendarMonthIcon />, color: LAVENDER_BG, iconColor: LAVENDER },
    { label: 'Учеников', value: students.length, icon: <PeopleIcon />, color: '#EFF6FF', iconColor: '#3b82f6' },
    { label: 'Мой рейтинг', value: tutorProfile ? `${tutorProfile.rating.toFixed(1)} ★` : '—', icon: <StarIcon />, color: '#FEFCE8', iconColor: '#f59e0b' },
    { label: 'Проведено занятий', value: completedSessions, icon: <TrendingUpIcon />, color: '#F0FDF4', iconColor: '#22c55e' },
  ];

  const tutorXp = (tutorProfile as any)?.user?.xp ?? 0;
  const tutorCreatedAt = (tutorProfile as any)?.user?.createdAt;
  const tutorLevel = getTutorLevel(tutorXp);
  const tutorBadges = getTutorBadges(completedSessions, tutorProfile?.rating ?? 0, tutorProfile?.reviewCount ?? 0, tutorCreatedAt);
  const photoSrc = tutorProfile?.photoUrl || '';

  return (
    <Box>
      {/* Header card */}
      <Card elevation={1} sx={{ mb: 3, background: 'linear-gradient(135deg, #7C5CBF, #6A4DAD)', color: 'white', border: 'none' }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <Avatar
                src={photoSrc}
                sx={{ width: 72, height: 72, bgcolor: 'rgba(255,255,255,0.25)', fontSize: 22, fontWeight: 700 }}
              >
                {!photoSrc && (user?.avatar || user?.name?.slice(0, 2).toUpperCase())}
              </Avatar>
              <IconButton
                size="small"
                onClick={openEditDialog}
                sx={{ position: 'absolute', bottom: -4, right: -4, bgcolor: 'white', color: LAVENDER, width: 24, height: 24, '&:hover': { bgcolor: LAVENDER_BG } }}
              >
                <EditIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight={700} sx={{ color: 'white' }}>
                {user?.name} 🎓
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 0.5 }}>
                Репетитор · {tutorProfile?.reviewCount || 0} отзывов
                {tutorProfile?.hourlyRate ? ` · ${tutorProfile.hourlyRate.toLocaleString('ru')} ₽/час` : ''}
              </Typography>
              {tutorProfile?.subjects && tutorProfile.subjects.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
                  {tutorProfile.subjects.map((s) => (
                    <Chip key={s} label={s} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 11, height: 22 }} />
                  ))}
                </Box>
              )}
            </Box>
            <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1} flexShrink={0}>
              <Button
                component={Link}
                to={tutorProfile ? `/tutors/${tutorProfile.id}` : '#'}
                variant="outlined"
                size="small"
                startIcon={<PersonIcon />}
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                Мой профиль
              </Button>
              <Button
                onClick={openEditDialog}
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                Редактировать
              </Button>
              <Button
                onClick={openSubjectDialog}
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                Добавить предмет
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Level card */}
      <Card elevation={0} sx={{ mb: 3, background: 'linear-gradient(135deg, #6A4DAD, #9B83CF)', color: 'white', border: 'none' }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-start' }} spacing={3}>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={0.75}>
                <TrendingUpIcon sx={{ color: '#fbbf24' }} />
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: 'white' }}>
                  Уровень {tutorLevel.level} — {tutorLevel.name}
                </Typography>
                <Chip label={`${tutorXp} XP`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 11, height: 22 }} />
              </Stack>
              {tutorLevel.reward && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', display: 'block', mb: 1.5 }}>
                  {tutorLevel.reward}
                </Typography>
              )}
              <LinearProgress
                variant="determinate"
                value={tutorLevel.progress}
                sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#fbbf24', borderRadius: 4 } }}
              />
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>{tutorXp} XP</Typography>
                {tutorLevel.next && (
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    {tutorLevel.next} XP → {tutorLevel.nextReward}
                  </Typography>
                )}
              </Stack>
            </Box>
            {tutorBadges.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, flexShrink: 0 }}>
                {tutorBadges.map((b) => (
                  <Box key={b.label} title={b.label} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, px: 1.5, py: 1, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2 }}>
                    <Typography variant="body1">{b.icon}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>{b.label}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
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
                <Typography variant="subtitle1" fontWeight={600}>Предстоящие занятия</Typography>
                <Button component={Link} to="/tutor/sessions" endIcon={<ArrowForwardIcon />} size="small" sx={{ color: 'text.secondary' }}>Все</Button>
              </Stack>
              {sessions.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <CalendarMonthIcon sx={{ fontSize: 36, opacity: 0.4, mb: 1 }} />
                  <Typography variant="body2">Нет предстоящих занятий</Typography>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {sessions.slice(0, 4).map((s) => (
                    <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#F7F5FC', borderRadius: 2 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: LAVENDER_BG, color: LAVENDER, fontSize: 11, fontWeight: 700 }}>
                        {s.studentProfile?.user.avatar}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{s.studentProfile?.user.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.subject}</Typography>
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

        {/* Management */}
        <Grid item xs={12} md={6}>
          <Card elevation={1}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>Управление</Typography>
              <Stack spacing={1.5}>
                {[
                  { to: '/tutor/sessions', icon: <CalendarMonthIcon />, label: 'Журнал занятий', desc: 'Оценить учеников после занятий', color: LAVENDER },
                  { to: '/tutor/goals', icon: <TrackChangesIcon />, label: 'Цели учеников', desc: 'Ставить задачи и отмечать выполнение', color: '#6A4DAD' },
                  { to: '/tutor/criteria', icon: <MenuBookIcon />, label: 'Критерии оценки', desc: 'Настроить компетенции по предметам', color: '#9B83CF' },
                  { to: '/tutor/reviews', icon: <RateReviewIcon />, label: 'Отзывы', desc: 'Просмотр и ответы на отзывы учеников', color: '#B39DDB' },
                ].map((a) => (
                  <Box key={a.to} component={Link} to={a.to} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#F7F5FC', borderRadius: 2, textDecoration: 'none', transition: 'all 0.2s', '&:hover': { bgcolor: '#EEE9F8' } }}>
                    <Box sx={{ width: 40, height: 40, bgcolor: a.color, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
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

              {students.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" fontWeight={600} color="text.secondary" mb={1.5}>
                    Мои ученики ({students.length})
                  </Typography>
                  <Stack spacing={0.75}>
                    {students.slice(0, 3).map((st) => (
                      <Box key={st.id} component={Link} to={`/tutor/students/${st.id}/progress`} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderRadius: 1.5, textDecoration: 'none', '&:hover': { bgcolor: '#F7F5FC' }, transition: 'all 0.15s' }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: LAVENDER_BG, color: LAVENDER, fontSize: 11, fontWeight: 700 }}>
                          {st.user.avatar}
                        </Avatar>
                        <Typography variant="body2" color="text.primary">{st.user.name}</Typography>
                        <ArrowForwardIcon sx={{ fontSize: 14, color: '#C0B4E4', ml: 'auto' }} />
                      </Box>
                    ))}
                  </Stack>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* === Edit Profile Dialog === */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Редактирование профиля</DialogTitle>
        <Box sx={{ px: 3 }}>
          <Tabs value={editTab} onChange={(_, v) => { setEditTab(v); setEditSuccess(''); setEditError(''); }} sx={{ borderBottom: '1px solid #F0EBF8', mb: 1 }}>
            <Tab label="Фото" sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13 }} />
            <Tab label="Ставка" sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13 }} />
            <Tab label="Описание" sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13 }} />
          </Tabs>
        </Box>
        <DialogContent>
          {editSuccess && <Alert severity="success" sx={{ mb: 2 }}>{editSuccess}</Alert>}
          {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}

          {/* Tab 0: Photo */}
          {editTab === 0 && (
            <Stack spacing={2.5} alignItems="center" sx={{ pt: 1 }}>
              <Avatar
                src={photoPreview || tutorProfile?.photoUrl || ''}
                sx={{ width: 100, height: 100, bgcolor: LAVENDER_BG, color: LAVENDER, fontSize: 28, fontWeight: 700 }}
              >
                {!(photoPreview || tutorProfile?.photoUrl) && (user?.name?.slice(0, 2).toUpperCase())}
              </Avatar>
              <Stack direction="row" spacing={1.5}>
                <Button variant="outlined" startIcon={<UploadIcon />} component="label" size="small">
                  Выбрать фото
                  <input
                    ref={photoRef}
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); }
                    }}
                  />
                </Button>
                {photoFile && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={savePhoto}
                    disabled={photoSaving}
                    startIcon={photoSaving ? <CircularProgress size={14} color="inherit" /> : null}
                  >
                    {photoSaving ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                )}
              </Stack>
              <Typography variant="caption" color="text.disabled">Фото обновляется сразу без проверки администратора</Typography>
            </Stack>
          )}

          {/* Tab 1: Rate */}
          {editTab === 1 && (
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <TextField
                label="Ставка (₽/час)"
                type="number"
                value={rateValue}
                onChange={(e) => setRateValue(e.target.value)}
                inputProps={{ min: 100, max: 50000 }}
                placeholder="1500"
                fullWidth
              />
              <Typography variant="caption" color="text.disabled">
                Цена обновляется сразу без проверки администратора
              </Typography>
            </Stack>
          )}

          {/* Tab 2: Profile info */}
          {editTab === 2 && (
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <Alert severity="info" sx={{ fontSize: 12 }}>
                Изменения описания, образования и опыта проходят проверку администратора и появятся в профиле после одобрения
              </Alert>
              <TextField
                label="О себе"
                multiline
                rows={3}
                value={profileForm.bio}
                onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Расскажите о вашем опыте, методах, достижениях..."
                fullWidth
              />
              <TextField
                label="Образование"
                value={profileForm.education}
                onChange={(e) => setProfileForm((f) => ({ ...f, education: e.target.value }))}
                placeholder="МГУ, факультет математики"
                fullWidth
              />
              <TextField
                label="Опыт (лет)"
                type="number"
                value={profileForm.experience}
                onChange={(e) => setProfileForm((f) => ({ ...f, experience: e.target.value }))}
                inputProps={{ min: 0, max: 50 }}
                placeholder="5"
                fullWidth
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button variant="outlined" onClick={() => setEditDialog(false)} sx={{ flex: 1 }}>Закрыть</Button>
          {editTab === 1 && (
            <Button
              variant="contained"
              onClick={saveRate}
              disabled={rateSaving}
              startIcon={rateSaving ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ flex: 1 }}
            >
              {rateSaving ? 'Сохранение...' : 'Сохранить ставку'}
            </Button>
          )}
          {editTab === 2 && (
            <Button
              variant="contained"
              onClick={saveProfileChange}
              disabled={profileSaving}
              startIcon={profileSaving ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ flex: 1 }}
            >
              {profileSaving ? 'Отправка...' : 'Отправить на проверку'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Add subject dialog */}
      <Dialog open={subjectDialog} onClose={() => setSubjectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Заявка на добавление предмета</DialogTitle>
        <DialogContent>
          {subjectSuccess ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircleIcon sx={{ fontSize: 56, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" fontWeight={600}>Заявка отправлена!</Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Администратор рассмотрит её и добавит предмет в ваш профиль
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {subjectError && <Alert severity="error">{subjectError}</Alert>}
              <FormControl fullWidth>
                <InputLabel>Предмет *</InputLabel>
                <Select
                  value={subjectForm.subject}
                  label="Предмет *"
                  onChange={(e) => setSubjectForm((f) => ({ ...f, subject: e.target.value }))}
                >
                  {availableSubjects.length > 0 ? (
                    availableSubjects.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)
                  ) : (
                    <MenuItem value="" disabled>Все предметы уже добавлены</MenuItem>
                  )}
                </Select>
              </FormControl>
              <TextField
                label="Обоснование компетенции *"
                multiline
                rows={4}
                value={subjectForm.justification}
                onChange={(e) => setSubjectForm((f) => ({ ...f, justification: e.target.value }))}
                placeholder="Опишите ваш опыт и знания в этом предмете..."
              />
              <Box>
                <Typography variant="body2" fontWeight={600} mb={1}>Сертификат / диплом (необязательно)</Typography>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<AttachFileIcon />}
                  sx={{ borderStyle: 'dashed', color: 'text.secondary', borderColor: 'divider', width: '100%', justifyContent: 'flex-start' }}
                >
                  {subjectFile ? subjectFile.name : 'Прикрепить изображение'}
                  <input type="file" hidden accept="image/*" onChange={(e) => setSubjectFile(e.target.files?.[0] || null)} />
                </Button>
              </Box>
              <Box sx={{ bgcolor: '#F0EBF8', borderRadius: 2, px: 2, py: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Предмет появится в вашем профиле после одобрения администратором.
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        {!subjectSuccess && (
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button variant="outlined" onClick={() => setSubjectDialog(false)} sx={{ flex: 1 }}>Отмена</Button>
            <Button
              variant="contained"
              onClick={submitSubjectRequest}
              disabled={subjectSaving || availableSubjects.length === 0}
              startIcon={subjectSaving ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ flex: 1 }}
            >
              {subjectSaving ? 'Отправка...' : 'Отправить заявку'}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Box>
  );
}
