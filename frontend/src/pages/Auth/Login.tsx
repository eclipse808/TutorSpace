import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  InputAdornment, IconButton, Chip, Divider, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const DEMO_ACCOUNTS = [
  { label: '👩 Анна (ученик)', email: 'anna@demo.com', pw: 'password123' },
  { label: '🎓 Мария (репетитор)', email: 'maria@demo.com', pw: 'password123' },
  { label: '🧑 Дмитрий (ученик)', email: 'dmitri@demo.com', pw: 'password123' },
  { label: '🎓 Иван (репетитор)', email: 'ivan@demo.com', pw: 'password123' },
  { label: '🛡️ Администратор', email: 'admin@demo.com', pw: 'admin123' },
];

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.token, data.user);
      if (data.user.role === 'STUDENT') navigate('/student/dashboard');
      else if (data.user.role === 'ADMIN') navigate('/admin');
      else if (data.user.tutorStatus === 'APPROVED') navigate('/tutor/dashboard');
      else navigate('/tutor/pending');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ width: 56, height: 56, bgcolor: 'primary.main', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <SchoolIcon sx={{ color: 'white', fontSize: 28 }} />
          </Box>
          <Typography variant="h4" fontWeight={700} color="text.primary">Добро пожаловать</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Войдите в свой аккаунт</Typography>
        </Box>

        <Card elevation={1}>
          <CardContent sx={{ p: 3 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="your@email.com"
                />
                <TextField
                  label="Пароль"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPw(!showPw)} edge="end" size="small">
                          {showPw ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Box sx={{ textAlign: 'right', mt: -1 }}>
                  <Typography
                    variant="caption"
                    color="primary"
                    sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                    onClick={() => setForgotOpen(true)}
                  >
                    Забыли пароль?
                  </Typography>
                </Box>
                <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
                  {loading ? 'Вход...' : 'Войти'}
                </Button>
              </Stack>
            </Box>

            <Divider sx={{ my: 2.5 }}>
              <Typography variant="caption" color="text.secondary">Быстрый вход (демо)</Typography>
            </Divider>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {DEMO_ACCOUNTS.map((d) => (
                <Chip
                  key={d.email}
                  label={d.label}
                  onClick={() => { setEmail(d.email); setPassword(d.pw); }}
                  size="small"
                  sx={{ cursor: 'pointer', bgcolor: '#F0EBF8', color: 'primary.main', '&:hover': { bgcolor: '#E4DBF5' } }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2.5 }}>
          Нет аккаунта?{' '}
          <Typography component={Link} to="/register" variant="body2" color="primary" fontWeight={600} sx={{ textDecoration: 'none' }}>
            Зарегистрироваться
          </Typography>
        </Typography>
      </Box>

      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Восстановление пароля</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            Автоматическая отправка писем пока не настроена.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
            Для сброса пароля обратитесь к администратору:
          </Typography>
          <Typography variant="body2" fontWeight={600} color="primary" sx={{ mt: 0.5 }}>
            admin@tutorspace.ru
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="contained" fullWidth onClick={() => setForgotOpen(false)}>Понятно</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
