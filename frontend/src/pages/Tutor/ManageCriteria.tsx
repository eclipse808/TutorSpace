import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Stack, Alert, Chip,
  TextField, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Menu, MenuItem, Tooltip, Select, FormControl, InputLabel,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { CompetencyCriteria } from '../../types';
import { PageLoader } from '../../components/Common/LoadingSpinner';
import api from '../../api/client';

interface CriteriaForm { name: string; subject: string; description: string; }

const TEMPLATES: Record<string, { name: string; description: string }[]> = {
  'Английский язык': [
    { name: 'Говорение', description: 'Беглость и правильность устной речи' },
    { name: 'Грамматика', description: 'Знание и применение грамматических правил' },
    { name: 'Аудирование', description: 'Понимание речи на слух' },
    { name: 'Чтение', description: 'Понимание письменных текстов' },
    { name: 'Письмо', description: 'Навыки письменной речи' },
    { name: 'Словарный запас', description: 'Объём и точность использования лексики' },
  ],
  'Французский язык': [
    { name: 'Говорение', description: 'Беглость и правильность устной речи' },
    { name: 'Грамматика', description: 'Глагольные формы, согласование, артикли' },
    { name: 'Аудирование', description: 'Понимание французской речи на слух' },
    { name: 'Чтение', description: 'Понимание текстов на французском' },
    { name: 'Письмо', description: 'Правописание и письменные навыки' },
    { name: 'Словарный запас', description: 'Лексика и устойчивые выражения' },
  ],
  'Немецкий язык': [
    { name: 'Говорение', description: 'Произношение и разговорные навыки' },
    { name: 'Грамматика', description: 'Падежи, порядок слов, глагольные формы' },
    { name: 'Аудирование', description: 'Понимание немецкой речи' },
    { name: 'Чтение', description: 'Работа с текстами на немецком' },
    { name: 'Письмо', description: 'Написание текстов и сообщений' },
    { name: 'Словарный запас', description: 'Тематическая лексика' },
  ],
  'Русский язык': [
    { name: 'Орфография', description: 'Правильное написание слов' },
    { name: 'Пунктуация', description: 'Расстановка знаков препинания' },
    { name: 'Грамматика', description: 'Морфология и синтаксис' },
    { name: 'Сочинение', description: 'Навыки письменной речи и аргументации' },
    { name: 'Анализ текста', description: 'Работа с художественным текстом' },
  ],
  'Литература': [
    { name: 'Анализ текста', description: 'Разбор художественных произведений' },
    { name: 'Написание сочинений', description: 'Аргументация и структура текста' },
    { name: 'Знание произведений', description: 'Содержание, герои, темы' },
    { name: 'Теория литературы', description: 'Термины, жанры, стили' },
    { name: 'Выразительность речи', description: 'Риторические приёмы и образы' },
  ],
  'Математика': [
    { name: 'Алгебра', description: 'Уравнения, функции, неравенства' },
    { name: 'Геометрия', description: 'Планиметрия и стереометрия' },
    { name: 'Логика и доказательство', description: 'Умение строить логические цепочки' },
    { name: 'Вычислительные навыки', description: 'Скорость и точность вычислений' },
    { name: 'Решение задач', description: 'Применение методов к нестандартным задачам' },
  ],
  'Алгебра': [
    { name: 'Линейные уравнения', description: 'Решение линейных уравнений и систем' },
    { name: 'Квадратные уравнения', description: 'Формулы, дискриминант, разложение' },
    { name: 'Функции и графики', description: 'Построение и анализ функций' },
    { name: 'Неравенства', description: 'Решение неравенств и систем' },
    { name: 'Прогрессии', description: 'Арифметические и геометрические прогрессии' },
  ],
  'Геометрия': [
    { name: 'Планиметрия', description: 'Теоремы и задачи на плоскости' },
    { name: 'Стереометрия', description: 'Тела вращения, многогранники' },
    { name: 'Векторы', description: 'Операции с векторами, скалярное произведение' },
    { name: 'Координаты', description: 'Координатный метод в геометрии' },
    { name: 'Доказательство теорем', description: 'Логическое обоснование утверждений' },
  ],
  'Физика': [
    { name: 'Механика', description: 'Кинематика, динамика, законы сохранения' },
    { name: 'Электричество и магнетизм', description: 'Электрические цепи, поля' },
    { name: 'Термодинамика', description: 'Тепловые процессы, законы термодинамики' },
    { name: 'Оптика и волны', description: 'Световые явления, колебания' },
    { name: 'Решение задач', description: 'Применение формул и методов' },
  ],
  'Химия': [
    { name: 'Неорганическая химия', description: 'Основные классы неорганических соединений' },
    { name: 'Органическая химия', description: 'Углеводороды и их производные' },
    { name: 'Химические расчёты', description: 'Молярные массы, уравнения реакций' },
    { name: 'Практика', description: 'Навыки лабораторной работы' },
  ],
  'Биология': [
    { name: 'Клетка и молекулярная биология', description: 'Строение клетки, ДНК, синтез белка' },
    { name: 'Генетика', description: 'Законы Менделя, наследственность' },
    { name: 'Анатомия и физиология', description: 'Системы органов человека' },
    { name: 'Экология', description: 'Экосистемы, цепи питания' },
    { name: 'Эволюция', description: 'Теория Дарвина, отбор, адаптация' },
  ],
  'Информатика': [
    { name: 'Программирование', description: 'Знание языков и алгоритмов' },
    { name: 'Структуры данных', description: 'Массивы, списки, деревья' },
    { name: 'Алгоритмы', description: 'Сортировка, поиск, динамическое программирование' },
    { name: 'Дискретная математика', description: 'Теория множеств, графы, комбинаторика' },
    { name: 'Базы данных', description: 'SQL, реляционная модель' },
  ],
  'История': [
    { name: 'Знание дат и событий', description: 'Хронология и ключевые события' },
    { name: 'Анализ источников', description: 'Работа с историческими документами' },
    { name: 'Написание эссе', description: 'Аргументация и структура исторического текста' },
    { name: 'Причинно-следственные связи', description: 'Выявление закономерностей' },
    { name: 'Историография', description: 'Различные точки зрения на события' },
  ],
  'География': [
    { name: 'Физическая география', description: 'Рельеф, климат, природные зоны' },
    { name: 'Экономическая география', description: 'Хозяйство, отрасли, регионы' },
    { name: 'Картография', description: 'Работа с картами и атласами' },
    { name: 'Страноведение', description: 'Знание стран, столиц, особенностей' },
    { name: 'Экология', description: 'Экологические проблемы и ресурсы' },
  ],
};

