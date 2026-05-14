import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Avatar, Stack, Chip, Grid,
  LinearProgress, Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import StarIcon from '@mui/icons-material/Star';
import { Achievement } from '../../types';
import { PageLoader } from '../../components/Common/LoadingSpinner';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import api from '../../api/client';

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1700, 2400, 3200, 4200];
const LEVEL_NAMES = ['Новичок', 'Ученик', 'Знаток', 'Эксперт', 'Мастер', 'Гуру', 'Легенда', 'Чемпион', 'Виртуоз', 'Гений'];

const LAVENDER = '#7C5CBF';
const LAVENDER_BG = '#F0EBF8';

interface PublicProfile {
  id: string;
  user: { id: string; name: string; avatar?: string; xp: number; level: number };
  completedSessions: number;
  achievements: (Achievement & { earnedAt: string })[];
}

function getLevelProgress(xp: number, level: number) {
  const cur = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const next = LEVEL_THRESHOLDS[level] ?? cur + 1000;
  return {
    progress: Math.min(100, Math.max(0, ((xp - cur) / (next - cur)) * 100)),
    name: LEVEL_NAMES[level - 1] ?? 'Легенда',
  };
}

export default function StudentPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/students/${id}/public`)
      .then((r) => setProfile(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;
  if (notFound || !profile) {
    return (
      <Box sx={{ textAlign: 'center', py: 12, color: 'text.secondary' }}>
        <Typography variant="h6">Профиль не найден</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>Назад</Button>
      </Box>
    );
  }

  const { user, completedSessions, achievements } = profile;
  const li = getLevelProgress(user.xp, user.level);

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 3, color: 'text.secondary' }}>
        Назад
      </Button>

      {/* Profile header */}
      <Card elevation={0} sx={{ background: 'linear-gradient(135deg, #7C5CBF, #6A4DAD)', color: 'white', mb: 3, border: 'none' }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: 'rgba(255,255,255,0.25)', fontSize: 22, fontWeight: 700, flexShrink: 0 }}>
              {user.avatar || user.name.slice(0, 2).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: 'white' }}>{user.name}</Typography>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 1 }}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <StarIcon sx={{ fontSize: 16, color: '#fbbf24' }} />
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                    Уровень {user.level}
                  </Typography>
                </Stack>
                <Chip
                  label={li.name}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 11, height: 22 }}
                />
              </Stack>
              <Box sx={{ mt: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={li.progress}
                  sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#fbbf24', borderRadius: 3 } }}
                />
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Stats row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Card elevation={1}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} mb={0.5}>
                <MenuBookIcon sx={{ fontSize: 20, color: LAVENDER }} />
                <Typography variant="h4" fontWeight={700} color="primary">{completedSessions}</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">Занятий пройдено</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card elevation={1}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} mb={0.5}>
                <EmojiEventsIcon sx={{ fontSize: 20, color: '#f59e0b' }} />
                <Typography variant="h4" fontWeight={700} color="primary">{achievements.length}</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">Достижений</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Achievements */}
      <Card elevation={1}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" mb={2}>
            <EmojiEventsIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
            <Typography variant="h6" fontWeight={700}>Достижения</Typography>
          </Stack>
          {achievements.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <EmojiEventsIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
              <Typography variant="body2">Пока нет достижений</Typography>
            </Box>
          ) : (
            <Grid container spacing={1.5}>
              {achievements.map((a) => (
                <Grid item xs={6} sm={4} key={a.id}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: LAVENDER_BG, borderRadius: 2 }}>
                    <Typography variant="h4" sx={{ mb: 0.5 }}>{a.icon}</Typography>
                    <Typography variant="body2" fontWeight={700} color="text.primary" noWrap>{a.name}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                      {format(parseISO(a.earnedAt), 'd MMM yyyy', { locale: ru })}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
