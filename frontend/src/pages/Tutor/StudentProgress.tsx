import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Stack, Button, Avatar,
  Chip, Grid, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import RadarIcon from '@mui/icons-material/TrackChanges';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { RadarData, HistoryData, Achievement, StudentProfile } from '../../types';
import CompetencyRadar from '../../components/Progress/CompetencyRadar';
import HistoryLineChart from '../../components/Progress/HistoryLineChart';
import HistoryBarChart from '../../components/Progress/HistoryBarChart';
import AchievementCard from '../../components/Progress/AchievementCard';
import { PageLoader } from '../../components/Common/LoadingSpinner';
import api from '../../api/client';

type ChartType = 'radar' | 'line' | 'bar';
type Period = 'week' | 'month' | 'all';

const LAVENDER = '#7C5CBF';
const LAVENDER_BG = '#F0EBF8';

export default function StudentProgress() {
  const { studentProfileId } = useParams<{ studentProfileId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [tutorId, setTutorId] = useState<string>('');
  const [radarData, setRadarData] = useState<RadarData | null>(null);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [earned, setEarned] = useState<Achievement[]>([]);
  const [period, setPeriod] = useState<Period>('all');
  const [chartType, setChartType] = useState<ChartType>('radar');
  const [loading, setLoading] = useState(true);
  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  useEffect(() => {
    Promise.all([
      api.get('/tutors/me/students').then((r) => {
        const found = r.data.find((s: StudentProfile) => s.id === studentProfileId);
        if (found) setStudent(found);
      }),
      api.get('/progress/achievements?studentProfileId=' + studentProfileId).then((r) => setEarned(r.data.earned || [])),
      api.get('/auth/me').then((r) => setTutorId(r.data.tutorProfile?.id || '')),
    ]).finally(() => setLoading(false));
  }, [studentProfileId]);

  // Load only subjects where this student has real activity with this tutor
  useEffect(() => {
    if (!tutorId || !studentProfileId) return;
    api.get(`/progress/by-subject?tutorProfileId=${tutorId}&studentProfileId=${studentProfileId}`).then((r) => {
      const subjects = Object.keys(r.data as Record<string, unknown>).sort();
      setAllSubjects(subjects);
      if (subjects.length > 0) setSelectedSubject(subjects[0]);
    });
  }, [tutorId, studentProfileId]);

  useEffect(() => {
    if (!tutorId || !studentProfileId) return;
    const subjectParam = selectedSubject ? `&subject=${encodeURIComponent(selectedSubject)}` : '';
    Promise.all([
      api.get(`/progress/radar?tutorProfileId=${tutorId}&period=${period}&studentProfileId=${studentProfileId}${subjectParam}`).then((r) => setRadarData(r.data)),
      api.get(`/progress/history?tutorProfileId=${tutorId}&studentProfileId=${studentProfileId}${subjectParam}`).then((r) => setHistoryData(r.data)),
    ]);
  }, [tutorId, studentProfileId, period, selectedSubject]);

  if (loading) return <PageLoader />;

  const avgScore = radarData?.criteria.length
    ? (radarData.criteria.reduce((s, c) => s + (radarData.currentScores[c.id] ?? 0), 0) / radarData.criteria.length).toFixed(1)
    : '—';

  const statCards = [
    { label: 'Средний балл', value: avgScore, color: LAVENDER },
    { label: 'Компетенций', value: radarData?.criteria.length ?? 0, color: '#3b82f6' },
    { label: 'Достижений', value: earned.length, color: '#f59e0b' },
  ];

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 3, color: 'text.secondary' }}>
        Назад
      </Button>

      <Stack direction="row" spacing={2.5} alignItems="center" mb={3}>
        <Avatar sx={{ width: 56, height: 56, bgcolor: LAVENDER_BG, color: LAVENDER, fontWeight: 700, fontSize: 20 }}>
          {student?.user.avatar || student?.user.name?.[0] || '?'}
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={700}>{student?.user.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {student?.grade ? `${student.grade} · ` : ''}Прогресс компетенций
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((s) => (
          <Grid item xs={4} key={s.label}>
            <Card elevation={1}>
              <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card elevation={1} sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          {/* Subject selector */}
          {allSubjects.length > 0 && (
            <Box sx={{ mb: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <MenuBookIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Предмет</Typography>
              </Stack>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {allSubjects.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    size="small"
                    onClick={() => setSelectedSubject(s)}
                    sx={{
                      fontWeight: 500,
                      bgcolor: selectedSubject === s ? LAVENDER : '#F7F5FC',
                      color: selectedSubject === s ? 'white' : 'text.secondary',
                      '&:hover': { bgcolor: selectedSubject === s ? LAVENDER : '#EEE9F8' },
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2} mb={3}>
            <ToggleButtonGroup
              value={period}
              exclusive
              onChange={(_, v) => v && setPeriod(v)}
              size="small"
              sx={{ '& .MuiToggleButton-root': { px: 2, textTransform: 'none', fontWeight: 500 } }}
            >
              <ToggleButton value="week">Неделя</ToggleButton>
              <ToggleButton value="month">Месяц</ToggleButton>
              <ToggleButton value="all">Весь период</ToggleButton>
            </ToggleButtonGroup>

            <ToggleButtonGroup
              value={chartType}
              exclusive
              onChange={(_, v) => v && setChartType(v)}
              size="small"
              sx={{ '& .MuiToggleButton-root': { px: 2, textTransform: 'none', fontWeight: 500 } }}
            >
              <ToggleButton value="radar"><RadarIcon sx={{ mr: 0.75, fontSize: 16 }} />Радар</ToggleButton>
              <ToggleButton value="line"><ShowChartIcon sx={{ mr: 0.75, fontSize: 16 }} />Линейный</ToggleButton>
              <ToggleButton value="bar"><BarChartIcon sx={{ mr: 0.75, fontSize: 16 }} />Столбчатый</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {radarData && radarData.criteria.length > 0 ? (
            <>
              {chartType === 'radar' && <CompetencyRadar criteria={radarData.criteria} currentScores={radarData.currentScores} previousScores={radarData.previousScores} showComparison={period !== 'all'} />}
              {chartType === 'line' && historyData && <HistoryLineChart criteria={historyData.criteria} history={historyData.history} />}
              {chartType === 'bar' && <HistoryBarChart criteria={radarData.criteria} currentScores={radarData.currentScores} />}

              <Grid container spacing={1} sx={{ mt: 2, pt: 2, borderTop: '1px solid #F7F5FC' }}>
                {radarData.criteria.map((c) => (
                  <Grid item xs={6} sm={4} key={c.id}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#F7F5FC', borderRadius: 2, px: 2, py: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</Typography>
                      <Typography variant="caption" fontWeight={700} sx={{ color: LAVENDER, ml: 1, flexShrink: 0 }}>
                        {radarData.currentScores[c.id] ?? 0}/10
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </>
          ) : (
            <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">
                {allSubjects.length === 0 ? 'Нет критериев оценки' : 'Нет данных по выбранному предмету'}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {earned.length > 0 && (
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <EmojiEventsIcon sx={{ color: '#f59e0b' }} />
            <Typography variant="subtitle1" fontWeight={700}>Достижения ученика</Typography>
          </Stack>
          <Grid container spacing={1.5}>
            {earned.map((a) => (
              <Grid item xs={6} sm={4} md={3} key={a.id}>
                <AchievementCard achievement={a} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