const LAVENDER = '#7C5CBF';
const LAVENDER_BG = '#F0EBF8';

export default function ManageCriteria() {
  const [criteria, setCriteria] = useState<CompetencyCriteria[]>([]);
  const [tutorSubjects, setTutorSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CriteriaForm>({ name: '', subject: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateAnchor, setTemplateAnchor] = useState<null | HTMLElement>(null);
  const [deletingSubject, setDeletingSubject] = useState<string | null>(null);

  const fetchCriteria = () => {
    api.get('/competencies/criteria').then((r) => setCriteria(r.data));
  };

  useEffect(() => {
    Promise.all([
      api.get('/competencies/criteria').then((r) => setCriteria(r.data)),
      api.get('/tutors/me/profile').then((r) => setTutorSubjects(r.data.subjects || [])),
    ]).finally(() => setLoading(false));
  }, []);

  // All available subjects for new criteria = tutor's subjects + any already-used subjects
  const usedSubjects = [...new Set(criteria.map((c) => c.subject))];
  const allSubjectOptions = [...new Set([...tutorSubjects, ...usedSubjects])].sort();

  const resetForm = () => {
    setForm({ name: '', subject: tutorSubjects[0] || '', description: '' });
    setEditId(null);
    setDialogOpen(false);
    setError('');
  };

  const handleSave = async () => {
    if (!form.name || !form.subject) { setError('Заполните название и предмет'); return; }
    setSaving(true);
    setError('');
    try {
      if (editId) await api.put(`/competencies/criteria/${editId}`, form);
      else await api.post('/competencies/criteria', form);
      fetchCriteria();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (c: CompetencyCriteria) => {
    setForm({ name: c.name, subject: c.subject, description: c.description || '' });
    setEditId(c.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить критерий? Все оценки по нему будут также удалены.')) return;
    await api.delete(`/competencies/criteria/${id}`);
    fetchCriteria();
  };

  const handleDeleteSubject = async (subject: string) => {
    if (!confirm(`Удалить весь раздел «${subject}» со всеми критериями?`)) return;
    setDeletingSubject(subject);
    try {
      const ids = grouped[subject].map((c) => c.id);
      await Promise.all(ids.map((id) => api.delete(`/competencies/criteria/${id}`)));
      fetchCriteria();
    } finally {
      setDeletingSubject(null);
    }
  };

  const loadTemplate = async (subject: string) => {
    setTemplateAnchor(null);
    const items = TEMPLATES[subject];
    if (!items) return;
    setSaving(true);
    try {
      for (const item of items) {
        await api.post('/competencies/criteria', { name: item.name, subject, description: item.description });
      }
      fetchCriteria();
    } finally {
      setSaving(false);
    }
  };

  const grouped = criteria.reduce<Record<string, CompetencyCriteria[]>>((acc, c) => {
    if (!acc[c.subject]) acc[c.subject] = [];
    acc[c.subject].push(c);
    return acc;
  }, {});

  // Template subjects that don't have criteria yet
  const availableTemplates = Object.keys(TEMPLATES).filter((subj) => !grouped[subj]);

  if (loading) return <PageLoader />;

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Критерии оценки</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>Настройте компетенции по каждому предмету</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {availableTemplates.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<AutoAwesomeIcon />}
              onClick={(e) => setTemplateAnchor(e.currentTarget)}
              disabled={saving}
            >
              Шаблон
            </Button>
          )}
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setDialogOpen(true); }}>
            Добавить
          </Button>
        </Stack>
      </Stack>

      <Menu
        anchorEl={templateAnchor}
        open={Boolean(templateAnchor)}
        onClose={() => setTemplateAnchor(null)}
        PaperProps={{ sx: { borderRadius: 3, minWidth: 220, boxShadow: '0 8px 32px rgba(124,92,191,0.15)', maxHeight: 400 } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
            ЗАГРУЗИТЬ ШАБЛОН:
          </Typography>
        </Box>
        {availableTemplates.map((subj) => (
          <MenuItem key={subj} onClick={() => loadTemplate(subj)} disabled={saving}>
            <Typography variant="body2">{subj}</Typography>
          </MenuItem>
        ))}
      </Menu>

      {Object.keys(grouped).length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 12, color: 'text.secondary' }}>
          <MenuBookIcon sx={{ fontSize: 56, opacity: 0.35, mb: 2 }} />
          <Typography variant="h6" fontWeight={600} mb={1}>Нет критериев оценки</Typography>
          <Typography variant="body2" mb={3}>Добавьте вручную или загрузите готовый шаблон по предмету</Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="outlined" startIcon={<AutoAwesomeIcon />} onClick={(e) => setTemplateAnchor(e.currentTarget)}>
              Загрузить шаблон
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
              Добавить вручную
            </Button>
          </Stack>
        </Box>
      ) : (
        <Stack spacing={3}>
          {Object.entries(grouped).map(([subject, items]) => (
            <Card key={subject} elevation={1}>
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 2, borderBottom: '1px solid #F7F5FC' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 36, height: 36, bgcolor: LAVENDER_BG, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MenuBookIcon sx={{ color: LAVENDER, fontSize: 18 }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>{subject}</Typography>
                      <Typography variant="caption" color="text.secondary">{items.length} критери{items.length === 1 ? 'й' : items.length < 5 ? 'я' : 'ев'}</Typography>
                    </Box>
                  </Stack>
                  <Tooltip title={`Удалить раздел «${subject}»`}>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteSubject(subject)}
                      disabled={deletingSubject === subject}
                      sx={{ color: 'text.disabled', '&:hover': { color: 'error.main', bgcolor: '#FEF2F2' } }}
                    >
                      <DeleteSweepIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Stack divider={<Box sx={{ borderBottom: '1px solid #F7F5FC' }} />}>
                  {items.map((c) => (
                    <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 1.75 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: LAVENDER, flexShrink: 0 }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                        {c.description && (
                          <Typography variant="caption" color="text.secondary">{c.description}</Typography>
                        )}
                      </Box>
                      <Stack direction="row" spacing={0.5} flexShrink={0}>
                        <IconButton size="small" onClick={() => handleEdit(c)}
                          sx={{ color: 'text.disabled', '&:hover': { color: LAVENDER, bgcolor: LAVENDER_BG } }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(c.id)}
                          sx={{ color: 'text.disabled', '&:hover': { color: 'error.main', bgcolor: '#FEF2F2' } }}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                  ))}
                </Stack>

                <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid #F7F5FC' }}>
                  <Button size="small" startIcon={<AddIcon />}
                    onClick={() => { setForm({ name: '', subject, description: '' }); setEditId(null); setDialogOpen(true); }}
                    sx={{ color: 'text.secondary', fontSize: 12 }}>
                    Добавить критерий
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onClose={resetForm} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>{editId ? 'Редактировать критерий' : 'Новый критерий'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Предмет *</InputLabel>
                <Select
                  value={form.subject}
                  label="Предмет *"
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                >
                  {allSubjectOptions.length > 0 ? (
                    allSubjectOptions.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)
                  ) : (
                    // Fallback: show all template subjects if tutor has no subjects set yet
                    Object.keys(TEMPLATES).map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)
                  )}
                </Select>
              </FormControl>
              <TextField
                label="Название *"
                fullWidth
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Грамматика"
              />
            </Stack>
            <TextField
              label="Описание (необязательно)"
              fullWidth
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Краткое описание критерия..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button variant="outlined" onClick={resetForm} sx={{ flex: 1 }}>Отмена</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ flex: 1 }}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
