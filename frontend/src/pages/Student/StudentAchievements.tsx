import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Stack, Chip,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LockIcon from '@mui/icons-material/Lock';
import { Achievement } from '../../types';
import { PageLoader } from '../../components/Common/LoadingSpinner';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import api from '../../api/client';

const LAVENDER_BG = '#F0EBF8';
const LAVENDER = '#7C5CBF';

const TYPE_LABELS: Record<string, string> = {
  SCORE_MILESTONE: 'Оценки',
  ATTENDANCE: 'Посещаемость',
  STREAK: 'Серии',
  SPECIAL: 'Особые',
};

export default function StudentAchievements() {
  const [earned, setEarned] = useState<(Achievement & { earnedAt: string })[]>([]);
  const [locked, setLocked] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    api.get('/progress/achievements')
      .then((r) => {
        setEarned(r.data.earned || []);
        setLocked(r.data.locked || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const types = ['all', ...new Set([...earned, ...locked].map((a) => a.type))];

  const filteredEarned = filter === 'all' ? earned : earned.filter((a) => a.type === filter);
  const filteredLocked = filter === 'all' ? locked : locked.filter((a) => a.type === filter);

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
        <EmojiEventsIcon sx={{ color: '#f59e0b', fontSize: 28 }} />
        <Typography variant="h4" fontWeight={700}>Достижения</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {earned.length} из {earned.length + locked.length} наград получено
      </Typography>

      {/* Filter */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        {types.map((t) => (
          <Chip
            key={t}
            label={t === 'all' ? 'Все' : TYPE_LABELS[t] || t}
            onClick={() => setFilter(t)}
            color={filter === t ? 'primary' : 'default'}
            sx={{ fontWeight: 500, cursor: 'pointer' }}
          />
        ))}
      </Box>

      {filteredEarned.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="body1" fontWeight={700} mb={2}>
            Получено ({filteredEarned.length})
          </Typography>
          <Grid container spacing={2}>
            {filteredEarned.map((a) => (
              <Grid item xs={6} sm={4} md={3} key={a.id}>
                <Card elevation={1} sx={{ height: '100%', border: '2px solid #D5C9EE' }}>
                  <CardContent sx={{ textAlign: 'center', p: 2.5 }}>
                    <Typography variant="h3" sx={{ mb: 1 }}>{a.icon}</Typography>
                    <Typography variant="body2" fontWeight={700} color="text.primary">{a.name}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, lineHeight: 1.4 }}>
                      {a.description}
                    </Typography>
                    <Chip
                      label={format(parseISO(a.earnedAt), 'd MMM yyyy', { locale: ru })}
                      size="small"
                      sx={{ mt: 1.5, bgcolor: LAVENDER_BG, color: LAVENDER, fontSize: 10 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {filteredLocked.length > 0 && (
        <Box>
          <Typography variant="body1" fontWeight={700} color="text.disabled" mb={2}>
            Ещё не получено ({filteredLocked.length})
          </Typography>
          <Grid container spacing={2}>
            {filteredLocked.map((a) => (
              <Grid item xs={6} sm={4} md={3} key={a.id}>
                <Card elevation={0} sx={{ height: '100%', bgcolor: '#F7F5FC', border: '1px dashed #D5C9EE', opacity: 0.7 }}>
                  <CardContent sx={{ textAlign: 'center', p: 2.5, position: 'relative' }}>
                    <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                      <LockIcon sx={{ fontSize: 14, color: '#C0B4E4' }} />
                    </Box>
                    <Typography variant="h3" sx={{ mb: 1, filter: 'grayscale(1)', opacity: 0.5 }}>{a.icon}</Typography>
                    <Typography variant="body2" fontWeight={600} color="text.disabled">{a.name}</Typography>
                    <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5, lineHeight: 1.4 }}>
                      {a.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {filteredEarned.length === 0 && filteredLocked.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
          <EmojiEventsIcon sx={{ fontSize: 56, opacity: 0.3, mb: 2 }} />
          <Typography variant="h6" fontWeight={600}>Нет достижений</Typography>
        </Box>
      )}
    </Box>
  );
}
