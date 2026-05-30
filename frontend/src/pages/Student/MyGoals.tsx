import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Stack, Avatar, Tabs, Tab,
  Grid, Button, CircularProgress,
} from '@mui/material';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BoltIcon from '@mui/icons-material/Bolt';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { Goal, GoalDifficulty } from '../../types';
import { PageLoader } from '../../components/Common/LoadingSpinner';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import api from '../../api/client';

const DIFF_CONFIG: Record<GoalDifficulty, { label: string; color: 'success' | 'warning' | 'error' }> = {
  EASY: { label: 'Простая', color: 'success' },
  MEDIUM: { label: 'Средняя', color: 'warning' },
  HARD: { label: 'Сложная', color: 'error' },
};

const LAVENDER = '#7C5CBF';

export default function MyGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    api.get('/goals').then((r) => setGoals(r.data)).finally(() => setLoading(false));
  }, []);

  const handleRequestComplete = async (goalId: string) => {
    setRequesting(goalId);
    try {
      const res = await api.put(`/goals/${goalId}/request-complete`);
      setGoals((prev) => prev.map((g) => g.id === goalId ? { ...g, pendingConfirmation: res.data.pendingConfirmation } : g));
    } finally {
      setRequesting(null);
    }
  };

  if (loading) return <PageLoader />;

  const active = goals.filter((g) => !g.completed && !g.pendingConfirmation);
  const pending = goals.filter((g) => !g.completed && g.pendingConfirmation);
  const completed = goals.filter((g) => g.completed);

  // Tab indices: 0=all, 1=active, 2=pending(if any), 2or3=completed
  const tabItems = [
    { data: goals },
    { data: active },
    ...(pending.length > 0 ? [{ data: pending }] : []),
    { data: completed },
  ];
  const filtered = tabItems[tab]?.data ?? goals;
  const totalXpEarned = completed.reduce((s, g) => s + g.xpReward, 0);
  const totalXpPossible = [...active, ...pending].reduce((s, g) => s + g.xpReward, 0);

  const byTutor: Record<string, { tutorName: string; goals: Goal[] }> = {};
  filtered.forEach((g) => {
    const tid = g.tutorProfileId;
    if (!byTutor[tid]) byTutor[tid] = { tutorName: g.tutorProfile?.user.name || 'Репетитор', goals: [] };
    byTutor[tid].goals.push(g);
  });

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} color="text.primary">Мои цели</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Задания от репетиторов с наградами в XP</Typography>
      </Box>

      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <Card elevation={1}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight={700} color="text.primary">{active.length}</Typography>
              <Typography variant="caption" color="text.secondary">Активных</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card elevation={1}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight={700} color="success.main">{completed.length}</Typography>
              <Typography variant="caption" color="text.secondary">Выполнено</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card elevation={1}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.5}>
                <BoltIcon sx={{ color: '#f59e0b', fontSize: 18 }} />
                <Typography variant="h4" fontWeight={700} color="warning.main">{totalXpEarned}</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">XP заработано</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {totalXpPossible > 0 && (
        <Box sx={{ bgcolor: '#F0EBF8', border: '1px solid #D5C9EE', borderRadius: 2, px: 2, py: 1.5, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <BoltIcon sx={{ color: '#f59e0b', fontSize: 18, flexShrink: 0 }} />
          <Typography variant="body2" color="text.secondary">
            Выполните все активные цели и получите ещё <strong>+{totalXpPossible} XP</strong>
          </Typography>
        </Box>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`Все (${goals.length})`} />
        <Tab label={`Активные (${active.length})`} />
        {pending.length > 0 && <Tab label={`На проверке (${pending.length})`} sx={{ color: 'warning.main' }} />}
        <Tab label={`Выполнено (${completed.length})`} />
      </Tabs>

      {goals.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
          <TrackChangesIcon sx={{ fontSize: 56, opacity: 0.35, mb: 2 }} />
          <Typography variant="h6" fontWeight={600} mb={1}>Нет целей</Typography>
          <Typography variant="body2">Репетитор ещё не поставил вам заданий</Typography>
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Typography variant="body1">Нет целей в этой категории</Typography>
        </Box>
      ) : (
        <Stack spacing={4}>
          {Object.entries(byTutor).map(([tutorId, { tutorName, goals: tGoals }]) => (
            <Box key={tutorId}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: '#EEE9F8', color: LAVENDER, fontSize: 11, fontWeight: 700 }}>
                  {tutorName[0]}
                </Avatar>
                <Typography variant="subtitle2" fontWeight={600} color="text.primary">{tutorName}</Typography>
              </Stack>
              <Stack spacing={1.5}>
                {tGoals.map((goal) => (
                  <Card
                    key={goal.id}
                    elevation={1}
                    sx={{
                      bgcolor: goal.completed ? '#FAFAFA' : goal.pendingConfirmation ? '#FFFBEB' : 'white',
                      border: goal.pendingConfirmation ? '1px solid #FDE68A' : '1px solid transparent',
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Box sx={{ mt: 0.5, flexShrink: 0 }}>
                          {goal.completed
                            ? <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />
                            : goal.pendingConfirmation
                              ? <HourglassEmptyIcon sx={{ fontSize: 20, color: '#d97706' }} />
                              : <RadioButtonUncheckedIcon sx={{ fontSize: 20, color: '#D5C9EE' }} />
                          }
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                            <Typography variant="body1" fontWeight={600}
                              sx={{ color: goal.completed ? 'text.disabled' : 'text.primary', textDecoration: goal.completed ? 'line-through' : 'none' }}>
                              {goal.title}
                            </Typography>
                            <Stack direction="row" spacing={0.75} flexShrink={0}>
                              <Chip label={DIFF_CONFIG[goal.difficulty].label} size="small" color={DIFF_CONFIG[goal.difficulty].color} variant="outlined" />
                              <Chip
                                icon={<BoltIcon sx={{ fontSize: '12px !important' }} />}
                                label={`${goal.completed ? '' : '+'}${goal.xpReward} XP`}
                                size="small"
                                sx={{ bgcolor: goal.completed ? '#F0FDF4' : '#FEFCE8', color: goal.completed ? 'success.main' : 'warning.main', fontWeight: 600 }}
                              />
                            </Stack>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">{goal.subject}</Typography>
                          {goal.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>{goal.description}</Typography>
                          )}
                          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              {goal.completed ? (
                                <>
                                  <CheckCircleIcon sx={{ fontSize: 12, color: 'success.main' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    Выполнено {goal.completedAt && format(parseISO(goal.completedAt), 'd MMMM', { locale: ru })}
                                  </Typography>
                                </>
                              ) : goal.pendingConfirmation ? (
                                <>
                                  <HourglassEmptyIcon sx={{ fontSize: 12, color: '#d97706' }} />
                                  <Typography variant="caption" sx={{ color: '#d97706', fontWeight: 500 }}>
                                    Ожидает подтверждения репетитора
                                  </Typography>
                                </>
                              ) : (
                                <>
                                  <AccessTimeIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    Поставлена {format(parseISO(goal.createdAt), 'd MMMM', { locale: ru })}
                                  </Typography>
                                </>
                              )}
                            </Stack>
                            {!goal.completed && !goal.pendingConfirmation && (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleRequestComplete(goal.id)}
                                disabled={requesting === goal.id}
                                startIcon={requesting === goal.id ? <CircularProgress size={12} /> : <CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                                sx={{ borderColor: '#D5C9EE', color: LAVENDER, '&:hover': { bgcolor: '#F0EBF8', borderColor: LAVENDER }, fontSize: 12 }}
                              >
                                Отметить как выполненное
                              </Button>
                            )}
                          </Stack>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
