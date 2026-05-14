import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, Grid,
  Stack, Chip, ToggleButtonGroup, ToggleButton, CircularProgress,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
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
}

const LAVENDER = '#7C5CBF';
const LAVENDER_BG = '#F0EBF8';

export default function MyProgress() {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectData, setSubjectData] = useState<Record<string, SubjectData>>({});
  const [selectedSubject, setSelectedSubject] = useState<string>('');
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
    ]).finally(() => setLoading(false));
  }, []);

  // Reload radar + history when subject or period changes
  useEffect(() => {
    if (!selectedSubject) return;
    setChartLoading(true);

    // Get tutorProfileId from first criterion of this subject
    const subjCriteria = subjectData[selectedSubject]?.criteria;
    const tutorProfileId = subjCriteria?.[0]?.tutorProfileId;
    if (!tutorProfileId) {
      setChartLoading(false);
      return;
    }

    Promise.all([
      api.get(`/progress/radar?tutorProfileId=${tutorProfileId}&period=${period}`).then((r) => {
        // Filter radar data to only show criteria of selected subject
        const rd: RadarData = r.data;
        const subjectCriteria = rd.criteria.filter((c) => c.subject === selectedSubject);
        setRadarData({ ...rd, criteria: subjectCriteria });
      }),
      api.get(`/progress/history?subject=${encodeURIComponent(selectedSubject)}`).then((r) => {
        setHistoryData(r.data);
      }),
    ]).finally(() => setChartLoading(false));
  }, [selectedSubject, period, subjectData]);

  if (loading) return <PageLoader />;

  const currentSubjectData = subjectData[selectedSubject];
  const subjectCriteria = currentSubjectData?.criteria || [];
  const subjectScores = currentSubjectData?.currentScores || {};

  const avgScore = subjectCriteria.length
    ? (subjectCriteria.reduce((s, c) => s + (subjectScores[c.id] ?? 0), 0) / subjectCriteria.length).toFixed(1)
    : '—';

  const maxCompetency = subjectCriteria.length
    ? subjectCriteria.reduce((best, c) => (subjectScores[c.id] ?? 0) > (subjectScores[best.id] ?? 0) ? c : best, subjectCriteria[0])
    : null;

  const hasData = subjects.length > 0;

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

              {/* Criteria legend */}
              {subjectCriteria.length > 0 && (
                <Grid container spacing={1} sx={{ mt: 2, pt: 2, borderTop: '1px solid #F7F5FC' }}>
                  {subjectCriteria.map((c) => (
                    <Grid item xs={6} sm={4} key={c.id}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: LAVENDER_BG, borderRadius: 1.5, px: 1.5, py: 0.75 }}>
                        <Typography variant="caption" fontWeight={500} noWrap sx={{ flex: 1, mr: 1 }}>{c.name}</Typography>
                        <Typography variant="caption" fontWeight={700} color="primary">
                          {subjectScores[c.id] ?? 0}/10
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>

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
