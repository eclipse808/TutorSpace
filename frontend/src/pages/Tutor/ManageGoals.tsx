import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Stack, Chip, Alert,
  TextField, Select, MenuItem, FormControl, InputLabel, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BoltIcon from '@mui/icons-material/Bolt';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { Goal, GoalDifficulty, StudentProfile } from '../../types';
import { PageLoader } from '../../components/Common/LoadingSpinner';
import api from '../../api/client';

const LAVENDER = '#7C5CBF';
const LAVENDER_BG = '#F0EBF8';

const DIFF_CONFIG: Record<GoalDifficulty, { label: string; xp: number; color: 'success' | 'warning' | 'error' }> = {
  EASY: { label: 'Простая', xp: 15, color: 'success' },
  MEDIUM: { label: 'Средняя', xp: 30, color: 'warning' },
  HARD: { label: 'Сложная', xp: 50, color: 'error' },
};

interface GoalForm { title: string; description: string; subject: string; difficulty: GoalDifficulty; }

export default function ManageGoals() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tutorSubjects, setTutorSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [form, setForm] = useState<GoalForm>({ title: '', description: '', subject: '', difficulty: 'MEDIUM' });
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/tutors/me/students').then((r) => {
        setStudents(r.data);
        if (r.data.length > 0) setSelectedStudent(r.data[0].id);
      }),
      api.get('/tutors/me/profile').then((r) => {
        setTutorSubjects(r.data.subjects || []);
        if (r.data.subjects?.length > 0) setForm((f) => ({ ...f, subject: r.data.subjects[0] }));
      }),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedStudent) return;
    api.get(`/goals?studentProfileId=${selectedStudent}`).then((r) => setGoals(r.data));
  }, [selectedStudent]);

  const resetForm = () => { setForm({ title: '', description: '', subject: tutorSubjects[0] || '', difficulty: 'MEDIUM' }); setShowForm(false); setError(''); };

  const handleCreate = async () => {
    if (!form.title || !form.subject || !selectedStudent) { setError('Заполните все обязательные поля'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/goals', { ...form, studentProfileId: selectedStudent });
      const r = await api.get(`/goals?studentProfileId=${selectedStudent}`);
      setGoals(r.data);
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (goalId: string) => {
    setActionId(goalId);
    try {
      await api.put(`/goals/${goalId}/complete`);
      setGoals((prev) => prev.map((g) => g.id === goalId ? { ...g, completed: true, completedAt: new Date().toISOString(), pendingConfirmation: false } : g));
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (goalId: string) => {
    setActionId(goalId + '_reject');
    try {
      await api.put(`/goals/${goalId}/reject-complete`);
      setGoals((prev) => prev.map((g) => g.id === goalId ? { ...g, pendingConfirmation: false } : g));
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (goalId: string) => {
    if (!confirm('Удалить цель?')) return;
    await api.delete(`/goals/${goalId}`);
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  const awaitingConfirmation = goals.filter((g) => !g.completed && g.pendingConfirmation);
  const pending = goals.filter((g) => !g.completed && !g.pendingConfirmation);
  const completed = goals.filter((g) => g.completed);
  const currentStudent = students.find((s) => s.id === selectedStudent);

  if (loading) return <PageLoader />;

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Цели учеников</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>Ставьте задачи и подтверждайте выполнение</Typography>
        </Box>
        {selectedStudent && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowForm(true)}>
            Новая цель
          </Button>
        )}
      </Stack>

      {students.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 12, color: 'text.secondary' }}>
          <TrackChangesIcon sx={{ fontSize: 56, opacity: 0.35, mb: 2 }} />
          <Typography variant="h6" fontWeight={600} mb={1}>Нет учеников</Typography>
          <Typography variant="body2">Цели появятся после первых записей на занятия</Typography>
        </Box>
      ) : (
        <>
          {/* Student selector */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {students.map((s) => (
              <Chip
                key={s.id}
                avatar={<Box component="span" sx={{ bgcolor: 'rgba(255,255,255,0.3)', borderRadius: '50%', px: 0.5, fontSize: 10 }}>{s.user.avatar || s.user.name[0]}</Box>}
                label={s.user.name.split(' ')[0]}
                onClick={() => setSelectedStudent(s.id)}
                color={selectedStudent === s.id ? 'primary' : 'default'}
                sx={{ fontWeight: 600 }}
              />
            ))}
          </Box>

          {goals.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
              <TrackChangesIcon sx={{ fontSize: 44, opacity: 0.35, mb: 1.5 }} />
              <Typography variant="body1" fontWeight={500}>Нет целей для этого ученика</Typography>
              <Typography variant="body2" mt={0.5}>Нажмите «Новая цель», чтобы поставить первое задание</Typography>
            </Box>
          ) : (
            <Stack spacing={3}>
              {/* Awaiting confirmation section */}
              {awaitingConfirmation.length > 0 && (
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <HourglassEmptyIcon sx={{ fontSize: 16, color: '#d97706' }} />
                    <Typography variant="overline" sx={{ color: '#d97706', fontWeight: 700, letterSpacing: 1 }}>
                      Ожидает подтверждения ({awaitingConfirmation.length})
                    </Typography>
                  </Stack>
                  <Stack spacing={1.5}>
                    {awaitingConfirmation.map((goal) => (
                      <Card key={goal.id} elevation={1} sx={{ border: '1px solid #FDE68A', bgcolor: '#FFFBEB' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Stack direction="row" spacing={2} alignItems="flex-start">
                            <HourglassEmptyIcon sx={{ mt: 0.5, color: '#d97706', flexShrink: 0 }} />
                            <Box sx={{ flex: 1 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                                <Typography variant="body1" fontWeight={600}>{goal.title}</Typography>
                                <Stack direction="row" spacing={0.75}>
                                  <Chip label={DIFF_CONFIG[goal.difficulty].label} size="small" color={DIFF_CONFIG[goal.difficulty].color} variant="outlined" />
                                  <Chip icon={<BoltIcon sx={{ fontSize: '12px !important' }} />} label={`+${goal.xpReward} XP`} size="small" sx={{ bgcolor: '#FEFCE8', color: 'warning.main', fontWeight: 600 }} />
                                </Stack>
                              </Stack>
                              <Typography variant="caption" color="text.secondary">{goal.subject}</Typography>
                              {goal.description && <Typography variant="body2" color="text.secondary" mt={0.75}>{goal.description}</Typography>}
                            </Box>
                          </Stack>
                          <Stack direction="row" spacing={1} sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #FDE68A' }}>
                            <Button
                              size="small"
                              startIcon={<CheckCircleIcon />}
                              onClick={() => handleComplete(goal.id)}
                              disabled={actionId === goal.id}
                              variant="contained"
                              color="success"
                              sx={{ flex: 1 }}
                            >
                              {actionId === goal.id ? '...' : 'Подтвердить'}
                            </Button>
                            <Button
                              size="small"
                              startIcon={<CancelIcon />}
                              onClick={() => handleReject(goal.id)}
                              disabled={actionId === goal.id + '_reject'}
                              variant="outlined"
                              color="warning"
                              sx={{ flex: 1 }}
                            >
                              {actionId === goal.id + '_reject' ? '...' : 'Отклонить'}
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Active goals */}
              {pending.length > 0 && (
                <Box>
                  <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 1 }}>
                    В процессе ({pending.length})
                  </Typography>
                  <Stack spacing={1.5} sx={{ mt: 1 }}>
                    {pending.map((goal) => (
                      <Card key={goal.id} elevation={1}>
                        <CardContent sx={{ p: 2 }}>
                          <Stack direction="row" spacing={2} alignItems="flex-start">
                            <RadioButtonUncheckedIcon sx={{ mt: 0.5, color: '#D5C9EE', flexShrink: 0 }} />
                            <Box sx={{ flex: 1 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                                <Typography variant="body1" fontWeight={600}>{goal.title}</Typography>
                                <Stack direction="row" spacing={0.75}>
                                  <Chip label={DIFF_CONFIG[goal.difficulty].label} size="small" color={DIFF_CONFIG[goal.difficulty].color} variant="outlined" />
                                  <Chip icon={<BoltIcon sx={{ fontSize: '12px !important' }} />} label={`+${goal.xpReward} XP`} size="small" sx={{ bgcolor: '#FEFCE8', color: 'warning.main', fontWeight: 600 }} />
                                </Stack>
                              </Stack>
                              <Typography variant="caption" color="text.secondary">{goal.subject}</Typography>
                              {goal.description && <Typography variant="body2" color="text.secondary" mt={0.75}>{goal.description}</Typography>}
                            </Box>
                          </Stack>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #F7F5FC' }}>
                            <Button
                              size="small"
                              startIcon={<CheckCircleIcon />}
                              onClick={() => handleComplete(goal.id)}
                              disabled={actionId === goal.id}
                              sx={{ bgcolor: '#F0FDF4', color: 'success.main', '&:hover': { bgcolor: '#DCFCE7' } }}
                            >
                              {actionId === goal.id ? '...' : 'Отметить выполненной'}
                            </Button>
                            <IconButton size="small" onClick={() => handleDelete(goal.id)} sx={{ ml: 'auto', color: 'text.disabled', '&:hover': { color: 'error.main', bgcolor: '#FEF2F2' } }}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Completed */}
              {completed.length > 0 && (
                <Box>
                  <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 1 }}>
                    Выполнено ({completed.length})
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {completed.map((goal) => (
                      <Card key={goal.id} elevation={0} sx={{ bgcolor: '#FAFAFA', opacity: 0.8 }}>
                        <CardContent sx={{ p: 2 }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <CheckCircleIcon sx={{ color: 'success.main', fontSize: 18, flexShrink: 0 }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={500} color="text.disabled" sx={{ textDecoration: 'line-through' }}>{goal.title}</Typography>
                              <Typography variant="caption" color="text.disabled">{goal.subject}</Typography>
                            </Box>
                            <Chip icon={<BoltIcon sx={{ fontSize: '12px !important' }} />} label={`+${goal.xpReward} XP`} size="small" sx={{ bgcolor: '#F0FDF4', color: 'success.main', fontWeight: 600 }} />
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}
        </>
      )}

      {/* Create dialog */}
      <Dialog open={showForm} onClose={resetForm} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          Новая цель для {currentStudent?.user.name.split(' ')[0]}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Название цели *"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Освоить Present Simple"
              required
            />
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Предмет *</InputLabel>
                <Select value={form.subject} label="Предмет *" onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}>
                  {tutorSubjects.length > 0 ? (
                    tutorSubjects.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)
                  ) : (
                    <MenuItem value="" disabled>Нет предметов</MenuItem>
                  )}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Сложность</InputLabel>
                <Select value={form.difficulty} label="Сложность" onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as GoalDifficulty }))}>
                  <MenuItem value="EASY">Простая (+15 XP)</MenuItem>
                  <MenuItem value="MEDIUM">Средняя (+30 XP)</MenuItem>
                  <MenuItem value="HARD">Сложная (+50 XP)</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label="Описание (необязательно)"
              multiline
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Подробнее о задании..."
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: LAVENDER_BG, borderRadius: 2, px: 2, py: 1.5 }}>
              <BoltIcon sx={{ color: '#f59e0b', fontSize: 18 }} />
              <Typography variant="body2" color="text.secondary">
                За выполнение ученик получит <strong>{DIFF_CONFIG[form.difficulty].xp} XP</strong>
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button variant="outlined" onClick={resetForm} sx={{ flex: 1 }}>Отмена</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving} sx={{ flex: 1 }}>
            {saving ? 'Сохранение...' : 'Создать цель'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
