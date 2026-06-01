import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardActions, Box, Typography, Avatar, Chip, Button, Rating, Stack, Tooltip } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SchoolIcon from '@mui/icons-material/School';
import { TutorProfile } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { isEliteTutor, getTutorPublicBadge } from '../../utils/tutorBadges';

const LAVENDER = '#7C5CBF';
const LAVENDER_BG = '#F0EBF8';

export default function TutorCard({ tutor }: { tutor: TutorProfile }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const xp = tutor.user?.xp ?? 0;
  const elite = isEliteTutor(xp);
  const publicBadge = getTutorPublicBadge(xp);

  return (
    <Card
      elevation={elite ? 2 : 1}
      sx={{
        height: '100%', display: 'flex', flexDirection: 'column', transition: 'all 0.25s',
        '&:hover': { boxShadow: '0 8px 24px rgba(124,92,191,0.18)', transform: 'translateY(-2px)' },
        ...(elite ? { border: '1.5px solid #FFB300', boxShadow: '0 0 0 2px #FFB30033' } : {}),
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            {tutor.photoUrl ? (
              <Box component="img" src={tutor.photoUrl} alt={tutor.user.name}
                sx={{ width: 56, height: 56, borderRadius: 2, objectFit: 'cover',
                  ...(elite ? { outline: '2px solid #FFB300', outlineOffset: 2 } : {}),
                }} />
            ) : (
              <Avatar sx={{ width: 56, height: 56, bgcolor: LAVENDER_BG, color: LAVENDER, borderRadius: 2, fontSize: 16, fontWeight: 700,
                ...(elite ? { outline: '2px solid #FFB300', outlineOffset: 2 } : {}),
              }}>
                {tutor.user.avatar || tutor.user.name.slice(0, 2).toUpperCase()}
              </Avatar>
            )}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
              <Typography variant="subtitle1" fontWeight={700} color="text.primary" noWrap>{tutor.user.name}</Typography>
              {publicBadge && (
                <Tooltip title="Статус за активность на платформе" arrow>
                  <Chip
                    label={publicBadge.label}
                    size="small"
                    sx={{ fontSize: 10, height: 18, px: 0.25, bgcolor: publicBadge.bgColor, color: publicBadge.color, fontWeight: 700, border: `1px solid ${publicBadge.borderColor}`, cursor: 'default' }}
                  />
                </Tooltip>
              )}
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
              <Rating value={tutor.rating} precision={0.1} size="small" readOnly sx={{ fontSize: '1rem' }} />
              <Typography variant="caption" color="text.secondary">({tutor.reviewCount})</Typography>
            </Stack>
          </Box>
          {tutor.hourlyRate && (
            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
              <Typography variant="subtitle2" fontWeight={700} color="text.primary">{tutor.hourlyRate.toLocaleString('ru')} ₽</Typography>
              <Typography variant="caption" color="text.secondary">/ час</Typography>
            </Box>
          )}
        </Stack>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
          {tutor.subjects.slice(0, 3).map((s) => (
            <Chip key={s} label={s} size="small" sx={{ bgcolor: LAVENDER_BG, color: LAVENDER, fontWeight: 500, fontSize: 11 }} />
          ))}
          {tutor.subjects.length > 3 && (
            <Chip label={`+${tutor.subjects.length - 3}`} size="small" sx={{ bgcolor: '#F7F5FC', color: '#9B83CF', fontSize: 11 }} />
          )}
        </Box>

        {tutor.bio && (
          <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 1 }}>
            {tutor.bio}
          </Typography>
        )}

        {tutor.education && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <SchoolIcon sx={{ fontSize: 13, color: '#9B83CF' }} />
            <Typography variant="caption" color="text.secondary" noWrap>{tutor.education}</Typography>
          </Stack>
        )}
      </CardContent>

      <CardActions sx={{ pt: 0, px: 2, pb: 2, borderTop: '1px solid #F0EBF8', justifyContent: 'space-between' }}>
        {tutor.experience != null && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <AccessTimeIcon sx={{ fontSize: 14, color: '#9B83CF' }} />
            <Typography variant="caption" color="text.secondary">
              {tutor.experience} {tutor.experience === 1 ? 'год' : tutor.experience < 5 ? 'года' : 'лет'} опыта
            </Typography>
          </Stack>
        )}
        <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
          <Button component={Link} to={`/tutors/${tutor.id}`} variant="outlined" size="small" color="primary">
            Подробнее
          </Button>
          {user?.role === 'STUDENT' && (
            <Button variant="contained" size="small" color="primary" onClick={() => navigate(`/tutors/${tutor.id}`)}>
              Записаться
            </Button>
          )}
        </Stack>
      </CardActions>
    </Card>
  );
}
