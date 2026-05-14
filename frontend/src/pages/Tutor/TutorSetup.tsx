import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, Stack, Alert, Chip,
  TextField, Avatar, Stepper, Step, StepLabel, LinearProgress,
  IconButton,
} from '@mui/material';
import GraduationCapIcon from '@mui/icons-material/School';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import UploadIcon from '@mui/icons-material/Upload';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CloseIcon from '@mui/icons-material/Close';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { User } from '../../types';

const SUBJECTS = [
  'Математика', 'Алгебра', 'Геометрия', 'Физика', 'Химия', 'Биология',
  'Английский язык', 'Французский язык', 'Немецкий язык', 'Русский язык',
  'История', 'География', 'Информатика', 'Литература',
];

const LAVENDER = '#7C5CBF';
const LAVENDER_BG = '#F0EBF8';
const STEPS = ['Предметы и опыт', 'О себе', 'Фото и документы'];

export default function TutorSetup() {
  const navigate = useNavigate();
  const { user, token, setAuth } = useAuthStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const certRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    subjects: [] as string[],
    hourlyRate: '',
    experience: '',
    bio: '',
    education: '',
    photoFile: null as File | null,
    photoPreview: '',
    certs: [] as File[],
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const toggleSubject = (s: string) => {
    set('subjects', form.subjects.includes(s)
      ? form.subjects.filter((x) => x !== s)
      : [...form.subjects, s]);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    set('photoFile', file);
    set('photoPreview', URL.createObjectURL(file));
  };

  const handleCerts = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(
      (f) => f.type.startsWith('image/') || f.type === 'application/pdf'
    );
    setForm((f) => ({ ...f, certs: [...f.certs, ...files].slice(0, 5) }));
    if (certRef.current) certRef.current.value = '';
  };

  const removeCert = (i: number) => setForm((f) => ({ ...f, certs: f.certs.filter((_, idx) => idx !== i) }));

  const nextStep = () => {
    setError('');
    if (step === 0) {
      if (form.subjects.length === 0) { setError('Выберите хотя бы один предмет'); return; }
      if (!form.hourlyRate || !form.experience) { setError('Укажите опыт и ставку'); return; }
    }
    if (step === 1) {
      if (!form.bio || !form.education) { setError('Заполните все поля'); return; }
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await api.put('/tutors/setup', {
        subjects: form.subjects,
        hourlyRate: Number(form.hourlyRate),
        experience: Number(form.experience),
        bio: form.bio,
        education: form.education,
      });

      if (form.photoFile) {
        const fd = new FormData();
        fd.append('photo', form.photoFile);
        await api.post('/upload/photo', fd);
      }

      if (form.certs.length > 0) {
        const fd = new FormData();
        form.certs.forEach((f) => fd.append('certificates', f));
        await api.post('/upload/certs', fd).catch(() => {});
      }

      if (user && token) setAuth(token, { ...user, tutorStatus: 'PENDING' } as User);
      navigate('/tutor/pending');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
      <Box sx={{ width: '100%', maxWidth: 520 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ width: 64, height: 64, bgcolor: LAVENDER, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <GraduationCapIcon sx={{ color: 'white', fontSize: 32 }} />
          </Box>
          <Typography variant="h5" fontWeight={700}>Настройка профиля репетитора</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>Заполните данные для начала работы</Typography>
        </Box>

        <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        <LinearProgress
          variant="determinate"
          value={((step + 1) / STEPS.length) * 100}
          sx={{ mb: 3, height: 4, borderRadius: 2, bgcolor: '#EDE9F7', '& .MuiLinearProgress-bar': { bgcolor: LAVENDER } }}
        />

        <Card elevation={1}>
          <CardContent sx={{ p: 3 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {step === 0 && (
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} mb={1.5}>Предметы (выберите один или несколько)</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {SUBJECTS.map((s) => (
                      <Chip
                        key={s}
                        label={s}
                        onClick={() => toggleSubject(s)}
                        sx={{
                          cursor: 'pointer',
                          fontWeight: form.subjects.includes(s) ? 700 : 400,
                          bgcolor: form.subjects.includes(s) ? LAVENDER : LAVENDER_BG,
                          color: form.subjects.includes(s) ? 'white' : LAVENDER,
                          '&:hover': { bgcolor: form.subjects.includes(s) ? '#6A4DAD' : '#E0D4F5' },
                        }}
                      />
                    ))}
                  </Box>
                </Box>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Опыт (лет)"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0, max: 50 }}
                    value={form.experience}
                    onChange={(e) => set('experience', e.target.value)}
                    placeholder="5"
                  />
                  <TextField
                    label="Ставка (₽/час)"
                    type="number"
                    fullWidth
                    inputProps={{ min: 100, max: 50000 }}
                    value={form.hourlyRate}
                    onChange={(e) => set('hourlyRate', e.target.value)}
                    placeholder="1500"
                  />
                </Stack>
                <Button variant="contained" size="large" endIcon={<ChevronRightIcon />} onClick={nextStep} fullWidth>
                  Далее
                </Button>
              </Stack>
            )}

            {step === 1 && (
              <Stack spacing={3}>
                <TextField
                  label="О себе"
                  multiline
                  rows={4}
                  fullWidth
                  value={form.bio}
                  onChange={(e) => set('bio', e.target.value)}
                  placeholder="Расскажите о своём опыте, методах преподавания, достижениях..."
                />
                <TextField
                  label="Образование"
                  fullWidth
                  value={form.education}
                  onChange={(e) => set('education', e.target.value)}
                  placeholder="МГУ, факультет математики"
                />
                <Stack direction="row" spacing={2}>
                  <Button variant="outlined" startIcon={<ChevronLeftIcon />} onClick={() => { setError(''); setStep(0); }} sx={{ flex: 1 }}>
                    Назад
                  </Button>
                  <Button variant="contained" endIcon={<ChevronRightIcon />} onClick={nextStep} sx={{ flex: 1 }}>
                    Далее
                  </Button>
                </Stack>
              </Stack>
            )}

            {step === 2 && (
              <Stack spacing={3}>
                {/* Photo */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} mb={1.5}>Фото профиля</Typography>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    {form.photoPreview ? (
                      <Avatar src={form.photoPreview} sx={{ width: 72, height: 72 }} />
                    ) : (
                      <Avatar sx={{ width: 72, height: 72, bgcolor: LAVENDER_BG, color: LAVENDER, fontWeight: 700, fontSize: 22 }}>
                        {user?.name?.slice(0, 2).toUpperCase() || '?'}
                      </Avatar>
                    )}
                    <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => fileRef.current?.click()} size="small">
                      {form.photoPreview ? 'Изменить фото' : 'Загрузить фото'}
                    </Button>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                  </Stack>
                </Box>

                {/* Certificates */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    Документы об образовании
                    <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 1 }}>необязательно · до 5 файлов</Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    Дипломы и сертификаты помогут администратору быстрее одобрить ваш профиль
                  </Typography>

                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<AttachFileIcon />}
                    disabled={form.certs.length >= 5}
                    size="small"
                    sx={{ borderStyle: 'dashed', borderColor: 'divider', color: 'text.secondary', '&:hover': { borderColor: 'primary.main', color: 'primary.main', bgcolor: LAVENDER_BG } }}
                  >
                    Прикрепить файл
                    <input ref={certRef} type="file" hidden multiple accept="image/*,application/pdf" onChange={handleCerts} />
                  </Button>

                  {form.certs.length > 0 && (
                    <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                      {form.certs.map((f, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, bgcolor: '#F7F5FC', borderRadius: 1.5 }}>
                          <InsertDriveFileIcon sx={{ fontSize: 14, color: '#9B83CF' }} />
                          <Typography variant="caption" noWrap sx={{ flex: 1 }}>{f.name}</Typography>
                          <Typography variant="caption" color="text.disabled">{(f.size / 1024).toFixed(0)} КБ</Typography>
                          <IconButton size="small" onClick={() => removeCert(i)} sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                            <CloseIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>

                <Stack direction="row" spacing={2}>
                  <Button variant="outlined" startIcon={<ChevronLeftIcon />} onClick={() => { setError(''); setStep(1); }} sx={{ flex: 1 }}>
                    Назад
                  </Button>
                  <Button variant="contained" size="large" onClick={handleSubmit} disabled={loading} sx={{ flex: 1 }}>
                    {loading ? 'Отправка...' : 'Отправить на проверку'}
                  </Button>
                </Stack>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
