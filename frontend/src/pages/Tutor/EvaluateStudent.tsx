import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, Stack, Avatar,
  Alert, Chip, Slider, TextField, LinearProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import TrophyIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import { CompetencyCriteria, CompetencyScore, Session, Achievement } from '../../types';
import { PageLoader } from '../../components/Common/LoadingSpinner';
import AchievementCard from '../../components/Progress/AchievementCard';
import api from '../../api/client';

const LAVENDER = '#7C5CBF';
const LAVENDER_BG = '#F0EBF8';

export default function EvaluateStudent() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [criteria, setCriteria] = useState<CompetencyCriteria[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [prevScores, setPrevScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/sessions/${sessionId}`).then(async (r) => {
      const s = r.data;
      setSession(s);

      const tutorId = s.tutorProfile?.id;
      if (tutorId) {
        const [criteriaRes, scoresRes] = await Promise.all([
          api.get(`/competencies/criteria?tutorId=${tutorId}`),
          api.get(`/competencies/scores/${s.studentProfileId}?tutorId=${tutorId}`),
        ]);

        const subjectCriteria: CompetencyCriteria[] = criteriaRes.data.filter(
          (cr: CompetencyCriteria) => cr.subject === s.subject
        );
        const finalCriteria = subjectCriteria.length > 0 ? subjectCriteria : criteriaRes.data;
        setCriteria(finalCriteria);

        const initial: Record<string, number> = {};
        finalCriteria.forEach((cr: CompetencyCriteria) => { initial[cr.id] = 5; });
        setScores(initial);

        const prev: Record<string, number> = {};
        (scoresRes.data as CompetencyScore[]).forEach((sc) => { prev[sc.criteriaId] = sc.score; });
        setPrevScores(prev);
      }
    }).finally(() => setLoading(false));
  }, [sessionId]);

  const handleSubmit = async () => {
    if (!session) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/competencies/evaluate', {
        sessionId,
        studentProfileId: session.studentProfileId,
        scores: criteria.map((c) => ({ criteriaId: c.id, score: scores[c.id] ?? 5, note: notes[c.id] || undefined })),
      });
      setNewAchievements(data.newAchievements || []);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const getDelta = (criteriaId: string) => {
    const prev = prevScores[criteriaId];
    if (prev === undefined) return null;
    return scores[criteriaId] - prev;
  };

  const scoreColor = (v: number) => v >= 8 ? '#22c55e' : v >= 5 ? LAVENDER : v >= 3 ? '#f59e0b' : '#ef4444';

  if (loading) return <PageLoader />;
  if (!session) return (
    <Box sx={{ textAlign: 'center', py: 20, color: 'text.secondary' }}>
      <Typography variant="h6">Занятие не найдено</Typography>
    </Box>
  );

  if (success) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', textAlign: 'center', py: 8 }}>
        <Typography sx={{ fontSize: '4rem', mb: 2 }}>✅</Typography>
        <Typography variant="h4" fontWeight={700} mb={1}>Оценки сохранены!</Typography>
        <Typography color="text.secondary" mb={4}>Ученик увидит прогресс в своём кабинете</Typography>
        {newAchievements.length > 0 && (
          <Card elevation={1} sx={{ mb: 4, textAlign: 'left' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <TrophyIcon sx={{ color: '#f59e0b' }} />
                <Typography variant="subtitle1" fontWeight={600}>Ученик получил новые достижения!</Typography>
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                {newAchievements.map((a: Achievement) => (
                  <AchievementCard key={a.id} achievement={a} />
                ))}
              </Box>
            </CardContent>
          </Card>
        )}
        <Button variant="contained" size="large" onClick={() => navigate('/tutor/sessions')}>
          Вернуться к журналу
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 3, color: 'text.secondary' }}>
        Назад
      </Button>

      <Card elevation={1} sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ width: 52, height: 52, bgcolor: LAVENDER_BG, color: LAVENDER, fontWeight: 700 }}>
              {session.studentProfile?.user.avatar || session.studentProfile?.user.name?.[0]}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>{session.studentProfile?.user.name}</Typography>
              <Typography variant="body2" color="text.secondary">{session.subject} · Оценка компетенций</Typography>
            </Box>
          </Stack>
          {Object.keys(prevScores).length > 0 && (
            <Stack direction="row" alignItems="center" spacing={0.75} mt={1.5} pt={1.5} sx={{ borderTop: '1px solid #F7F5FC' }}>
              <TrendingUpIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary">
                Показаны изменения относительно предыдущей оценки
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {criteria.length === 0 ? (
        <Card elevation={1}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary" mb={2}>Нет критериев для этого предмета</Typography>
            <Button variant="contained" onClick={() => navigate('/tutor/criteria')}>
              Добавить критерии
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {criteria.map((c) => {
            const delta = getDelta(c.id);
            const hasPrev = prevScores[c.id] !== undefined;
            const currentScore = scores[c.id] ?? 5;

            return (
              <Card key={c.id} elevation={1}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" fontWeight={700}>{c.name}</Typography>
                      {c.description && (
                        <Typography variant="caption" color="text.secondary">{c.description}</Typography>
                      )}
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center" ml={2}>
                      {hasPrev && delta !== null && (
                        <Chip
                          size="small"
                          icon={delta > 0 ? <TrendingUpIcon sx={{ fontSize: '14px !important' }} /> : delta < 0 ? <TrendingDownIcon sx={{ fontSize: '14px !important' }} /> : <RemoveIcon sx={{ fontSize: '14px !important' }} />}
                          label={delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                          color={delta > 0 ? 'success' : delta < 0 ? 'error' : 'default'}
                          variant="outlined"
                        />
                      )}
                      {!hasPrev && (
                        <Chip size="small" label="первый раз" variant="outlined" sx={{ color: 'text.disabled', borderColor: '#E5E7EB' }} />
                      )}
                      <Typography variant="h5" fontWeight={800} sx={{ color: scoreColor(currentScore), minWidth: 52, textAlign: 'right' }}>
                        {currentScore}<Typography component="span" variant="caption" color="text.disabled" fontWeight={400}>/10</Typography>
                      </Typography>
                    </Stack>
                  </Stack>

                  <Box sx={{ px: 0.5, mb: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={currentScore * 10}
                      sx={{ height: 6, borderRadius: 3, bgcolor: '#EDE9F7', '& .MuiLinearProgress-bar': { bgcolor: scoreColor(currentScore), borderRadius: 3 } }}
                    />
                  </Box>

                  <Slider
                    min={0} max={10} step={0.5}
                    value={currentScore}
                    onChange={(_, v) => setScores((p) => ({ ...p, [c.id]: v as number }))}
                    sx={{ color: scoreColor(currentScore), '& .MuiSlider-thumb': { boxShadow: `0 0 0 6px ${scoreColor(currentScore)}22` } }}
                  />

                  <Stack direction="row" flexWrap="wrap" gap={0.75} mb={2}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                      <Chip
                        key={v}
                        label={v}
                        size="small"
                        onClick={() => setScores((p) => ({ ...p, [c.id]: v }))}
                        sx={{
                          cursor: 'pointer',
                          fontWeight: currentScore === v ? 700 : 400,
                          bgcolor: currentScore === v ? LAVENDER : '#F7F5FC',
                          color: currentScore === v ? 'white' : 'text.secondary',
                          '&:hover': { bgcolor: currentScore === v ? '#6A4DAD' : '#EDE9F7' },
                        }}
                      />
                    ))}
                  </Stack>

                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Комментарий (необязательно)..."
                    value={notes[c.id] || ''}
                    onChange={(e) => setNotes((p) => ({ ...p, [c.id]: e.target.value }))}
                  />
                </CardContent>
              </Card>
            );
          })}

          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
            disabled={saving}
            sx={{ py: 1.75, fontSize: '1rem', mt: 1 }}
          >
            {saving ? 'Сохранение...' : 'Сохранить оценки'}
          </Button>
        </Stack>
      )}
    </Box>
  );
}
