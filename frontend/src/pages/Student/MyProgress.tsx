import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, Grid,
  Stack, Chip, ToggleButtonGroup, ToggleButton, CircularProgress, Tooltip,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PersonIcon from '@mui/icons-material/Person';
import ForumIcon from '@mui/icons-material/Forum';
import { RadarData, HistoryData, Achievement, CompetencyCriteria } from '../../types';
import CompetencyRadar from '../../components/Progress/CompetencyRadar';
import HistoryLineChart from '../../components/Progress/HistoryLineChart';
import HistoryBarChart from '../../components/Progress/HistoryBarChart';
import AchievementCard from '../../components/Progress/AchievementCard';
import { PageLoader } from '../../components/Common/LoadingSpinner';
import api from '../../api/client';

type Period = 'week' | 'month' | 'all';
type ChartType = 'radar' | 'line' | 'bar';

interface SubjectData {
  criteria: CompetencyCriteria[];
  currentScores: Record<string, number>;
  currentNotes: Record<string, string>;
}

const LAVENDER = '#7C5CBF';
const LAVENDER_BG = '#F0EBF8';

export default function MyProgress() {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectData, setSubjectData] = useState<Record<string, SubjectData>>({});
  const [tutorNames, setTutorNames] = useState<Record<string, string>>({});
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTutorId, setSelectedTutorId] = useState<string>('');
  const [period, setPeriod] = useState<Period>('all');
  const [chartType, setChartType] = useState<ChartType>('radar');
  const [radarData, setRadarData] = useState<RadarData | null>(null);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [earned, setEarned] = useState<Achievement[]>([]);
  const [locked, setLocked] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/progress/by-subject').then((r) => {
        const data: Record<string, SubjectData> = r.data;
        setSubjectData(data);
        const subjs = Object.keys(data);
        setSubjects(subjs);
        if (subjs.length > 0) setSelectedSubject(subjs[0]);
      }),
      api.get('/progress/achievements').then((r) => {
        setEarned(r.data.earned || []);
        setLocked(r.data.locked || []);
      }),
      api.get('/progress/my-tutors').then((r) => {
        const map: Record<string, string> = {};
        for (const t of r.data) {
          if (t.id && t.user?.name) map[t.id] = t.user.name;
        }
        setTutorNames(map);
      }),
    ]).finally(() => setLoading(false));
  }, []);

  // Unique tutor IDs for the selected subject
  const tutorsForSubject = useMemo(() => {
    const criteria = subjectData[selectedSubject]?.criteria || [];
    return [...new Set(criteria.map((c) => c.tutorProfileId))];
  }, [selectedSubject, subjectData]);

  // Reset tutor selection when subject changes
  useEffect(() => {
    if (tutorsForSubject.length > 0) setSelectedTutorId(tutorsForSubject[0]);
  }, [selectedSubject]);

  // Reload radar + history when tutor or period changes
  useEffect(() => {
    if (!selectedSubject || !selectedTutorId) return;
    setChartLoading(true);

    Promise.all([
      api.get(`/progress/radar?tutorProfileId=${selectedTutorId}&subject=${encodeURIComponent(selectedSubject)}&period=${period}`).then((r) => {
        setRadarData(r.data);
      }),
      api.get(`/progress/history?subject=${encodeURIComponent(selectedSubject)}&tutorProfileId=${selectedTutorId}`).then((r) => {
        setHistoryData(r.data);
      }),
    ]).catch(() => {
      setRadarData(null);
      setHistoryData(null);
    }).finally(() => setChartLoading(false));
  }, [selectedSubject, selectedTutorId, period]);

  if (loading) return <PageLoader />;

  // Filter criteria to selected tutor
  const currentSubjectData = subjectData[selectedSubject];
  const subjectCriteria = (currentSubjectData?.criteria || []).filter(
    (c) => c.tutorProfileId === selectedTutorId,
  );
  const subjectScores = currentSubjectData?.currentScores || {};
  const subjectNotes = currentSubjectData?.currentNotes || {};

  const avgScore = subjectCriteria.length
    ? (subjectCriteria.reduce((s, c) => s + (subjectScores[c.id] ?? 0), 0) / subjectCriteria.length).toFixed(1)
    : '—';

  const maxCompetency = subjectCriteria.length
    ? subjectCriteria.reduce((best, c) => (subjectScores[c.id] ?? 0) > (subjectScores[best.id] ?? 0) ? c : best, subjectCriteria[0])
    : null;

  const hasData = subjects.length > 0;
  const hasChartData = subjectCriteria.length > 0 && Object.keys(subjectScores).some((id) => subjectCriteria.some((c) => c.id === id));

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Мой прогресс</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>Компетенции и история оценок по предметам</Typography>
      </Box>

      {!hasData ? (
        <Box sx={{ textAlign: 'center', py: 12, color: 'text.secondary' }}>
          <MenuBookIcon sx={{ fontSize: 56, opacity: 0.35, mb: 2 }} />
          <Typography variant="h6" fontWeight={600} mb={1}>Нет данных о прогрессе</Typography>
          <Typography variant="body2" mb={3}>Запишитесь на занятие — репетитор оценит ваши компетенции</Typography>
          <Button component={Link} to="/tutors" variant="contained">Найти репетитора</Button>
        </Box>
      ) : (
        <Stack spacing={3}>
          {/* Subject selector */}
          <Card elevation={1}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 1 }}>
                Предмет
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {subjects.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    onClick={() => setSelectedSubject(s)}
                    color={selectedSubject === s ? 'primary' : 'default'}
                    sx={{ fontWeight: selectedSubject === s ? 700 : 500, cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Tutor selector — only when multiple tutors for this subject */}
          {tutorsForSubject.length > 1 && (
            <Card elevation={1} sx={{ border: '1px solid #EDE9F7' }}>
              <CardContent sx={{ pb: '16px !important' }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                  <PersonIcon sx={{ color: LAVENDER, fontSize: 18 }} />
                  <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 1 }}>
                    Репетитор
                  </Typography>
                </Stack>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {tutorsForSubject.map((tid) => (
                    <Chip
                      key={tid}
                      label={tutorNames[tid] || 'Репетитор'}
                      onClick={() => setSelectedTutorId(tid)}
                      color={selectedTutorId === tid ? 'primary' : 'default'}
                      sx={{ fontWeight: selectedTutorId === tid ? 700 : 500, cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Quick stats for selected subject */}
          {subjectCriteria.length > 0 && (
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Card elevation={1}>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" fontWeight={800} color="primary">{avgScore}</Typography>
                    <Typography variant="caption" color="text.secondary">Средний балл</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card elevation={1}>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" fontWeight={800} color="primary">{subjectCriteria.length}</Typography>
                    <Typography variant="caption" color="text.secondary">Компетенций</Typography>
                  </CardContent>
                </Card>
              </Grid>
              {maxCompetency && (
                <Grid item xs={12} sm={6}>
                  <Card elevation={1}>
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="subtitle2" fontWeight={700} color="primary">{maxCompetency.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Лучшая компетенция · {subjectScores[maxCompetency.id] ?? 0}/10
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}

          {/* Chart card */}
          <Card elevation={1}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2} mb={3}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {selectedSubject} — прогресс
                  {tutorsForSubject.length > 1 && selectedTutorId && (
                    <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      ({tutorNames[selectedTutorId] || 'Репетитор'})
                    </Typography>
                  )}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <ToggleButtonGroup
                    value={period}
                    exclusive
                    onChange={(_, v) => v && setPeriod(v)}
                    size="small"
                    sx={{ '& .MuiToggleButton-root': { px: 1.5, py: 0.5, textTransform: 'none', fontWeight: 500, fontSize: 12 } }}
                  >
                    <ToggleButton value="week">Нед</ToggleButton>
                    <ToggleButton value="month">Мес</ToggleButton>
                    <ToggleButton value="all">Всё</ToggleButton>
                  </ToggleButtonGroup>
                  <ToggleButtonGroup
                    value={chartType}
                    exclusive
                    onChange={(_, v) => v && setChartType(v)}
                    size="small"
                    sx={{ '& .MuiToggleButton-root': { px: 1, py: 0.5 } }}
                  >
                    <ToggleButton value="radar"><BarChartIcon sx={{ fontSize: 16 }} /></ToggleButton>
                    <ToggleButton value="line"><TimelineIcon sx={{ fontSize: 16 }} /></ToggleButton>
                    <ToggleButton value="bar"><ViewColumnIcon sx={{ fontSize: 16 }} /></ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
              </Stack>

              {chartLoading ? (
                <Box sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress size={32} color="primary" />
                </Box>
              ) : !hasChartData ? (
                <Box sx={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                  <MenuBookIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
                  <Typography variant="body2">Навыки ещё не оценивались</Typography>
                  <Typography variant="caption">Репетитор оценит компетенции после занятия</Typography>
                </Box>
              ) : (
                <>
                  {chartType === 'radar' && (
                    <CompetencyRadar
                      criteria={subjectCriteria}
                      currentScores={subjectScores}
                      previousScores={radarData?.previousScores ?? {}}
                      showComparison={period !== 'all'}
                    />
                  )}
                  {chartType === 'line' && historyData && (
                    <HistoryLineChart criteria={historyData.criteria} history={historyData.history} />
                  )}
                  {chartType === 'bar' && (
                    <HistoryBarChart criteria={subjectCriteria} currentScores={subjectScores} />
                  )}
                </>
              )}

              {/* Criteria legend with descriptions and tutor notes */}
              {subjectCriteria.length > 0 && (
                <Grid container spacing={1} sx={{ mt: 2, pt: 2, borderTop: '1px solid #F7F5FC' }}>
                  {subjectCriteria.map((c) => {
                    const note = subjectNotes[c.id];
                    const score = subjectScores[c.id] ?? 0;
                    const scoreColor = score >= 8 ? '#16a34a' : score >= 5 ? LAVENDER : score >= 3 ? '#d97706' : '#dc2626';
                    return (
                      <Grid item xs={12} sm={6} md={4} key={c.id}>
                        <Tooltip title={c.description || ''} placement="top" arrow disableHoverListener={!c.description}>
                          <Box
                            sx={{
                              bgcolor: LAVENDER_BG, borderRadius: 1.5, px: 1.5, py: 1,
                              cursor: c.description ? 'help' : 'default',
                              border: note ? '1px solid #D5C9EE' : '1px solid transparent',
                            }}
                          >
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="caption" fontWeight={600} noWrap sx={{ flex: 1, mr: 1 }}>{c.name}</Typography>
                              <Typography variant="caption" fontWeight={700} sx={{ color: scoreColor, flexShrink: 0 }}>
                                {score}/10
                              </Typography>
                            </Stack>
                            {note && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mt: 0.5, fontStyle: 'italic', lineHeight: 1.4 }}
                              >
                                «{note}»
                              </Typography>
                            )}
                          </Box>
                        </Tooltip>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </CardContent>
          </Card>

          {/* Tutor feedback / notes */}
          {(() => {
            const notesEntries = subjectCriteria
              .filter((c) => subjectNotes[c.id])
              .map((c) => ({ name: c.name, note: subjectNotes[c.id] }));
            if (notesEntries.length === 0) return null;
            return (
              <Card elevation={1} sx={{ border: '1px solid #D5C9EE' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    <ForumIcon sx={{ color: LAVENDER, fontSize: 20 }} />
                    <Typography variant="subtitle1" fontWeight={700}>Комментарии репетитора</Typography>
                    {tutorsForSubject.length > 1 && selectedTutorId && (
                      <Chip label={tutorNames[selectedTutorId] || 'Репетитор'} size="small" sx={{ bgcolor: LAVENDER_BG, color: LAVENDER, fontWeight: 600 }} />
                    )}
                  </Stack>
                  <Stack spacing={1.5}>
                    {notesEntries.map(({ name, note }) => (
                      <Box key={name} sx={{ p: 1.5, bgcolor: '#F7F5FC', borderRadius: 2, borderLeft: '3px solid #B39DDB' }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.3 }}>
                          {name}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic', color: 'text.primary', lineHeight: 1.6 }}>
                          «{note}»
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            );
          })()}

          {/* Achievements */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <EmojiEventsIcon sx={{ color: '#f59e0b', fontSize: 22 }} />
                <Typography variant="h6" fontWeight={700}>Достижения</Typography>
              </Stack>
              {locked.length > 0 && (
                <Button component={Link} to="/student/achievements" size="small" sx={{ color: 'text.secondary' }}>
                  Все награды
                </Button>
              )}
            </Stack>

            {earned.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight={600} color="text.secondary" mb={1.5}>
                  Получено ({earned.length})
                </Typography>
                <Grid container spacing={1.5}>
                  {earned.map((a) => (
                    <Grid item xs={6} sm={4} md={3} key={a.id}>
                      <AchievementCard achievement={a} />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {locked.length > 0 && (
              <Box>
                <Typography variant="body2" fontWeight={600} color="text.disabled" mb={1.5}>
                  Ещё не получено ({locked.length})
                </Typography>
                <Grid container spacing={1.5}>
                  {locked.slice(0, 6).map((a) => (
                    <Grid item xs={6} sm={4} md={3} key={a.id}>
                      <AchievementCard achievement={a} locked />
                    </Grid>
                  ))}
                </Grid>
                {locked.length > 6 && (
                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Button component={Link} to="/student/achievements" variant="outlined" size="small">
                      Посмотреть все {locked.length} наград
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {earned.length === 0 && locked.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                <Typography variant="body2">Завершите первое занятие, чтобы получить достижения!</Typography>
              </Box>
            )}
          </Box>
        </Stack>
      )}
    </Box>
  );
}
