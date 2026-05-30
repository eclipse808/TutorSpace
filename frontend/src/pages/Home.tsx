import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Button, Card, CardContent, Chip, Paper,
  InputBase, IconButton, Stack, Grid,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleIcon from '@mui/icons-material/People';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import StarIcon from '@mui/icons-material/Star';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CalculateIcon from '@mui/icons-material/Calculate';
import LanguageIcon from '@mui/icons-material/Language';
import BoltIcon from '@mui/icons-material/Bolt';
import CodeIcon from '@mui/icons-material/Code';
import ScienceIcon from '@mui/icons-material/Science';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import LocalFloristIcon from '@mui/icons-material/LocalFlorist';
import PersonIcon from '@mui/icons-material/Person';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { SvgIconComponent } from '@mui/icons-material';
import { TutorProfile } from '../types';
import TutorCard from '../components/Tutors/TutorCard';
import api from '../api/client';

const LAVENDER = '#7C5CBF';
const DIRECTIONS: { subject: string; Icon: SvgIconComponent; iconColor: string; desc: string; bg: string; border: string }[] = [
  { subject: 'Математика', Icon: CalculateIcon, iconColor: '#3b82f6', desc: 'Алгебра, геометрия, ЕГЭ', bg: '#EFF6FF', border: '#BFDBFE' },
  { subject: 'Английский язык', Icon: LanguageIcon, iconColor: '#7C5CBF', desc: 'Разговорный, IELTS', bg: '#F5F3FF', border: '#DDD6FE' },
  { subject: 'Физика', Icon: BoltIcon, iconColor: '#ca8a04', desc: 'Механика, ЕГЭ', bg: '#FEFCE8', border: '#FEF08A' },
  { subject: 'Информатика', Icon: CodeIcon, iconColor: '#16a34a', desc: 'Программирование', bg: '#F0FDF4', border: '#BBF7D0' },
  { subject: 'Химия', Icon: ScienceIcon, iconColor: '#e11d48', desc: 'Органика, олимпиады', bg: '#FFF1F2', border: '#FECDD3' },
  { subject: 'История', Icon: HistoryEduIcon, iconColor: '#ea580c', desc: 'ЕГЭ, олимпиады', bg: '#FFF7ED', border: '#FED7AA' },
  { subject: 'Русский язык', Icon: SpellcheckIcon, iconColor: '#7C5CBF', desc: 'ЕГЭ, сочинения', bg: '#F5F3FF', border: '#DDD6FE' },
  { subject: 'Биология', Icon: LocalFloristIcon, iconColor: '#059669', desc: 'Генетика, ОГЭ/ЕГЭ', bg: '#ECFDF5', border: '#A7F3D0' },
];

