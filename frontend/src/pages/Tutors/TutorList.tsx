import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Chip, Card, CardContent,
  Grid, Collapse, Stack, InputAdornment, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import { TutorProfile } from '../../types';
import TutorCard from '../../components/Tutors/TutorCard';
import { PageLoader } from '../../components/Common/LoadingSpinner';
import api from '../../api/client';

export default function TutorList() {
  const [searchParams] = useSearchParams();
  const [tutors, setTutors] = useState<TutorProfile[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(() => searchParams.get('subject') || '');
  const [minRate, setMinRate] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [minRating, setMinRating] = useState('');
  const [minExperience, setMinExperience] = useState('');
  const [sortOrder, setSortOrder] = useState<'rating_desc' | 'price_asc' | 'price_desc'>('rating_desc');

  useEffect(() => {
    setSelectedSubject(searchParams.get('subject') || '');
  }, [searchParams]);

  const fetchTutors = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (selectedSubject) q.set('subject', selectedSubject);
      if (minRate) q.set('minRate', minRate);
      if (maxRate) q.set('maxRate', maxRate);
      if (minRating) q.set('minRating', minRating);
      if (minExperience) q.set('minExperience', minExperience);
      const { data } = await api.get(`/tutors?${q}`);
      setTutors(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { api.get('/tutors/subjects').then((r) => setSubjects(r.data)); }, []);
  useEffect(() => { fetchTutors(); }, [selectedSubject, minRating, minExperience]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchTutors(); };
  const sortedTutors = [...tutors].sort((a, b) => {
    if (sortOrder === 'price_asc') return (a.hourlyRate ?? 99999) - (b.hourlyRate ?? 99999);
    if (sortOrder === 'price_desc') return (b.hourlyRate ?? 0) - (a.hourlyRate ?? 0);
    return b.rating - a.rating;
  });

  const resetFilters = () => { setSearch(''); setSelectedSubject(''); setMinRate(''); setMaxRate(''); setMinRating(''); setMinExperience(''); setSortOrder('rating_desc'); };
  const hasActiveFilters = !!(selectedSubject || minRate || maxRate || minRating || minExperience);

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" fontWeight={700} color="text.primary" mb={0.5}>Репетиторы</Typography>
        <Typography variant="body1" color="text.secondary">Найди своего идеального репетитора</Typography>
      </Box>

      <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        <TextField
          placeholder="Поиск по имени..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment> }}
          sx={{ flex: 1 }}
        />
        <Button type="submit" variant="contained">Найти</Button>
        <Button
          type="button"
          variant={hasActiveFilters ? 'contained' : 'outlined'}
          color={hasActiveFilters ? 'primary' : 'inherit'}
          startIcon={<TuneIcon />}
          onClick={() => setShowFilters(!showFilters)}
          sx={{ minWidth: 120 }}
        >
          Фильтры
        </Button>
      </Box>

      {/* Advanced filters */}
      <Collapse in={showFilters}>
        <Card elevation={1} sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField label="Цена от (₽/час)" type="number" value={minRate} onChange={(e) => setMinRate(e.target.value)} placeholder="500" inputProps={{ min: 0 }} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Цена до (₽/час)" type="number" value={maxRate} onChange={(e) => setMaxRate(e.target.value)} placeholder="5000" inputProps={{ min: 0 }} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Рейтинг от</InputLabel>
                  <Select value={minRating} label="Рейтинг от" onChange={(e) => setMinRating(e.target.value)}>
                    <MenuItem value="">Любой</MenuItem>
                    <MenuItem value="3">3+</MenuItem>
                    <MenuItem value="4">4+</MenuItem>
                    <MenuItem value="4.5">4.5+</MenuItem>
                    <MenuItem value="4.8">4.8+</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Опыт от</InputLabel>
                  <Select value={minExperience} label="Опыт от" onChange={(e) => setMinExperience(e.target.value)}>
                    <MenuItem value="">Любой</MenuItem>
                    <MenuItem value="1">от 1 года</MenuItem>
                    <MenuItem value="2">от 2 лет</MenuItem>
                    <MenuItem value="3">от 3 лет</MenuItem>
                    <MenuItem value="5">от 5 лет</MenuItem>
                    <MenuItem value="10">от 10 лет</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Сортировка</InputLabel>
                  <Select value={sortOrder} label="Сортировка" onChange={(e) => setSortOrder(e.target.value as any)}>
                    <MenuItem value="rating_desc">По рейтингу</MenuItem>
                    <MenuItem value="price_asc">Цена: по возрастанию</MenuItem>
                    <MenuItem value="price_desc">Цена: по убыванию</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
              <Button variant="contained" onClick={fetchTutors} size="small">Применить</Button>
              <Button variant="outlined" onClick={resetFilters} size="small">Сбросить</Button>
            </Stack>
          </CardContent>
        </Card>
      </Collapse>

      {/* Subject chips */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 4 }}>
        <Chip
          label="Все предметы"
          onClick={() => setSelectedSubject('')}
          color={!selectedSubject ? 'primary' : 'default'}
          sx={{ fontWeight: 500 }}
        />
        {subjects.map((s) => (
          <Chip
            key={s}
            label={s}
            onClick={() => setSelectedSubject(s === selectedSubject ? '' : s)}
            color={selectedSubject === s ? 'primary' : 'default'}
            sx={{ fontWeight: 500 }}
          />
        ))}
      </Box>

      {loading ? (
        <PageLoader />
      ) : tutors.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
          <TuneIcon sx={{ fontSize: 48, opacity: 0.4, mb: 2 }} />
          <Typography variant="h6" fontWeight={600} mb={1}>Репетиторы не найдены</Typography>
          <Typography variant="body2">Попробуйте изменить параметры поиска</Typography>
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {sortedTutors.map((t) => (
            <Grid item xs={12} sm={6} md={4} key={t.id}>
              <TutorCard tutor={t} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
