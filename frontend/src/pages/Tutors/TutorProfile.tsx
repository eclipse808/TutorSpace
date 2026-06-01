import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, Chip, Avatar, Rating, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Grid, Divider,
  ToggleButtonGroup, ToggleButton, CircularProgress, TextField,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SchoolIcon from '@mui/icons-material/School';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import { TutorProfile as TutorProfileType } from '../../types';
import { PageLoader } from '../../components/Common/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import api from '../../api/client';
import { getTutorPublicBadge, getEarnedTutorBadges, isEliteTutor } from '../../utils/tutorBadges';

const LAVENDER = '#7C5CBF';
const LAVENDER_BG = '#F0EBF8';

const DURATION_OPTIONS = [
  { value: 60, label: '60 мин' },
  { value: 90, label: '90 мин' },
  { value: 120, label: '120 мин' },
];
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => i + 8);

function getTodayStr() {
  return new Date().toISOString().split('T')[0]; // allow booking today
}

function formatHour(h: number) {
  return `${String(h).padStart(2, '0')}:00`;
}

interface Review {
  id: string;
  studentProfileId: string;
  rating: number;
  text?: string;
  tutorReply?: string;
  createdAt: string;
  studentProfile: { id: string; photoUrl?: string; user: { name: string; avatar?: string } };
}

interface TutorWithStats extends TutorProfileType {
  completedSessions?: number;
}


