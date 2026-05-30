import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Stack, Avatar, Button, TextField,
  Rating, Chip, Alert, Divider, Collapse,
} from '@mui/material';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ReplyIcon from '@mui/icons-material/Reply';
import StarIcon from '@mui/icons-material/Star';
import { Review } from '../../types';
import { PageLoader } from '../../components/Common/LoadingSpinner';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import api from '../../api/client';

const LAVENDER = '#7C5CBF';
const LAVENDER_BG = '#F0EBF8';

export default function TutorReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/reviews/received').then((r) => setReviews(r.data)).finally(() => setLoading(false));
  }, []);

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSavingId(reviewId);
    setError('');
    try {
      const { data } = await api.put(`/reviews/${reviewId}/reply`, { tutorReply: replyText });
      setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, tutorReply: data.tutorReply } : r));
      setReplyingId(null);
      setReplyText('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSavingId(null);
    }
  };

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  if (loading) return <PageLoader />;

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Отзывы</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>Отзывы учеников и ваши ответы</Typography>
        </Box>
      </Stack>

      {reviews.length > 0 && (
        <Card elevation={1} sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
              <Box sx={{ textAlign: 'center', minWidth: 100 }}>
                <Typography variant="h2" fontWeight={800} sx={{ color: LAVENDER, lineHeight: 1 }}>{avgRating}</Typography>
                <Rating value={Number(avgRating)} readOnly precision={0.1} sx={{ mt: 0.5, '& .MuiRating-iconFilled': { color: '#f59e0b' } }} />
                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                  {reviews.length} {reviews.length === 1 ? 'отзыв' : reviews.length < 5 ? 'отзыва' : 'отзывов'}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
              <Box sx={{ flex: 1 }}>
                {ratingDist.map(({ star, count }) => (
                  <Stack key={star} direction="row" spacing={1.5} alignItems="center" mb={0.5}>
                    <Stack direction="row" spacing={0.25} alignItems="center" sx={{ minWidth: 30 }}>
                      <Typography variant="caption" fontWeight={600}>{star}</Typography>
                      <StarIcon sx={{ fontSize: 12, color: '#f59e0b' }} />
                    </Stack>
                    <Box sx={{ flex: 1, height: 8, bgcolor: '#EDE9F7', borderRadius: 4, overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', bgcolor: '#f59e0b', borderRadius: 4, width: reviews.length ? `${(count / reviews.length) * 100}%` : 0, transition: 'width 0.5s' }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 20, textAlign: 'right' }}>{count}</Typography>
                  </Stack>
                ))}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {reviews.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 12, color: 'text.secondary' }}>
          <RateReviewIcon sx={{ fontSize: 56, opacity: 0.35, mb: 2 }} />
          <Typography variant="h6" fontWeight={600} mb={1}>Пока нет отзывов</Typography>
          <Typography variant="body2">Отзывы появятся после занятий с учениками</Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {reviews.map((review) => (
            <Card key={review.id} elevation={1}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar
                    component={Link}
                    to={`/students/${review.studentProfileId}`}
                    src={review.studentProfile?.photoUrl || undefined}
                    sx={{ width: 44, height: 44, bgcolor: LAVENDER_BG, color: LAVENDER, fontWeight: 700, textDecoration: 'none', cursor: 'pointer', transition: 'opacity 0.2s', '&:hover': { opacity: 0.8 } }}
                  >
                    {review.studentProfile?.user.name?.slice(0, 2).toUpperCase() || '?'}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                      <Box>
                        <Typography
                          component={Link}
                          to={`/students/${review.studentProfileId}`}
                          variant="body1"
                          fontWeight={600}
                          sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { color: LAVENDER } }}
                        >
                          {review.studentProfile?.user.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(parseISO(review.createdAt), 'd MMMM yyyy', { locale: ru })}
                        </Typography>
                      </Box>
                      <Rating value={review.rating} readOnly size="small" sx={{ '& .MuiRating-iconFilled': { color: '#f59e0b' } }} />
                    </Stack>

                    {review.text && (
                      <Typography variant="body2" color="text.secondary" mt={1.5}>{review.text}</Typography>
                    )}

                    {review.tutorReply ? (
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #F7F5FC' }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <ReplyIcon sx={{ fontSize: 14, color: LAVENDER }} />
                          <Typography variant="caption" fontWeight={700} color="primary">Ваш ответ</Typography>
                        </Stack>
                        <Box sx={{ bgcolor: LAVENDER_BG, borderRadius: 2, px: 2, py: 1.5 }}>
                          <Typography variant="body2" color="text.secondary">{review.tutorReply}</Typography>
                        </Box>
                        <Button
                          size="small"
                          sx={{ mt: 1, color: 'text.disabled', fontSize: 11 }}
                          onClick={() => { setReplyingId(review.id); setReplyText(review.tutorReply || ''); }}
                        >
                          Изменить ответ
                        </Button>
                      </Box>
                    ) : (
                      <Box sx={{ mt: 1.5 }}>
                        {replyingId !== review.id ? (
                          <Button
                            size="small"
                            startIcon={<ReplyIcon />}
                            onClick={() => { setReplyingId(review.id); setReplyText(''); }}
                            sx={{ color: 'text.secondary', '&:hover': { color: LAVENDER } }}
                          >
                            Ответить
                          </Button>
                        ) : null}
                      </Box>
                    )}

                    <Collapse in={replyingId === review.id}>
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #F7F5FC' }}>
                        <TextField
                          fullWidth
                          multiline
                          rows={2}
                          size="small"
                          placeholder="Напишите ответ ученику..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          sx={{ mb: 1.5 }}
                        />
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleReply(review.id)}
                            disabled={savingId === review.id || !replyText.trim()}
                          >
                            {savingId === review.id ? 'Сохранение...' : 'Опубликовать'}
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => { setReplyingId(null); setReplyText(''); }}
                          >
                            Отмена
                          </Button>
                        </Stack>
                      </Box>
                    </Collapse>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
