import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Stack, Button, Avatar,
  Chip, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Session } from '../../types';
import { PageLoader } from '../../components/Common/LoadingSpinner';
import { format, parseISO, isPast } from 'date-fns';
import { ru } from 'date-fns/locale';
import api from '../../api/client';

const LAVENDER = '#7C5CBF';
const LAVENDER_BG = '#F0EBF8';

export default function SessionJournal() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'SCHEDULED' | 'COMPLETED'>('all');
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchSessions = () => {
    api.get('/sessions').then((r) => setSessions(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchSessions(); }, []);

  const markCompleted = async (sessionId: string) => {
    setMarkingId(sessionId);
    try {
      await api.put(`/sessions/${sessionId}/status`, { status: 'COMPLETED' });
      fetchSessions();
    } finally {
      setMarkingId(null);
    }
  };

  const filtered = sessions.filter((s) => filter === 'all' || s.status === filter);
  const hasScores = (s: Session) => (s as any).competencyScores?.length > 0;

  if (loading) return <PageLoader />;

  return (
    <Box sx={{ maxWidth: 800 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Журнал занятий</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>Управляйте занятиями и оценивайте учеников</Typography>
        </Box>
      </Stack>

      <ToggleButtonGroup
        value={filter}
        exclusive
        onChange={(_, v) => v && setFilter(v)}
        sx={{ mb: 3, '& .MuiToggleButton-root': { borderRadius: '10px !important', px: 2.5, py: 1, textTransform: 'none', fontWeight: 500, border: 'none', bgcolor: '#F7F5FC', color: 'text.secondary', '&.Mui-selected': { bgcolor: LAVENDER, color: 'white', '&:hover': { bgcolor: '#6A4DAD' } } } }}
      >
        <ToggleButton value="all">Все ({sessions.length})</ToggleButton>
        <ToggleButton value="SCHEDULED">Запланированные</ToggleButton>
        <ToggleButton value="COMPLETED">Завершённые</ToggleButton>
      </ToggleButtonGroup>

      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 12, color: 'text.secondary' }}>
          <AssignmentIcon sx={{ fontSize: 48, opacity: 0.35, mb: 2 }} />
          <Typography variant="h6" fontWeight={600}>Занятия не найдены</Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {filtered.map((session) => {
            const isPastSession = isPast(parseISO(session.scheduledAt));
            const canMark = session.status === 'SCHEDULED' && isPastSession;
            const canEvaluate = session.status === 'COMPLETED' && !hasScores(session);
            const isEvaluated = session.status === 'COMPLETED' && hasScores(session);

            return (
              <Card key={session.id} elevation={1}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Avatar sx={{ width: 48, height: 48, bgcolor: LAVENDER_BG, color: LAVENDER, fontWeight: 700, flexShrink: 0 }}>
                      {session.studentProfile?.user.avatar || session.studentProfile?.user.name?.[0]}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                        <Box>
                          <Typography
                            component={Link}
                            to={`/tutor/students/${session.studentProfileId}/progress`}
                            variant="body1"
                            fontWeight={600}
                            sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { color: LAVENDER } }}
                          >
                            {session.studentProfile?.user.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {session.subject} · {session.duration} мин
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          icon={session.status === 'COMPLETED'
                            ? <CheckCircleIcon sx={{ fontSize: '14px !important' }} />
                            : <AccessTimeIcon sx={{ fontSize: '14px !important' }} />}
                          label={session.status === 'COMPLETED' ? 'Завершено' : session.status === 'CANCELLED' ? 'Отменено' : 'Запланировано'}
                          color={session.status === 'COMPLETED' ? 'success' : session.status === 'CANCELLED' ? 'error' : 'info'}
                          variant="outlined"
                        />
                      </Stack>

                      <Stack direction="row" alignItems="center" spacing={0.75} mt={1}>
                        <CalendarMonthIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          {format(parseISO(session.scheduledAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
                        </Typography>
                      </Stack>

                      {session.notes && (
                        <Box sx={{ mt: 1.5, px: 2, py: 1, bgcolor: '#F7F5FC', borderRadius: 2 }}>
                          <Typography variant="caption" color="text.secondary" fontStyle="italic">{session.notes}</Typography>
                        </Box>
                      )}

                      {(canMark || canEvaluate || isEvaluated) && (
                        <Stack direction="row" spacing={1.5} mt={2} flexWrap="wrap">
                          {canMark && (
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<CheckCircleIcon />}
                              onClick={() => markCompleted(session.id)}
                              disabled={markingId === session.id}
                            >
                              {markingId === session.id ? 'Обновление...' : 'Отметить выполненным'}
                            </Button>
                          )}
                          {canEvaluate && (
                            <Button
                              size="small"
                              onClick={() => navigate(`/tutor/evaluate/${session.id}`)}
                              startIcon={<WarningAmberIcon />}
                              sx={{ bgcolor: '#FEFCE8', color: 'warning.dark', '&:hover': { bgcolor: '#FEF08A' } }}
                            >
                              Оценить ученика
                            </Button>
                          )}
                          {isEvaluated && (
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                              <Typography variant="caption" color="success.main" fontWeight={600}>Оценено</Typography>
                            </Stack>
                          )}
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
    </Box>
  );
}