export default function TutorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tutor, setTutor] = useState<TutorWithStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);

  const [date, setDate] = useState('');
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [duration, setDuration] = useState(60);
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [busyHours, setBusyHours] = useState<number[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookError, setBookError] = useState('');
  const [bookSuccess, setBookSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/tutors/${id}`).then((r) => setTutor(r.data)),
      api.get(`/reviews?tutorProfileId=${id}`).then((r) => setReviews(r.data)),
    ]).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!date || !id) return;
    setLoadingSlots(true);
    setSelectedHour(null);
    api.get(`/tutors/${id}/slots?date=${date}`)
      .then((r) => setBusyHours(r.data))
      .finally(() => setLoadingSlots(false));
  }, [date, id]);

  const isSlotBusy = (hour: number) => {
    const hoursNeeded = Math.ceil(duration / 60);
    for (let i = 0; i < hoursNeeded; i++) {
      if (busyHours.includes(hour + i)) return true;
    }
    return false;
  };

  const totalPrice = tutor?.hourlyRate ? Math.round(tutor.hourlyRate * (duration / 60)) : null;

  const resetBooking = () => {
    setDate(''); setSelectedHour(null); setDuration(60);
    setSubject(''); setNotes(''); setBusyHours([]);
    setBookError(''); setBookSuccess(false);
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutor || selectedHour === null || !date) return;
    setBookError('');
    const scheduledAt = `${date}T${String(selectedHour).padStart(2, '0')}:00:00`;
    try {
      await api.post('/sessions', {
        tutorProfileId: tutor.id,
        scheduledAt,
        duration,
        subject: subject || tutor.subjects[0] || '',
      });
      setBookSuccess(true);
      setTimeout(() => { setBookingOpen(false); resetBooking(); navigate('/student/sessions'); }, 1800);
    } catch (err: any) {
      setBookError(err.response?.data?.error || 'Ошибка записи');
    }
  };

  if (loading) return <PageLoader />;
  if (!tutor) return <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>Репетитор не найден</Box>;

  const elite = isEliteTutor(tutor.user?.xp ?? 0);
  // Warm gold — consistent with Elite styling in catalog cards
  const ELITE_GOLD = '#FFB300';

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 3, color: 'text.secondary' }}>
        Назад
      </Button>

      <Grid container spacing={3}>
        {/* Main */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            <Card elevation={elite ? 2 : 1} sx={elite ? { border: `1.5px solid ${ELITE_GOLD}`, boxShadow: `0 0 0 3px ${ELITE_GOLD}18` } : {}}>
              <CardContent>
                <Stack direction="row" spacing={3} alignItems="flex-start">
                  {tutor.photoUrl ? (
                    <Box component="img" src={tutor.photoUrl} alt={tutor.user.name}
                      sx={{ width: 88, height: 88, borderRadius: 3, objectFit: 'cover', flexShrink: 0,
                        ...(elite && { outline: `2.5px solid ${ELITE_GOLD}`, outlineOffset: 2 }) }} />
                  ) : (
                    <Avatar sx={{ width: 88, height: 88, bgcolor: LAVENDER_BG, color: LAVENDER, borderRadius: 3, fontSize: 24, fontWeight: 700, flexShrink: 0,
                      ...(elite && { outline: `2.5px solid ${ELITE_GOLD}`, outlineOffset: 2 }) }}>
                      {tutor.user?.avatar || tutor.user?.name?.slice(0, 2)?.toUpperCase() || '?'}
                    </Avatar>
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h4" fontWeight={700} color="text.primary">{tutor.user.name}</Typography>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                      <Rating value={tutor.rating} precision={0.1} readOnly size="small" />
                      <Typography variant="body2" fontWeight={600} color="text.primary">{tutor.rating.toFixed(1)}</Typography>
                      <Typography variant="body2" color="text.secondary">({tutor.reviewCount} отзывов)</Typography>
                    </Stack>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1.5 }}>
                      {tutor.subjects.map((s) => (
                        <Chip key={s} label={s} size="small" sx={{ bgcolor: LAVENDER_BG, color: LAVENDER, fontWeight: 500 }} />
                      ))}
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {(tutor.bio || tutor.education) && (
              <Card elevation={1}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} mb={2}>О репетиторе</Typography>
                  {tutor.bio && <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, mb: 2 }}>{tutor.bio}</Typography>}
                  {tutor.education && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 2, borderTop: '1px solid #F0EBF8' }}>
                      <SchoolIcon sx={{ fontSize: 16, color: '#9B83CF' }} />
                      <Typography variant="body2" color="text.secondary">{tutor.education}</Typography>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Достижения репетитора (публичные) */}
            {(() => {
              const xp = tutor.user?.xp ?? 0;
              const completed = tutor.completedSessions ?? 0;
              const publicBadge = getTutorPublicBadge(xp);
              const badges = getEarnedTutorBadges({
                completed,
                rating: tutor.rating,
                reviewCount: tutor.reviewCount,
                createdAt: tutor.user?.createdAt,
              });
              if (!publicBadge && badges.length === 0) return null;
              return (
                <Card elevation={1}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                      <StarIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                      <Typography variant="h6" fontWeight={600}>Достижения</Typography>
                    </Stack>
                    <Stack spacing={2}>
                      {publicBadge && (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderRadius: 2, bgcolor: publicBadge.bgColor, border: `1px solid ${publicBadge.borderColor}`, alignSelf: 'flex-start' }}>
                          <Typography variant="body2" fontWeight={700} sx={{ color: publicBadge.color }}>{publicBadge.label}</Typography>
                        </Box>
                      )}
                      {badges.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {badges.map((b) => (
                            <Box key={b.label} title={b.label} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, px: 1.5, py: 1, bgcolor: LAVENDER_BG, borderRadius: 2 }}>
                              <Typography variant="body1">{b.icon}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{b.label}</Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Reviews */}
            {reviews.length > 0 && (
              <Card elevation={1}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} mb={2}>Отзывы ({reviews.length})</Typography>
                  <Stack spacing={2}>
                    {reviews.map((r) => (
                      <Box key={r.id} sx={{ p: 2, bgcolor: '#F7F5FC', borderRadius: 2 }}>
                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                          <Avatar
                            component={Link}
                            to={`/students/${r.studentProfileId}`}
                            src={r.studentProfile.photoUrl || undefined}
                            sx={{ width: 36, height: 36, bgcolor: LAVENDER_BG, color: LAVENDER, fontSize: 12, fontWeight: 700, textDecoration: 'none', cursor: 'pointer', transition: 'opacity 0.2s', '&:hover': { opacity: 0.75 } }}
                          >
                            {r.studentProfile?.user?.name?.slice(0, 2)?.toUpperCase() ?? '?'}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography
                                component={Link}
                                to={`/students/${r.studentProfileId}`}
                                variant="body2"
                                fontWeight={600}
                                sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { color: LAVENDER } }}
                              >
                                {r.studentProfile.user.name}
                              </Typography>
                              <Rating value={r.rating} size="small" readOnly sx={{ fontSize: '0.85rem' }} />
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {format(parseISO(r.createdAt), 'd MMMM yyyy', { locale: ru })}
                            </Typography>
                            {r.text && <Typography variant="body2" sx={{ mt: 1, color: 'text.primary' }}>{r.text}</Typography>}
                            {r.tutorReply && (
                              <Box sx={{ mt: 1.5, pl: 2, borderLeft: '3px solid #D5C9EE' }}>
                                <Typography variant="caption" fontWeight={600} color="primary.main">Ответ репетитора:</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{r.tutorReply}</Typography>
                              </Box>
                            )}
                          </Box>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Card elevation={1} sx={{ position: 'sticky', top: 80 }}>
            <CardContent>
              {tutor.hourlyRate && (
                <Box sx={{ textAlign: 'center', mb: 2, pb: 2, borderBottom: '1px solid #F0EBF8' }}>
                  <Typography variant="h3" fontWeight={700} color="text.primary">{tutor.hourlyRate.toLocaleString('ru')} ₽</Typography>
                  <Typography variant="body2" color="text.secondary">за час</Typography>
                </Box>
              )}
              <Stack spacing={1.5} sx={{ mb: 2.5 }}>
                {tutor.experience != null && (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <AccessTimeIcon sx={{ fontSize: 18, color: '#9B83CF' }} />
                    <Typography variant="body2" color="text.secondary">
                      Опыт: <Box component="span" fontWeight={600} color="text.primary">{tutor.experience} лет</Box>
                    </Typography>
                  </Stack>
                )}
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <SchoolIcon sx={{ fontSize: 18, color: '#9B83CF' }} />
                  <Typography variant="body2" color="text.secondary">
                    Предметы: <Box component="span" fontWeight={600} color="text.primary">{tutor.subjects.join(', ')}</Box>
                  </Typography>
                </Stack>
                {tutor.reviewCount > 0 && (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <StarIcon sx={{ fontSize: 18, color: '#9B83CF' }} />
                    <Typography variant="body2" color="text.secondary">
                      Рейтинг: <Box component="span" fontWeight={600} color="text.primary">{tutor.rating.toFixed(1)}/5</Box>
                    </Typography>
                  </Stack>
                )}
              </Stack>
              {user?.role === 'STUDENT' ? (
                <Button fullWidth variant="contained" size="large" startIcon={<CalendarMonthIcon />} onClick={() => setBookingOpen(true)}>
                  Записаться
                </Button>
              ) : !user ? (
                <Button fullWidth variant="contained" size="large" onClick={() => navigate('/login')}>
                  Войти для записи
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Booking dialog */}
      <Dialog open={bookingOpen} onClose={() => { setBookingOpen(false); resetBooking(); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Запись к {tutor.user.name?.split(' ')?.[0] ?? ''}</DialogTitle>
        <DialogContent>
          {bookSuccess ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" fontWeight={600}>Запись создана!</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Перенаправление в журнал занятий...</Typography>
            </Box>
          ) : (
            <Stack spacing={3} sx={{ pt: 1 }} component="form" onSubmit={handleBook}>
              {bookError && <Alert severity="error">{bookError}</Alert>}

              {/* Subject */}
              {tutor.subjects.length > 1 && (
                <Box>
                  <Typography variant="body2" fontWeight={500} color="text.secondary" mb={1}>Предмет</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {tutor.subjects.map((s) => (
                      <Chip key={s} label={s} onClick={() => setSubject(s)}
                        color={subject === s ? 'primary' : 'default'}
                        sx={{ cursor: 'pointer', fontWeight: 500 }} />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Date */}
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                  <Box sx={{ width: 22, height: 22, bgcolor: 'primary.main', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, lineHeight: 1 }}>1</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={600}>Выберите дату</Typography>
                </Stack>
                <TextField type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  inputProps={{ min: getTodayStr() }} required fullWidth />
              </Box>

              {/* Time slots */}
              {date && (
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                    <Box sx={{ width: 22, height: 22, bgcolor: 'primary.main', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, lineHeight: 1 }}>2</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={600}>Выберите время</Typography>
                    {loadingSlots && <CircularProgress size={14} color="primary" />}
                  </Stack>
                  <Grid container spacing={1}>
                    {TIME_SLOTS.map((hour) => {
                      const busy = isSlotBusy(hour);
                      const sel = selectedHour === hour;
                      return (
                        <Grid item xs={3} key={hour}>
                          <Button
                            fullWidth
                            variant={sel ? 'contained' : 'outlined'}
                            disabled={busy}
                            onClick={() => setSelectedHour(hour)}
                            size="small"
                            sx={{
                              borderRadius: 2, py: 1,
                              ...(busy && { textDecoration: 'line-through', color: 'text.disabled', borderColor: '#E5E7EB' }),
                              ...(!busy && !sel && { borderColor: '#D5C9EE', color: LAVENDER }),
                            }}
                          >
                            {formatHour(hour)}
                          </Button>
                        </Grid>
                      );
                    })}
                  </Grid>
                  {busyHours.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Серые слоты — уже заняты
                    </Typography>
                  )}
                </Box>
              )}

              {/* Duration */}
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                  <Box sx={{ width: 22, height: 22, bgcolor: 'primary.main', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, lineHeight: 1 }}>3</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={600}>Длительность</Typography>
                </Stack>
                <ToggleButtonGroup
                  value={duration}
                  exclusive
                  onChange={(_, v) => { if (v) { setDuration(v); setSelectedHour(null); } }}
                  fullWidth
                  sx={{ '& .MuiToggleButton-root': { borderRadius: '10px !important', fontWeight: 600, border: '2px solid #D5C9EE' }, '& .Mui-selected': { bgcolor: LAVENDER_BG + ' !important', color: LAVENDER + ' !important', borderColor: LAVENDER + ' !important' } }}
                >
                  {DURATION_OPTIONS.map((o) => <ToggleButton key={o.value} value={o.value}>{o.label}</ToggleButton>)}
                </ToggleButtonGroup>
              </Box>

              {/* Price */}
              {totalPrice && (
                <Box sx={{ bgcolor: '#F0EBF8', borderRadius: 2, px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <BoltIcon sx={{ color: '#f59e0b', fontSize: 18 }} />
                    <Typography variant="body2" fontWeight={500} color="text.secondary">Стоимость занятия</Typography>
                  </Stack>
                  <Typography variant="h6" fontWeight={700} color="text.primary">{totalPrice.toLocaleString('ru')} ₽</Typography>
                </Box>
              )}

              {/* Notes */}
              <TextField
                label="Комментарий (необязательно)"
                multiline
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Что хотите изучить, цели занятия..."
              />
            </Stack>
          )}
        </DialogContent>
        {!bookSuccess && (
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button variant="outlined" onClick={() => { setBookingOpen(false); resetBooking(); }} sx={{ flex: 1 }}>
              Отмена
            </Button>
            <Button
              variant="contained"
              onClick={handleBook as any}
              disabled={!date || selectedHour === null || (tutor.subjects.length > 1 && !subject)}
              sx={{ flex: 1 }}
            >
              Записаться
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Box>
  );
}
