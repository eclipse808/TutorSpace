import { Box, Typography, Card, CardContent, Button, Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function PendingApproval() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const status = user?.tutorStatus;

  const handleLogout = () => { logout(); navigate('/'); };

  const config = status === 'REJECTED'
    ? { icon: <CancelIcon sx={{ fontSize: 48, color: 'error.main' }} />, bgcolor: '#FEF2F2', title: 'Заявка отклонена', desc: 'К сожалению, ваша заявка была отклонена. Пожалуйста, свяжитесь с администрацией для получения подробной информации.' }
    : status === 'APPROVED'
    ? { icon: <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main' }} />, bgcolor: '#F0FDF4', title: 'Профиль одобрен!', desc: 'Ваш профиль репетитора был одобрен. Теперь вы можете начать работу.' }
    : { icon: <HourglassEmptyIcon sx={{ fontSize: 48, color: 'primary.main' }} />, bgcolor: '#F0EBF8', title: 'Заявка на рассмотрении', desc: 'Ваш профиль отправлен на проверку администратором. Обычно это занимает 1–2 рабочих дня.' };

  return (
    <Box sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        <Card elevation={1}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Box sx={{ width: 96, height: 96, borderRadius: '50%', bgcolor: config.bgcolor, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
              {config.icon}
            </Box>

            <Typography variant="h5" fontWeight={700} mb={1}>{config.title}</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>{config.desc}</Typography>

            {status === 'REJECTED' && (
              <Button variant="outlined" fullWidth href="mailto:support@tutorspace.ru" sx={{ mb: 2 }}>
                Связаться с поддержкой
              </Button>
            )}

            {status === 'APPROVED' && (
              <Button variant="contained" fullWidth size="large" onClick={() => navigate('/tutor/dashboard')} sx={{ mb: 2 }}>
                Перейти в кабинет
              </Button>
            )}

            {!status || status === 'PENDING' ? (
              <Box sx={{ bgcolor: '#F7F5FC', borderRadius: 3, p: 2.5, textAlign: 'left', mb: 3 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1.5}>
                  ЧТО БУДЕТ ДАЛЬШЕ:
                </Typography>
                <Stack spacing={1.25}>
                  {[
                    'Администратор проверит ваши данные',
                    'Вы получите уведомление о решении',
                    'После одобрения вы сможете принимать учеников',
                  ].map((text, i) => (
                    <Stack key={i} direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#E0D4F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Typography variant="caption" fontWeight={700} color="primary">{i + 1}</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">{text}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            ) : null}

            <Button
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{ color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}
            >
              Выйти из аккаунта
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
