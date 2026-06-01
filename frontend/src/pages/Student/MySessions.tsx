import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Chip, Stack, Tabs, Tab, Avatar, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Rating, Alert,
  IconButton, Tooltip,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import RateReviewIcon from '@mui/icons-material/RateReview';
import StarIcon from '@mui/icons-material/Star';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import BlockIcon from '@mui/icons-material/Block';
import { Session } from '../../types';
import { PageLoader } from '../../components/Common/LoadingSpinner';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import api from '../../api/client';

const STATUS_CONFIG = {
  SCHEDULED: { label: 'Запланировано', color: 'info' as const, icon: <CalendarMonthIcon fontSize="inherit" /> },
  COMPLETED: { label: 'Завершено', color: 'success' as const, icon: <CheckCircleIcon fontSize="inherit" /> },
  CANCELLED: { label: 'Отменено', color: 'error' as const, icon: <CancelIcon fontSize="inherit" /> },
};

const LAVENDER_BG = '#EEE9F8';
const LAVENDER = '#7C5CBF';

// tutorProfileId → reviewId
type ReviewMap = Record<string, string>;

export default function MySessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  // Map: tutorProfileId → review id (one review per tutor)
  const [reviewedTutors, setReviewedTutors] = useState<ReviewMap>({});

  const [reviewSession, setReviewSession] = useState<Session | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/sessions').then((r) => setSessions(r.data)),
      api.get('/reviews/mine').then((r) => {
        const map: ReviewMap = {};
        (r.data as any[]).forEach((rev) => {
          if (rev.tutorProfileId) map[rev.tutorProfileId] = rev.id;
        });
        setReviewedTutors(map);
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const upcoming = sessions.filter((s) => s.status === 'SCHEDULED').sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const history = sessions.filter((s) => s.status !== 'SCHEDULED');
  const list = tab === 0 ? upcoming : history;

  const openReview = (session: Session) => {
    setReviewSession(session);
    setRating(null);
    setReviewText('');
    setReviewError('');
    setReviewSuccess(false);
  };

  const closeReview = () => {
    setReviewSession(null);
    setReviewSaving(false);
    setReviewError('');
  };

  const submitReview = async () => {
    if (!reviewSession || !rating) return;
    setReviewSaving(true);
    setReviewError('');
    try {
      const res = await api.post('/reviews', {
        tutorProfileId: reviewSession.tutorProfileId,
        sessionId: reviewSession.id,
        rating,
        text: reviewText || undefined,
      });
      setReviewedTutors((prev) => ({ ...prev, [reviewSession.tutorProfileId]: res.data.id }));
      setReviewSuccess(true);
      setTimeout(closeReview, 1500);
    } catch (err: any) {
      setReviewError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setReviewSaving(false);
    }
  };

  const cancelSession = async (sessionId: string) => {
    setCancelling(true);
    setCancelError('');
    try {
      await api.put(`/sessions/${sessionId}/status`, { status: 'CANCELLED' });
      setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, status: 'CANCELLED' } : s));
      setCancelConfirmId(null);
    } catch (err: any) {
      setCancelError(err.response?.data?.error || 'Ошибка отмены');
    } finally {
      setCancelling(false);
    }
  };

  const deleteReview = async (tutorProfileId: string) => {
    const reviewId = reviewedTutors[tutorProfileId];
    if (!reviewId) return;
    setDeleteError('');
    try {
      await api.delete(`/reviews/${reviewId}`);
      setReviewedTutors((prev) => {
        const next = { ...prev };
        delete next[tutorProfileId];
        return next;
      });
      setDeleteConfirmId(null);
    } catch (err: any) {
      setDeleteError(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  if (loading) return <PageLoader />;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>Мои занятия</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`Предстоящие (${upcoming.length})`} />
        <Tab label={`История (${history.length})`} />
      </Tabs>

      {list.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
          <MenuBookIcon sx={{ fontSize: 48, opacity: 0.4, mb: 2 }} />
          <Typography variant="h6" fontWeight={600} mb={1}>
            {tab === 0 ? 'Нет предстоящих занятий' : 'История занятий пуста'}
          </Typography>
          {tab === 0 && (
            <Button component={Link} to="/tutors" variant="contained" sx={{ mt: 1 }}>
              Найти репетитора
            </Button>
          )}
        </Box>
      ) : (
        <Stack spacing={2}>
          {list.map((session) => {
            const cfg = STATUS_CONFIG[session.status];
            const alreadyReviewed = reviewedTutors[session.tutorProfileId];
            const canReview = session.status === 'COMPLETED' && !alreadyReviewed;
            const hoursUntil = (new Date(session.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60);
            const canCancel = session.status === 'SCHEDULED' && hoursUntil >= 24;
            const cancelTooLate = session.status === 'SCHEDULED' && hoursUntil < 24;
            const cancelDeadline = new Date(new Date(session.scheduledAt).getTime() - 24 * 60 * 60 * 1000);

            return (
              <Card key={session.id} elevation={1} sx={{ transition: 'all 0.2s', '&:hover': { boxShadow: '0 4px 16px rgba(124,92,191,0.15)' } }}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Avatar
                      component={Link}
                      to={`/tutors/${session.tutorProfileId}`}
                      src={session.tutorProfile?.photoUrl || undefined}
                      sx={{ bgcolor: LAVENDER_BG, color: LAVENDER, width: 48, height: 48, fontWeight: 700, flexShrink: 0, textDecoration: 'none', cursor: 'pointer', transition: 'opacity 0.2s', '&:hover': { opacity: 0.8 } }}
                    >
                      {session.tutorProfile?.user.avatar || session.tutorProfile?.user.name?.slice(0, 2).toUpperCase() || '?'}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                        <Box>
                          <Typography
                            component={Link}
                            to={`/tutors/${session.tutorProfileId}`}
                            variant="subtitle1"
                            fontWeight={600}
                            sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { color: LAVENDER } }}
                          >
                            {session.tutorProfile?.user.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">{session.subject}</Typography>
                        </Box>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          {session.tutorProfile?.user?.id && (
                            <Tooltip title="Написать репетитору">
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/chat?with=${session.tutorProfile!.user.id}`)}
                                sx={{ color: '#9B83CF', '&:hover': { color: LAVENDER, bgcolor: LAVENDER_BG } }}
                              >
                                <ChatBubbleOutlineIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Chip label={cfg.label} size="small" color={cfg.color} icon={cfg.icon} sx={{ fontWeight: 500 }} />
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={3} sx={{ mt: 1.5 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <CalendarMonthIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary">
                            {format(parseISO(session.scheduledAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <AccessTimeIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary">{session.duration} мин</Typography>
                        </Stack>
                      </Stack>

                      {session.notes && (
                        <Box sx={{ mt: 1.5, px: 2, py: 1, bgcolor: '#F7F5FC', borderRadius: 1.5, borderLeft: '3px solid #D5C9EE' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>{session.notes}</Typography>
                        </Box>
                      )}

                      {(canReview || canCancel || cancelTooLate) && (
                        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap">
                          {canReview && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<RateReviewIcon />}
                              onClick={() => openReview(session)}
                              sx={{ borderColor: '#D5C9EE', color: LAVENDER, '&:hover': { bgcolor: '#F0EBF8', borderColor: LAVENDER } }}
                            >
                              Оставить отзыв
                            </Button>
                          )}
                          {canCancel && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<CancelIcon />}
                              onClick={() => { setCancelConfirmId(session.id); setCancelError(''); }}
                            >
                              Отменить
                            </Button>
                          )}
                          {cancelTooLate && (
                            <Tooltip title={`Отмена недоступна — до занятия менее 24 часов. Дедлайн отмены был ${format(cancelDeadline, 'd MMM, HH:mm', { locale: ru })}`}>
                              <span>
                                <Button size="small" variant="outlined" color="error" startIcon={<BlockIcon />} disabled>
                                  Отмена недоступна
                                </Button>
                              </span>
                            </Tooltip>
                          )}
                        </Stack>
                      )}

                      {alreadyReviewed && (
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1.5 }}>
                          <StarIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                          <Typography variant="caption" color="text.secondary" fontWeight={500}>Отзыв оставлен</Typography>
                          <Tooltip title="Удалить отзыв">
                            <IconButton
                              size="small"
                              onClick={() => { setDeleteConfirmId(session.tutorProfileId); setDeleteError(''); }}
                              sx={{ ml: 0.5, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                            >
                              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Cancel session dialog */}
      <Dialog open={Boolean(cancelConfirmId)} onClose={() => !cancelling && setCancelConfirmId(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Отменить занятие?</DialogTitle>
        <DialogContent>
          {cancelError && <Alert severity="error" sx={{ mb: 2 }}>{cancelError}</Alert>}
          <Typography variant="body2" color="text.secondary">
            Занятие будет отменено. Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button variant="outlined" onClick={() => setCancelConfirmId(null)} disabled={cancelling} sx={{ flex: 1 }}>Назад</Button>
          <Button
            variant="contained"
            color="error"
            disabled={cancelling}
            onClick={() => cancelConfirmId && cancelSession(cancelConfirmId)}
            sx={{ flex: 1 }}
          >
            {cancelling ? 'Отмена...' : 'Да, отменить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review dialog */}
      <Dialog open={Boolean(reviewSession)} onClose={closeReview} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          Отзыв о занятии с {reviewSession?.tutorProfile?.user.name?.split(' ')[0]}
        </DialogTitle>
        <DialogContent>
          {reviewSuccess ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircleIcon sx={{ fontSize: 56, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" fontWeight={600}>Спасибо за отзыв!</Typography>
            </Box>
          ) : (
            <Stack spacing={3} sx={{ pt: 1 }}>
              {reviewError && <Alert severity="error">{reviewError}</Alert>}
              <Box>
                <Typography variant="body2" fontWeight={600} mb={1.5}>Оценка занятия *</Typography>
                <Rating
                  value={rating}
                  onChange={(_, v) => setRating(v)}
                  size="large"
                  sx={{ '& .MuiRating-iconFilled': { color: '#f59e0b' } }}
                />
                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                  {rating === null ? 'Выберите оценку' : rating === 5 ? 'Отлично!' : rating === 4 ? 'Хорошо' : rating === 3 ? 'Нормально' : rating === 2 ? 'Плохо' : 'Очень плохо'}
                </Typography>
              </Box>
              <TextField
                label="Комментарий (необязательно)"
                multiline rows={3} fullWidth
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Расскажите о занятии — что понравилось, что можно улучшить..."
              />
            </Stack>
          )}
        </DialogContent>
        {!reviewSuccess && (
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button variant="outlined" onClick={closeReview} sx={{ flex: 1 }}>Отмена</Button>
            <Button variant="contained" onClick={submitReview} disabled={reviewSaving || !rating} sx={{ flex: 1 }}>
              {reviewSaving ? 'Отправка...' : 'Отправить отзыв'}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={Boolean(deleteConfirmId)} onClose={() => setDeleteConfirmId(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Удалить отзыв?</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <Typography variant="body2" color="text.secondary">
            Отзыв будет удалён. Вы сможете оставить новый отзыв этому репетитору.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button variant="outlined" onClick={() => setDeleteConfirmId(null)} sx={{ flex: 1 }}>Отмена</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteConfirmId && deleteReview(deleteConfirmId)}
            sx={{ flex: 1 }}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
