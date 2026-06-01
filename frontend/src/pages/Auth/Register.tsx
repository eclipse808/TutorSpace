import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  ToggleButtonGroup, ToggleButton, Stack, InputAdornment, IconButton,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import BackpackIcon from '@mui/icons-material/Backpack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const GRADE_OPTIONS = [
  '1 класс', '2 класс', '3 класс', '4 класс', '5 класс', '6 класс',
  '7 класс', '8 класс', '9 класс', '10 класс', '11 класс',
  'Студент вуза', 'Взрослый / не в школе',
];

const GOAL_OPTIONS = [
  'Подготовка к ОГЭ',
  'Подготовка к ЕГЭ',
  'Подготовка к олимпиаде',
  'Изучение иностранного языка',
  'Помощь по школьным предметам',
  'Профессиональное развитие',
  'Саморазвитие',
];

// Only letters (RU + EN), spaces, hyphens — no digits or special chars
const NAME_RE = /^[a-zA-Zа-яёА-ЯЁ][a-zA-Zа-яёА-ЯЁ\s-]*$/;

function validateName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return 'Введите имя и фамилию';
  if (trimmed.length < 2) return 'Слишком короткое имя';
  if (!NAME_RE.test(trimmed)) return 'Только буквы, пробел и дефис';
  if (trimmed.split(/\s+/).length < 2) return 'Укажите имя и фамилию через пробел';
  return '';
}

export default function Register() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'STUDENT', grade: '', learningGoal: '' });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const nameError = nameTouched ? validateName(form.name) : '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNameTouched(true);
    const ne = validateName(form.name);
    if (ne) return;
    if (form.password.length < 6) { setError('Пароль должен быть не менее 6 символов'); return; }
    if (form.password !== form.confirmPassword) { setError('Пароли не совпадают'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        ...(form.role === 'STUDENT' && {
          grade: form.grade || undefined,
          learningGoal: form.learningGoal || undefined,
        }),
      });
      setAuth(data.token, data.user);
      navigate(data.user.role === 'STUDENT' ? '/student/dashboard' : '/tutor/setup');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = form.confirmPassword.length === 0 || form.password === form.confirmPassword;

  return (
    <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ width: 56, height: 56, bgcolor: 'primary.main', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <SchoolIcon sx={{ color: 'white', fontSize: 28 }} />
          </Box>
          <Typography variant="h4" fontWeight={700} color="text.primary">Создать аккаунт</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Начни свой путь к знаниям</Typography>
        </Box>

        <Card elevation={1}>
          <CardContent sx={{ p: 3 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ mb: 1 }}>
                    Я регистрируюсь как
                  </Typography>
                  <ToggleButtonGroup
                    value={form.role} exclusive onChange={(_, v) => v && set('role', v)} fullWidth
                    sx={{
                      '& .MuiToggleButton-root': { borderRadius: '10px !important', fontWeight: 600, py: 1.5, border: '2px solid #D5C9EE' },
                      '& .Mui-selected': { bgcolor: '#F0EBF8 !important', color: 'primary.main', borderColor: 'primary.main !important' },
                    }}
                  >
                    <ToggleButton value="STUDENT" sx={{ gap: 0.75 }}><BackpackIcon fontSize="small" /> Ученик</ToggleButton>
                    <ToggleButton value="TUTOR" sx={{ gap: 0.75 }}><SchoolIcon fontSize="small" /> Репетитор</ToggleButton>
                  </ToggleButtonGroup>
                  {form.role === 'TUTOR' && (
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
                      После регистрации вы заполните анкету и отправите профиль на проверку
                    </Typography>
                  )}
                </Box>

                <TextField
                  label="Имя и фамилия"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  onBlur={() => setNameTouched(true)}
                  required
                  placeholder="Иван Иванов"
                  autoComplete="name"
                  error={Boolean(nameError)}
                  helperText={nameError || 'Только буквы, пробел и дефис'}
                />

                <TextField
                  label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                  required placeholder="your@email.com" autoComplete="email"
                />

                {/* Student-only fields */}
                {form.role === 'STUDENT' && (
                  <>
                    <FormControl size="small">
                      <InputLabel>Класс / статус учёбы</InputLabel>
                      <Select value={form.grade} label="Класс / статус учёбы" onChange={(e) => set('grade', e.target.value)}>
                        <MenuItem value=""><em>Не указывать</em></MenuItem>
                        {GRADE_OPTIONS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                      </Select>
                    </FormControl>

                    <FormControl size="small">
                      <InputLabel>Цель обучения</InputLabel>
                      <Select value={form.learningGoal} label="Цель обучения" onChange={(e) => set('learningGoal', e.target.value)}>
                        <MenuItem value=""><em>Не указывать</em></MenuItem>
                        {GOAL_OPTIONS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </>
                )}

                <TextField
                  label="Пароль" type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={(e) => set('password', e.target.value)} required placeholder="Минимум 6 символов"
                  autoComplete="new-password"
                  InputProps={{ endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPw((v) => !v)} edge="end" size="small" tabIndex={-1}>
                        {showPw ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  )}}
                />

                <TextField
                  label="Повторите пароль" type={showConfirm ? 'text' : 'password'} value={form.confirmPassword}
                  onChange={(e) => set('confirmPassword', e.target.value)} required placeholder="Повторите пароль"
                  autoComplete="new-password" error={!passwordsMatch}
                  helperText={!passwordsMatch ? 'Пароли не совпадают' : ''}
                  InputProps={{ endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowConfirm((v) => !v)} edge="end" size="small" tabIndex={-1}>
                        {showConfirm ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  )}}
                />

                <Button type="submit" variant="contained" size="large" fullWidth disabled={loading || !passwordsMatch || Boolean(nameError && nameTouched)}>
                  {loading ? 'Создание аккаунта...' : 'Зарегистрироваться'}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2.5 }}>
          Уже есть аккаунт?{' '}
          <Typography component={Link} to="/login" variant="body2" color="primary" fontWeight={600} sx={{ textDecoration: 'none' }}>
            Войти
          </Typography>
        </Typography>
      </Box>
    </Box>
  );
}