type Suggestion = { type: 'subject'; label: string } | { type: 'tutor'; label: string; id: string };

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [tutors, setTutors] = useState<TutorProfile[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/tutors').then((r) => setTutors(r.data));
    api.get('/tutors/subjects').then((r) => setSubjects(r.data));
  }, []);

  useEffect(() => {
    if (search.length < 2) { setSuggestions([]); return; }
    const q = search.toLowerCase();
    const sm: Suggestion[] = subjects.filter((s) => s.toLowerCase().includes(q)).slice(0, 4).map((s) => ({ type: 'subject', label: s }));
    const tm: Suggestion[] = tutors.filter((t) => t.user.name.toLowerCase().includes(q)).slice(0, 4).map((t) => ({ type: 'tutor', label: t.user.name, id: t.id }));
    setSuggestions([...sm, ...tm].slice(0, 7));
  }, [search, subjects, tutors]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (search.trim()) navigate(`/tutors?search=${encodeURIComponent(search)}`);
  };

  const handleSuggestion = (s: Suggestion) => {
    setShowSuggestions(false);
    if (s.type === 'subject') navigate(`/tutors?subject=${encodeURIComponent(s.label)}`);
    else navigate(`/tutors/${s.id}`);
  };

  const stats = [
    { label: 'Репетиторов', value: tutors.length || '10+', icon: <PeopleIcon /> },
    { label: 'Предметов', value: subjects.length || '8+', icon: <MenuBookIcon /> },
    { label: 'Средний рейтинг', value: '4.8', icon: <StarIcon /> },
    { label: 'Довольных учеников', value: '98%', icon: <TrendingUpIcon /> },
  ];

  return (
    <Box sx={{ mt: -4, mx: { xs: -2, sm: -3 } }}>
      {/* Hero */}
      <Box sx={{ background: 'linear-gradient(135deg, #7C5CBF 0%, #6A4DAD 50%, #5a3d9a 100%)', py: { xs: 8, md: 12 }, px: { xs: 3, md: 6 } }}>
        <Box sx={{ maxWidth: 800, mx: 'auto', textAlign: 'center' }}>
          <Chip
            icon={<BarChartIcon sx={{ color: 'rgba(255,255,255,0.9) !important', fontSize: '16px !important' }} />}
            label="Уникальная система отслеживания прогресса"
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', mb: 3, fontWeight: 500 }}
          />
          <Typography variant="h2" sx={{ color: 'white', fontWeight: 800, mb: 2, fontSize: { xs: '2rem', md: '3rem' }, lineHeight: 1.2 }}>
            Найди репетитора и<br />
            <Box component="span" sx={{ color: '#E2D9F3' }}>отслеживай свой прогресс</Box>
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 5, maxWidth: 560, mx: 'auto', fontSize: '1.1rem' }}>
            Маркетплейс репетиторов с продвинутой визуализацией роста компетенций
          </Typography>

          {/* Search */}
          <Box ref={searchRef} sx={{ maxWidth: 560, mx: 'auto', position: 'relative' }}>
            <Paper
              component="form"
              onSubmit={handleSearch}
              elevation={3}
              sx={{ display: 'flex', alignItems: 'center', borderRadius: 3, overflow: 'hidden', pr: 1 }}
            >
              <Box sx={{ pl: 2, display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                <SearchIcon />
              </Box>
              <InputBase
                placeholder="Предмет или имя репетитора..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
                onFocus={() => search.length >= 2 && setShowSuggestions(true)}
                sx={{ flex: 1, px: 1.5, py: 1.5, fontSize: '0.95rem' }}
              />
              <Button type="submit" variant="contained" sx={{ borderRadius: 2, px: 2.5, py: 1 }}>Найти</Button>
            </Paper>

            {showSuggestions && suggestions.length > 0 && (
              <Paper elevation={3} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, mt: 0.5, borderRadius: 2, overflow: 'hidden', zIndex: 50 }}>
                {suggestions.map((s, i) => (
                  <Box key={i} onClick={() => handleSuggestion(s)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5, cursor: 'pointer', '&:hover': { bgcolor: '#F7F5FC' }, borderBottom: i < suggestions.length - 1 ? '1px solid #F0EBF8' : 'none' }}>
                    {s.type === 'subject' ? <MenuBookIcon sx={{ fontSize: 20, color: LAVENDER }} /> : <PersonIcon sx={{ fontSize: 20, color: '#9B83CF' }} />}
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{s.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.type === 'subject' ? 'Предмет' : 'Репетитор'}</Typography>
                    </Box>
                  </Box>
                ))}
              </Paper>
            )}
          </Box>
        </Box>
      </Box>

      <Container maxWidth="lg" sx={{ mt: -3 }}>
        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 8 }}>
          {stats.map((s) => (
            <Grid item xs={6} sm={3} key={s.label}>
              <Card elevation={1}>
                <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
                  <Box sx={{ width: 44, height: 44, bgcolor: '#F0EBF8', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5, color: LAVENDER }}>
                    {s.icon}
                  </Box>
                  <Typography variant="h5" fontWeight={700} color="text.primary">{s.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Popular directions */}
        <Box sx={{ mb: 8 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
            <Box>
              <Typography variant="h4" fontWeight={700} color="text.primary">Популярные направления</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Выберите предмет и найдите подходящего репетитора</Typography>
            </Box>
            <Button endIcon={<ArrowForwardIcon />} onClick={() => navigate('/tutors')} sx={{ display: { xs: 'none', sm: 'flex' } }}>
              Все репетиторы
            </Button>
          </Box>
          <Grid container spacing={2}>
            {DIRECTIONS.map((d) => (
              <Grid item xs={6} sm={3} key={d.subject}>
                <Card
                  onClick={() => navigate(`/tutors?subject=${encodeURIComponent(d.subject)}`)}
                  sx={{ cursor: 'pointer', bgcolor: d.bg, border: `1px solid ${d.border}`, boxShadow: 'none', transition: 'all 0.2s', '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transform: 'translateY(-2px)' } }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ mb: 1 }}><d.Icon sx={{ fontSize: 32, color: d.iconColor }} /></Box>
                    <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ lineHeight: 1.3 }}>{d.subject}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, mt: 0.5 }}>{d.desc}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Features */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h4" fontWeight={700} textAlign="center" color="text.primary" mb={1}>Почему TutorSpace?</Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" mb={5}>Не просто поиск репетитора — полная экосистема обучения</Typography>
          <Grid container spacing={3}>
            {[
              { Icon: TrackChangesIcon, color: LAVENDER, title: 'Умный подбор', desc: 'Фильтрация по предметам, рейтингу и цене. Детальные профили с образованием и опытом.' },
              { Icon: BarChartIcon, color: '#6A4DAD', title: 'Радар прогресса', desc: 'Уникальная визуализация компетенций в виде радарной диаграммы. Видите, как растёт каждый навык.' },
              { Icon: EmojiEventsIcon, color: '#d97706', title: 'Уровни и XP', desc: 'Геймификация обучения: зарабатывай опыт за занятия и выполнение заданий, повышай уровень.' },
            ].map((f) => (
              <Grid item xs={12} sm={4} key={f.title}>
                <Card elevation={1} sx={{ textAlign: 'center', p: 1, height: '100%', transition: 'all 0.3s', '&:hover': { boxShadow: '0 4px 16px rgba(124,92,191,0.15)' } }}>
                  <CardContent>
                    <Box sx={{ width: 56, height: 56, bgcolor: '#F0EBF8', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                      <f.Icon sx={{ fontSize: 28, color: f.color }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700} mb={1}>{f.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{f.desc}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Tutors grid */}
        {tutors.length > 0 && (
          <Box sx={{ mb: 8 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h4" fontWeight={700} color="text.primary">Наши репетиторы</Typography>
              <Button endIcon={<ArrowForwardIcon />} onClick={() => navigate('/tutors')}>Все репетиторы</Button>
            </Box>
            <Grid container spacing={2.5}>
              {tutors.slice(0, 6).map((t) => (
                <Grid item xs={12} sm={6} md={4} key={t.id}>
                  <TutorCard tutor={t} />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Container>
    </Box>
  );
}
