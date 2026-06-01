import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, Box, Typography, Stack, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SchoolIcon from '@mui/icons-material/School';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const LAVENDER = '#7C5CBF';

const STEPS = [
  {
    icon: <SchoolIcon sx={{ fontSize: 40, color: LAVENDER }} />,
    bg: '#F0EBF8',
    title: 'Добро пожаловать в TutorSpace!',
    text: 'Здесь вы найдёте репетитора, запишетесь на занятия и увидите свой прогресс в красивых графиках. Быстрая экскурсия по платформе — займёт меньше минуты.',
  },
  {
    icon: <PeopleIcon sx={{ fontSize: 40, color: LAVENDER }} />,
    bg: '#F0EBF8',
    title: 'Найдите своего репетитора',
    text: 'Перейдите в раздел «Репетиторы» и выбирайте по предмету, рейтингу и цене. Откройте профиль — там описание, отзывы учеников и кнопка «Записаться».',
  },
  {
    icon: <CalendarMonthIcon sx={{ fontSize: 40, color: '#3b82f6' }} />,
    bg: '#EFF6FF',
    title: 'Занятия и связь с репетитором',
    text: 'Раздел «Занятия» — все ваши записи. Нажмите значок 💬 на карточке занятия, чтобы написать репетитору напрямую: уточнить детали или получить ссылку на видеозвонок.',
  },
  {
    icon: <BarChartIcon sx={{ fontSize: 40, color: '#22c55e' }} />,
    bg: '#F0FDF4',
    title: 'Следите за прогрессом',
    text: 'После занятий репетитор оценивает ваши навыки по критериям. В разделе «Прогресс» появятся радар-диаграммы — вы увидите рост каждой компетенции за неделю и за месяц.',
  },
  {
    icon: <TrackChangesIcon sx={{ fontSize: 40, color: '#f59e0b' }} />,
    bg: '#FFFBEB',
    title: 'Цели и XP',
    text: 'Репетитор ставит вам задания с наградой в XP. Выполняйте их, повышайте уровень и открывайте новые рамки и оформление профиля. Раздел «Достижения» покажет все ваши награды.',
  },
  {
    icon: <EmojiEventsIcon sx={{ fontSize: 40, color: '#f59e0b' }} />,
    bg: '#FFFBEB',
    title: 'Всё готово!',
    text: 'Начните с поиска репетитора по нужному предмету. Если возникнут вопросы — пишите ему через чат прямо на сайте. Удачи в учёбе!',
  },
];

export default function WelcomeGuide({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const key = `ts_guide_${userId}`;

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(key)) setOpen(true);
  }, [key]);

  const close = () => { localStorage.setItem(key, '1'); setOpen(false); };
  const reopen = () => { setStep(0); setOpen(true); };

  // Expose reopen via custom event so dashboard button can trigger it
  useEffect(() => {
    const handler = () => reopen();
    window.addEventListener('ts:open-guide', handler);
    return () => window.removeEventListener('ts:open-guide', handler);
  }, []);

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'visible' } }}>
      <DialogContent sx={{ p: 0 }}>
        <IconButton onClick={close} size="small"
          sx={{ position: 'absolute', top: 10, right: 10, color: 'text.disabled', zIndex: 1 }}>
          <CloseIcon fontSize="small" />
        </IconButton>

        {/* Slide content */}
        <Box sx={{ px: 4, pt: 4.5, pb: 2.5, textAlign: 'center' }}>
          <Box sx={{ width: 76, height: 76, borderRadius: '20px', bgcolor: s.bg, mx: 'auto', mb: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            {s.icon}
          </Box>
          <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ mb: 1.5, lineHeight: 1.35 }}>
            {s.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75, minHeight: 72 }}>
            {s.text}
          </Typography>
        </Box>

        {/* Dot indicators */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.75, py: 1 }}>
          {STEPS.map((_, i) => (
            <Box key={i} onClick={() => setStep(i)}
              sx={{ width: i === step ? 22 : 8, height: 8, borderRadius: 4, cursor: 'pointer', transition: 'all 0.25s',
                bgcolor: i === step ? LAVENDER : '#D5C9EE' }} />
          ))}
        </Box>

        {/* Buttons */}
        <Box sx={{ px: 3, pb: 3.5, pt: 1.5 }}>
          <Stack direction="row" spacing={1.5}>
            {step > 0 && (
              <Button variant="outlined" onClick={() => setStep((p) => p - 1)} sx={{ flex: 1 }}>
                Назад
              </Button>
            )}
            {!isLast ? (
              <Button variant="contained" onClick={() => setStep((p) => p + 1)} sx={{ flex: 1 }}>
                Далее
              </Button>
            ) : (
              <Button variant="contained" onClick={() => { close(); navigate('/tutors'); }} sx={{ flex: 1 }}>
                Найти репетитора →
              </Button>
            )}
          </Stack>
          {step === 0 && (
            <Button size="small" onClick={close}
              sx={{ display: 'block', mx: 'auto', mt: 1.5, color: 'text.disabled', fontSize: 12, textTransform: 'none' }}>
              Пропустить
            </Button>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
