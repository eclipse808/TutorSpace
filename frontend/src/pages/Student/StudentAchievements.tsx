import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Stack, Chip, LinearProgress,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Achievement } from '../../types';
import { PageLoader } from '../../components/Common/LoadingSpinner';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import api from '../../api/client';

const LAVENDER_BG = '#F0EBF8';
const LAVENDER = '#7C5CBF';

const TYPE_LABELS: Record<string, string> = {
  SCORE_MILESTONE: 'Оценки',
  ATTENDANCE:      'Посещаемость',
  STREAK:          'Серии',
  SPECIAL:         'Особые',
};

const TYPE_COLORS: Record<string, string> = {
  SCORE_MILESTONE: '#22c55e',
  ATTENDANCE:      LAVENDER,
  STREAK:          '#f59e0b',
  SPECIAL:         '#3b82f6',
};

interface Stats { totalSessions: number; avgScore: number; xp: number; level: number; }

function getUnlockHint(ach: Achievement, stats: Stats | null): { text: string; progress?: number } {
  if (!stats) return { text: ach.description };
  const s = stats.totalSessions;
  const lvl = stats.level;

  if (ach.type === 'ATTENDANCE' && ach.sessionsRequired != null) {
    const need = ach.sessionsRequired;
    return {
      text: `Пройдите ${need} занятий (у вас ${s})`,
      progress: Math.min(100, (s / need) * 100),
    };
  }
  if (ach.type === 'SCORE_MILESTONE' && ach.threshold != null) {
    if (ach.name === 'Всесторонний')
      return { text: `Все компетенции выше ${ach.threshold}/10` };
    return { text: `Получите оценку ${ach.threshold}/10 хотя бы по одному навыку` };
  }
  if (ach.type === 'STREAK') {
    if (ach.name === 'Неделя рывка') return { text: 'Пройдите 5 занятий за одну неделю' };
    return { text: 'Пройдите 3 занятия за одну неделю' };
  }
  if (ach.type === 'SPECIAL') {
    if (ach.name === 'Полиглот')       return { text: 'Занятия по 2 и более разным предметам' };
    if (ach.name === 'Разносторонний') return { text: 'Занятия по 3 и более разным предметам' };
    if (ach.name === 'Первый отзыв')   return { text: 'Оставьте первый отзыв репетитору' };
    if (ach.name === 'Ступень III')    return { text: `Достигните 3-го уровня (сейчас ${lvl})`, progress: Math.min(100, (lvl / 3) * 100) };
    if (ach.name === 'Ступень V')      return { text: `Достигните 5-го уровня (сейчас ${lvl})`, progress: Math.min(100, (lvl / 5) * 100) };
    if (ach.name === 'Легендарный')    return { text: `Достигните 7-го уровня (сейчас ${lvl})`, progress: Math.min(100, (lvl / 7) * 100) };
    if (ach.name === 'Гений')          return { text: `Достигните 10-го уровня (сейчас ${lvl})`, progress: Math.min(100, (lvl / 10) * 100) };
  }
  return { text: ach.description };
}

export default function StudentAchievements() {
  const [earned, setEarned] = useState<(Achievement & { earnedAt: string })[]>([]);
  const [locked, setLocked] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    Promise.all([
      api.get('/progress/achievements').then((r) => {
        setEarned(r.data.earned || []);
        setLocked(r.data.locked || []);
      }),
      api.get('/progress/stats').then((r) => setStats(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const allTypes = ['all', ...new Set([...earned, ...locked].map((a) => a.type))];
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

      {/* Type filter */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        {allTypes.map((t) => (
          <Chip
            key={t}
            label={t === 'all' ? 'Все' : TYPE_LABELS[t] || t}
            onClick={() => setFilter(t)}
            color={filter === t ? 'primary' : 'default'}
            sx={{
              fontWeight: 500, cursor: 'pointer',
              ...(filter !== t && t !== 'all' ? { borderLeft: `3px solid ${TYPE_COLORS[t] || '#ccc'}` } : {}),
            }}
          />
        ))}
      </Box>

      {/* Earned */}
      {filteredEarned.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 18 }} />
            <Typography variant="body1" fontWeight={700}>Получено ({filteredEarned.length})</Typography>
          </Stack>
          <Grid container spacing={2}>
            {filteredEarned.map((a) => (
              <Grid item xs={6} sm={4} md={3} key={a.id}>
                <Card elevation={1} sx={{ height: '100%', border: `2px solid ${TYPE_COLORS[a.type] || '#D5C9EE'}22`, bgcolor: `${TYPE_COLORS[a.type] || LAVENDER}08` }}>
                  <CardContent sx={{ textAlign: 'center', p: 2.5 }}>
                    <Typography variant="h3" sx={{ mb: 1 }}>{a.icon}</Typography>
                    <Chip label={TYPE_LABELS[a.type] || a.type} size="small" sx={{ mb: 1, bgcolor: `${TYPE_COLORS[a.type]}22`, color: TYPE_COLORS[a.type] || LAVENDER, fontWeight: 600, fontSize: 10 }} />
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

      {/* Locked */}
      {filteredLocked.length > 0 && (
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <LockIcon sx={{ color: '#C0B4E4', fontSize: 18 }} />
            <Typography variant="body1" fontWeight={700} color="text.disabled">Ещё не получено ({filteredLocked.length})</Typography>
          </Stack>
          <Grid container spacing={2}>
            {filteredLocked.map((a) => {
              const hint = getUnlockHint(a, stats);
              return (
                <Grid item xs={6} sm={4} md={3} key={a.id}>
                  <Card elevation={0} sx={{ height: '100%', bgcolor: '#F7F5FC', border: '1px dashed #D5C9EE' }}>
                    <CardContent sx={{ textAlign: 'center', p: 2.5, position: 'relative' }}>
                      <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                        <LockIcon sx={{ fontSize: 14, color: '#C0B4E4' }} />
                      </Box>
                      <Typography variant="h3" sx={{ mb: 1, filter: 'grayscale(1)', opacity: 0.4 }}>{a.icon}</Typography>
                      <Chip label={TYPE_LABELS[a.type] || a.type} size="small" sx={{ mb: 1, bgcolor: '#EDE9F7', color: '#9B83CF', fontSize: 10 }} />
                      <Typography variant="body2" fontWeight={600} color="text.disabled">{a.name}</Typography>
                      <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5, lineHeight: 1.4 }}>
                        {hint.text}
                      </Typography>
                      {hint.progress !== undefined && (
                        <Box sx={{ mt: 1.5 }}>
                          <LinearProgress
                            variant="determinate"
                            value={hint.progress}
                            sx={{ height: 4, borderRadius: 2, bgcolor: '#E5E0F0', '& .MuiLinearProgress-bar': { bgcolor: LAVENDER, borderRadius: 2 } }}
                          />
                          <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                            {Math.round(hint.progress)}%
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
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
