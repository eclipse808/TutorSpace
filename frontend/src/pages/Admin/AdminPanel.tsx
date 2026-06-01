import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Stack, Avatar,
  Chip, Grid, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, CircularProgress, Divider, IconButton,
  InputAdornment,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import StarIcon from '@mui/icons-material/Star';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ImageIcon from '@mui/icons-material/Image';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import SearchIcon from '@mui/icons-material/Search';
import GroupIcon from '@mui/icons-material/Group';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';
import HistoryIcon from '@mui/icons-material/History';
import api from '../../api/client';
import { TutorProfile, TutorStatus, SubjectRequest, SubjectRequestStatus } from '../../types';
import { PageLoader } from '../../components/Common/LoadingSpinner';

type ProfileChangeRequest = {
  id: string;
  tutorProfileId: string;
  bio?: string;
  education?: string;
  experience?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNote?: string;
  createdAt: string;
  tutorProfile: {
    user: { name: string; email: string };
    bio?: string;
    education?: string;
    experience?: number;
  };
};

type TutorWithStatus = TutorProfile & {
  status: TutorStatus;
  certificateUrls: string[];
  user: { id: string; name: string; email: string; avatar?: string; createdAt: string };
};

const LAVENDER = '#7C5CBF';
const LAVENDER_BG = '#F0EBF8';
const API_BASE = '';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' });
}

function StatusChip({ status }: { status: TutorStatus }) {
  if (status === 'APPROVED') return <Chip label="Одобрен" size="small" color="success" variant="outlined" />;
  if (status === 'REJECTED') return <Chip label="Отклонён" size="small" color="error" variant="outlined" />;
  return <Chip label="На проверке" size="small" color="warning" variant="outlined" />;
}

function SubjectStatusChip({ status }: { status: SubjectRequestStatus }) {
  if (status === 'APPROVED') return <Chip label="Одобрено" size="small" color="success" variant="outlined" />;
  if (status === 'REJECTED') return <Chip label="Отклонено" size="small" color="error" variant="outlined" />;
  return <Chip label="На проверке" size="small" color="warning" variant="outlined" />;
}

// ── stat row ──────────────────────────────────────────────────────────────────

const STAT_DEFS: { key: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'; label: string; bgcolor: string; iconColor: string }[] = [
  { key: 'ALL',      label: 'Всего',        bgcolor: LAVENDER_BG, iconColor: LAVENDER   },
  { key: 'PENDING',  label: 'На проверке',  bgcolor: '#FEFCE8',   iconColor: '#d97706'  },
  { key: 'APPROVED', label: 'Одобрено',     bgcolor: '#F0FDF4',   iconColor: '#16a34a'  },
  { key: 'REJECTED', label: 'Отклонено',    bgcolor: '#FEF2F2',   iconColor: '#dc2626'  },
];

const STAT_ICONS: Record<string, React.ReactNode> = {
  ALL:      <GroupIcon fontSize="small" />,
  PENDING:  <AccessTimeIcon fontSize="small" />,
  APPROVED: <CheckCircleOutlineIcon fontSize="small" />,
  REJECTED: <DoNotDisturbIcon fontSize="small" />,
};

function StatRow({ counts, active, onSelect }: {
  counts: Record<string, number>; active: string; onSelect: (k: string) => void;
}) {
  return (
    <Grid container spacing={1.5} sx={{ mb: 3 }}>
      {STAT_DEFS.map((s) => (
        <Grid item xs={6} sm={3} key={s.key}>
          <Card
            elevation={active === s.key ? 3 : 1}
            onClick={() => onSelect(s.key)}
            sx={{ cursor: 'pointer', outline: active === s.key ? `2px solid ${LAVENDER}` : 'none', transition: 'all 0.15s' }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ width: 36, height: 36, bgcolor: s.bgcolor, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, color: s.iconColor }}>
                {STAT_ICONS[s.key]}
              </Box>
              <Typography variant="h5" fontWeight={700} color={active === s.key ? LAVENDER : 'text.primary'}>
                {counts[s.key] ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

// ── shared card ───────────────────────────────────────────────────────────────

interface ReviewCardProps {
  initials: string; photoUrl?: string; name: string; email: string;
  date: string; statusNode: React.ReactNode; tags?: React.ReactNode; onReview: () => void;
}

function ReviewCard({ initials, photoUrl, name, email, date, statusNode, tags, onReview }: ReviewCardProps) {
  return (
    <Card elevation={1} sx={{ transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 16px rgba(124,92,191,0.12)' } }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar src={photoUrl} sx={{ width: 48, height: 48, bgcolor: LAVENDER_BG, color: LAVENDER, fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
            {!photoUrl && initials}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={0.75}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight={700} noWrap>{name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>{email}</Typography>
              </Box>
              {statusNode}
            </Stack>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25 }}>{date}</Typography>
            {tags && <Box sx={{ mt: 1 }}>{tags}</Box>}
          </Box>
        </Stack>
        <Button
          fullWidth variant="outlined" size="small" onClick={onReview}
          sx={{ mt: 2, borderColor: '#D5C9EE', color: LAVENDER, fontWeight: 600, '&:hover': { bgcolor: LAVENDER_BG, borderColor: LAVENDER } }}
        >
          Рассмотреть
        </Button>
      </CardContent>
    </Card>
  );
}

// ── dialog header ─────────────────────────────────────────────────────────────

function DialogHeader({ initials, photoUrl, name, email, date, statusNode, onClose }: {
  initials: string; photoUrl?: string; name: string; email: string;
  date: string; statusNode: React.ReactNode; onClose: () => void;
}) {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Avatar src={photoUrl} sx={{ width: 56, height: 56, bgcolor: LAVENDER_BG, color: LAVENDER, fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
        {!photoUrl && initials}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6" fontWeight={700}>{name}</Typography>
            <Typography variant="body2" color="text.secondary">{email}</Typography>
            <Typography variant="caption" color="text.disabled">{date}</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            {statusNode}
            <IconButton size="small" onClick={onClose} sx={{ color: 'text.disabled' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );
}

// ── dialog actions ────────────────────────────────────────────────────────────

interface ReviewActionsProps {
  status: TutorStatus | 'PENDING_SUBJECT' | null;
  processing: boolean;
  onClose: () => void;
  onReject?: () => void;
  onApprove?: () => void;
  onSuspend?: () => void;
  suspendReason?: string;
  onSuspendReasonChange?: (v: string) => void;
}

function ReviewActions({ status, processing, onClose, onReject, onApprove, onSuspend, suspendReason, onSuspendReasonChange }: ReviewActionsProps) {
  return (
    <>
      {status === 'APPROVED' && onSuspend && (
        <Box sx={{ px: 3, pb: 2 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
            Отстранение репетитора
          </Typography>
          <TextField
            fullWidth size="small"
            label="Причина отстранения (необязательно)"
            value={suspendReason ?? ''}
            onChange={(e) => onSuspendReasonChange?.(e.target.value)}
            placeholder="Нарушение правил, жалобы студентов..."
            sx={{ mb: 1.5 }}
          />
          <Button
            fullWidth variant="outlined" color="warning" onClick={onSuspend} disabled={processing}
            startIcon={processing ? <CircularProgress size={14} color="inherit" /> : <PauseCircleIcon />}
            sx={{ borderColor: '#d97706', color: '#d97706', '&:hover': { bgcolor: '#FFFBEB' } }}
          >
            Отстранить (перевести на проверку)
          </Button>
        </Box>
      )}
      <DialogActions sx={{ px: 3, pb: 3, pt: status === 'APPROVED' ? 0 : 1, gap: 1 }}>
        <Button variant="outlined" onClick={onClose} disabled={processing} sx={{ flex: status === 'PENDING' ? 1 : 2 }}>
          Закрыть
        </Button>
        {status === 'PENDING' && (
          <>
            <Button
              variant="outlined" color="error" onClick={onReject} disabled={processing}
              startIcon={processing ? <CircularProgress size={14} color="inherit" /> : <CancelIcon />}
              sx={{ flex: 1 }}
            >
              Отклонить
            </Button>
            <Button
              variant="contained" color="success" onClick={onApprove} disabled={processing}
              startIcon={processing ? <CircularProgress size={14} color="inherit" /> : <CheckCircleIcon />}
              sx={{ flex: 1 }}
            >
              Одобрить
            </Button>
          </>
        )}
        {status === 'PENDING_SUBJECT' && (
          <>
            <Button
              variant="outlined" color="error" onClick={onReject} disabled={processing}
              startIcon={processing ? <CircularProgress size={14} color="inherit" /> : <CancelIcon />}
              sx={{ flex: 1 }}
            >
              Отклонить
            </Button>
            <Button
              variant="contained" color="success" onClick={onApprove} disabled={processing}
              startIcon={processing ? <CircularProgress size={14} color="inherit" /> : <CheckCircleIcon />}
              sx={{ flex: 1 }}
            >
              Одобрить
            </Button>
          </>
        )}
      </DialogActions>
    </>
  );
}

// ── field ─────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{ mt: 0.5 }}>{children}</Box>
    </Box>
  );
}

// ── empty state ───────────────────────────────────────────────────────────────

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Box sx={{ textAlign: 'center', py: 12, color: 'text.secondary' }}>
      <Box sx={{ fontSize: 48, opacity: 0.3, mb: 2, display: 'flex', justifyContent: 'center' }}>{icon}</Box>
      <Typography variant="h6" fontWeight={600}>{text}</Typography>
    </Box>
  );
}

function TabLabel({ icon, text, count }: { icon: React.ReactNode; text: string; count: number }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.75}>
      {icon}
      <span>{text}</span>
      {count > 0 && <Chip label={count} size="small" color="warning" sx={{ height: 18, fontSize: 11 }} />}
    </Stack>
  );
}

// ══════════════════════════════════════════════════════════════════════════════

export default function AdminPanel() {
  const [mainTab, setMainTab] = useState(0);

  // ── tutors ──────────────────────────────────────────────────────────────────
  const [tutors, setTutors] = useState<TutorWithStatus[]>([]);
  const [tutorsLoading, setTutorsLoading] = useState(true);
  const [tutorFilter, setTutorFilter] = useState<TutorStatus | 'ALL'>('PENDING');
  const [tutorSearch, setTutorSearch] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [tutorDetail, setTutorDetail] = useState<TutorWithStatus | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  // ── subject requests ────────────────────────────────────────────────────────
  const [subjectRequests, setSubjectRequests] = useState<SubjectRequest[]>([]);
  const [subjectLoading, setSubjectLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<SubjectRequestStatus | 'ALL'>('PENDING');
  const [subjectDialog, setSubjectDialog] = useState<SubjectRequest | null>(null);
  const [subjectNote, setSubjectNote] = useState('');
  const [subjectProcessing, setSubjectProcessing] = useState(false);

  // ── profile changes ─────────────────────────────────────────────────────────
  const [profileChanges, setProfileChanges] = useState<ProfileChangeRequest[]>([]);
  const [profileChangesLoading, setProfileChangesLoading] = useState(true);
  const [profileDialog, setProfileDialog] = useState<ProfileChangeRequest | null>(null);
  const [profileNote, setProfileNote] = useState('');
  const [profileProcessing, setProfileProcessing] = useState(false);

  // ── audit log ───────────────────────────────────────────────────────────────
  type LogEntry = { id: string; action: string; targetName: string; details?: string | null; createdAt: string; admin: { name: string } };
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsFetched, setLogsFetched] = useState(false);

  const fetchLogs = async (offset = 0) => {
    setLogsLoading(true);
    try {
      const { data } = await api.get(`/admin/logs?limit=50&offset=${offset}`);
      setLogs((prev) => offset === 0 ? data.logs : [...prev, ...data.logs]);
      setLogsTotal(data.total);
      setLogsFetched(true);
    } finally { setLogsLoading(false); }
  };

  useEffect(() => { if (mainTab === 3 && !logsFetched) fetchLogs(); }, [mainTab]);

  useEffect(() => {
    (async () => {
      setTutorsLoading(true);
      const { data } = await api.get('/admin/tutors/all');
      setTutors(data);
      setTutorsLoading(false);
    })();
    (async () => {
      setSubjectLoading(true);
      const { data } = await api.get('/subject-requests');
      setSubjectRequests(data);
      setSubjectLoading(false);
    })();
    (async () => {
      const { data } = await api.get('/admin/profile-changes');
      setProfileChanges(data);
      setProfileChangesLoading(false);
    })();
  }, []);

  const approveTutor = async (id: string) => {
    setProcessing(id);
    try {
      await api.put(`/admin/tutors/${id}/approve`);
      setTutors((p) => p.map((t) => t.id === id ? { ...t, status: 'APPROVED' } : t));
    } finally { setProcessing(null); }
  };

  const rejectTutor = async (id: string) => {
    setProcessing(id);
    try {
      await api.put(`/admin/tutors/${id}/reject`);
      setTutors((p) => p.map((t) => t.id === id ? { ...t, status: 'REJECTED' } : t));
    } finally { setProcessing(null); }
  };

  const suspendTutor = async (id: string, reason: string) => {
    setProcessing(id);
    try {
      await api.put(`/admin/tutors/${id}/suspend`, { reason });
      setTutors((p) => p.map((t) => t.id === id ? { ...t, status: 'PENDING' } : t));
    } finally { setProcessing(null); }
  };

  const handleSubjectReview = async (action: 'approve' | 'reject') => {
    if (!subjectDialog) return;
    setSubjectProcessing(true);
    try {
      const { data } = await api.put(`/subject-requests/${subjectDialog.id}/${action}`, { adminNote: subjectNote });
      setSubjectRequests((p) => p.map((r) => r.id === data.id ? { ...r, status: data.status, adminNote: data.adminNote } : r));
      setSubjectDialog(null);
    } finally { setSubjectProcessing(false); }
  };

  const handleProfileReview = async (action: 'approve' | 'reject') => {
    if (!profileDialog) return;
    setProfileProcessing(true);
    try {
      await api.put(`/admin/profile-changes/${profileDialog.id}/${action}`, { adminNote: profileNote });
      setProfileChanges((p) => p.filter((r) => r.id !== profileDialog.id));
      setProfileDialog(null);
    } finally { setProfileProcessing(false); }
  };

  // Filtered + searched tutors
  const filteredTutors = useMemo(() => {
    const byStatus = tutorFilter === 'ALL' ? tutors : tutors.filter((t) => t.status === tutorFilter);
    if (!tutorSearch.trim()) return byStatus;
    const q = tutorSearch.toLowerCase();
    return byStatus.filter((t) =>
      t.user.name.toLowerCase().includes(q) || t.user.email.toLowerCase().includes(q)
    );
  }, [tutors, tutorFilter, tutorSearch]);

  const filteredSubject = subjectFilter === 'ALL' ? subjectRequests : subjectRequests.filter((r) => r.status === subjectFilter);

  const tutorCounts = {
    ALL: tutors.length,
    PENDING: tutors.filter((t) => t.status === 'PENDING').length,
    APPROVED: tutors.filter((t) => t.status === 'APPROVED').length,
    REJECTED: tutors.filter((t) => t.status === 'REJECTED').length,
  };
  const subjectCounts = {
    ALL: subjectRequests.length,
    PENDING: subjectRequests.filter((r) => r.status === 'PENDING').length,
    APPROVED: subjectRequests.filter((r) => r.status === 'APPROVED').length,
    REJECTED: subjectRequests.filter((r) => r.status === 'REJECTED').length,
  };

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 860, mx: 'auto' }}>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700}>Панель администратора</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>Управление репетиторами и заявками</Typography>
      </Box>

      <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} sx={{ mb: 3, borderBottom: '1px solid #F0EBF8' }}>
        <Tab label={<TabLabel icon={<PeopleIcon sx={{ fontSize: 18 }} />} text="Репетиторы" count={tutorCounts.PENDING} />} />
        <Tab label={<TabLabel icon={<MenuBookIcon sx={{ fontSize: 18 }} />} text="Предметы" count={subjectCounts.PENDING} />} />
        <Tab label={<TabLabel icon={<EditNoteIcon sx={{ fontSize: 18 }} />} text="Профили" count={profileChanges.filter(r => r.status === 'PENDING').length} />} />
        <Tab label={<TabLabel icon={<HistoryIcon sx={{ fontSize: 18 }} />} text="Журнал" count={0} />} />
      </Tabs>

      {/* ── TUTORS ── */}
      {mainTab === 0 && (
        <>
          <StatRow counts={tutorCounts} active={tutorFilter} onSelect={(k) => { setTutorFilter(k as TutorStatus | 'ALL'); setTutorSearch(''); }} />

          {/* Search bar */}
          <TextField
            fullWidth
            size="small"
            placeholder="Поиск по имени или email..."
            value={tutorSearch}
            onChange={(e) => setTutorSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> }}
            sx={{ mb: 2.5 }}
          />

          {tutorsLoading ? <PageLoader /> : filteredTutors.length === 0 ? (
            <EmptyState icon={<PeopleIcon sx={{ fontSize: 48 }} />} text={tutorSearch ? 'Ничего не найдено' : 'Нет репетиторов в этой категории'} />
          ) : (
            <Grid container spacing={2}>
              {filteredTutors.map((t) => (
                <Grid item xs={12} sm={6} key={t.id}>
                  <ReviewCard
                    initials={t.user.avatar || t.user.name.slice(0, 2).toUpperCase()}
                    photoUrl={t.photoUrl || undefined}
                    name={t.user.name}
                    email={t.user.email}
                    date={`Зарегистрирован ${fmtDate(t.user.createdAt)}`}
                    statusNode={<StatusChip status={t.status} />}
                    tags={
                      <Stack direction="row" flexWrap="wrap" gap={0.5}>
                        {t.subjects.slice(0, 3).map((s) => (
                          <Chip key={s} label={s} size="small" sx={{ bgcolor: LAVENDER_BG, color: LAVENDER, fontSize: 11 }} />
                        ))}
                        {t.subjects.length > 3 && <Chip label={`+${t.subjects.length - 3}`} size="small" sx={{ fontSize: 11 }} />}
                      </Stack>
                    }
                    onReview={() => { setTutorDetail(t); setSuspendReason(''); }}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* ── SUBJECT REQUESTS ── */}
      {mainTab === 1 && (
        <>
          <StatRow counts={subjectCounts} active={subjectFilter} onSelect={(k) => setSubjectFilter(k as SubjectRequestStatus | 'ALL')} />
          {subjectLoading ? <PageLoader /> : filteredSubject.length === 0 ? (
            <EmptyState icon={<MenuBookIcon sx={{ fontSize: 48 }} />} text="Нет заявок в этой категории" />
          ) : (
            <Grid container spacing={2}>
              {filteredSubject.map((r) => (
                <Grid item xs={12} sm={6} key={r.id}>
                  <ReviewCard
                    initials={r.tutorProfile?.user.avatar || r.tutorProfile?.user.name?.slice(0, 2).toUpperCase() || '?'}
                    name={r.tutorProfile?.user.name || '—'}
                    email={r.tutorProfile?.user.email || ''}
                    date={fmtDate(r.createdAt)}
                    statusNode={
                      <Stack direction="row" spacing={0.75}>
                        <Chip label={r.subject} size="small" sx={{ bgcolor: LAVENDER_BG, color: LAVENDER, fontWeight: 600 }} />
                        <SubjectStatusChip status={r.status} />
                      </Stack>
                    }
                    onReview={() => { setSubjectDialog(r); setSubjectNote(''); }}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* ── PROFILE CHANGES ── */}
      {mainTab === 2 && (
        <>
          {profileChangesLoading ? <PageLoader /> : profileChanges.length === 0 ? (
            <EmptyState icon={<EditNoteIcon sx={{ fontSize: 48 }} />} text="Нет заявок на изменение профиля" />
          ) : (
            <Grid container spacing={2}>
              {profileChanges.map((r) => {
                const changed = [
                  r.bio !== undefined && 'О себе',
                  r.education !== undefined && 'Образование',
                  r.experience !== undefined && 'Опыт',
                ].filter(Boolean) as string[];
                return (
                  <Grid item xs={12} sm={6} key={r.id}>
                    <ReviewCard
                      initials={r.tutorProfile.user.name.slice(0, 2).toUpperCase()}
                      name={r.tutorProfile.user.name}
                      email={r.tutorProfile.user.email}
                      date={fmtDate(r.createdAt)}
                      statusNode={<Chip label="На проверке" size="small" color="warning" variant="outlined" />}
                      tags={
                        <Stack direction="row" flexWrap="wrap" gap={0.5}>
                          {changed.map((f) => (
                            <Chip key={f} label={f} size="small" variant="outlined" sx={{ fontSize: 11, color: 'text.secondary', borderColor: '#D5C9EE' }} />
                          ))}
                        </Stack>
                      }
                      onReview={() => { setProfileDialog(r); setProfileNote(''); }}
                    />
                  </Grid>
                );
              })}
            </Grid>
          )}
        </>
      )}

      {/* ══ DIALOG: Tutor ══ */}
      <Dialog open={Boolean(tutorDetail)} onClose={() => setTutorDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 0 }}>
          <DialogHeader
            initials={tutorDetail?.user.avatar || tutorDetail?.user.name.slice(0, 2).toUpperCase() || ''}
            photoUrl={tutorDetail?.photoUrl || undefined}
            name={tutorDetail?.user.name || ''}
            email={tutorDetail?.user.email || ''}
            date={tutorDetail ? `Зарегистрирован ${fmtDate(tutorDetail.user.createdAt)}` : ''}
            statusNode={tutorDetail ? <StatusChip status={tutorDetail.status} /> : null}
            onClose={() => setTutorDetail(null)}
          />
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2.5 }}>
          {tutorDetail && (
            <Stack spacing={2.5}>
              <Field label="Предметы">
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                  {tutorDetail.subjects.map((s) => (
                    <Chip key={s} label={s} size="small" sx={{ bgcolor: LAVENDER_BG, color: LAVENDER }} />
                  ))}
                </Stack>
              </Field>

              {tutorDetail.education && (
                <Field label="Образование">
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <SchoolIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                    <Typography variant="body2">{tutorDetail.education}</Typography>
                  </Stack>
                </Field>
              )}

              <Stack direction="row" spacing={4}>
                {tutorDetail.experience != null && (
                  <Field label="Опыт"><Typography variant="body2">{tutorDetail.experience} лет</Typography></Field>
                )}
                {tutorDetail.hourlyRate && (
                  <Field label="Ставка"><Typography variant="body2">{tutorDetail.hourlyRate.toLocaleString('ru')} ₽/час</Typography></Field>
                )}
                <Field label="Рейтинг">
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <StarIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                    <Typography variant="body2">{tutorDetail.rating.toFixed(1)}</Typography>
                  </Stack>
                </Field>
              </Stack>

              {tutorDetail.bio && (
                <Field label="О себе">
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', p: 1.5, bgcolor: '#F7F5FC', borderRadius: 1.5 }}>
                    {tutorDetail.bio}
                  </Typography>
                </Field>
              )}

              {tutorDetail.certificateUrls?.length > 0 && (
                <Field label="Документы">
                  <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 0.25 }}>
                    {tutorDetail.certificateUrls.map((url, i) => (
                      <Button key={url} size="small" startIcon={<ImageIcon />} endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                        href={`${API_BASE}${url}`} target="_blank" rel="noopener" variant="outlined"
                        sx={{ color: LAVENDER, borderColor: '#D5C9EE', '&:hover': { bgcolor: LAVENDER_BG } }}>
                        Документ {i + 1}
                      </Button>
                    ))}
                  </Stack>
                </Field>
              )}
            </Stack>
          )}
        </DialogContent>
        <ReviewActions
          status={tutorDetail?.status ?? null}
          processing={processing === tutorDetail?.id}
          onClose={() => setTutorDetail(null)}
          onReject={async () => { if (tutorDetail) { await rejectTutor(tutorDetail.id); setTutorDetail(null); } }}
          onApprove={async () => { if (tutorDetail) { await approveTutor(tutorDetail.id); setTutorDetail(null); } }}
          onSuspend={async () => { if (tutorDetail) { await suspendTutor(tutorDetail.id, suspendReason); setTutorDetail((prev) => prev ? { ...prev, status: 'PENDING' } : null); } }}
          suspendReason={suspendReason}
          onSuspendReasonChange={setSuspendReason}
        />
      </Dialog>

      {/* ══ DIALOG: Subject request ══ */}
      <Dialog open={Boolean(subjectDialog)} onClose={() => setSubjectDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 0 }}>
          <DialogHeader
            initials={subjectDialog?.tutorProfile?.user.avatar || subjectDialog?.tutorProfile?.user.name?.slice(0, 2).toUpperCase() || '?'}
            name={subjectDialog?.tutorProfile?.user.name || '—'}
            email={subjectDialog?.tutorProfile?.user.email || ''}
            date={subjectDialog ? fmtDate(subjectDialog.createdAt) : ''}
            statusNode={subjectDialog ? <SubjectStatusChip status={subjectDialog.status} /> : null}
            onClose={() => setSubjectDialog(null)}
          />
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2.5 }}>
          {subjectDialog && (
            <Stack spacing={2.5}>
              <Field label="Предмет">
                <Chip label={subjectDialog.subject} size="small" sx={{ bgcolor: LAVENDER_BG, color: LAVENDER, fontWeight: 600 }} />
              </Field>
              <Field label="Обоснование">
                <Typography variant="body2" sx={{ p: 1.5, bgcolor: '#F7F5FC', borderRadius: 1.5, borderLeft: '3px solid #D5C9EE' }}>
                  {subjectDialog.justification}
                </Typography>
              </Field>
              {subjectDialog.certificateUrl && (
                <Field label="Сертификат">
                  <Button size="small" startIcon={<ImageIcon />} endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                    href={`${API_BASE}${subjectDialog.certificateUrl}`} target="_blank" rel="noopener" variant="outlined"
                    sx={{ color: LAVENDER, borderColor: '#D5C9EE', '&:hover': { bgcolor: LAVENDER_BG } }}>
                    Открыть документ
                  </Button>
                </Field>
              )}
              {subjectDialog.adminNote && (
                <Field label="Примечание администратора">
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>{subjectDialog.adminNote}</Typography>
                </Field>
              )}
              {subjectDialog.status === 'PENDING' && (
                <>
                  <Divider />
                  <TextField
                    label="Примечание для репетитора (необязательно)" multiline rows={2} fullWidth size="small"
                    value={subjectNote} onChange={(e) => setSubjectNote(e.target.value)}
                    placeholder="Причина отклонения или комментарий..."
                  />
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <ReviewActions
          status={subjectDialog?.status === 'PENDING' ? 'PENDING_SUBJECT' : null}
          processing={subjectProcessing}
          onClose={() => setSubjectDialog(null)}
          onReject={() => handleSubjectReview('reject')}
          onApprove={() => handleSubjectReview('approve')}
        />
      </Dialog>

      {/* ══ DIALOG: Profile change ══ */}
      <Dialog open={Boolean(profileDialog)} onClose={() => setProfileDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 0 }}>
          <DialogHeader
            initials={profileDialog?.tutorProfile.user.name.slice(0, 2).toUpperCase() || ''}
            name={profileDialog?.tutorProfile.user.name || ''}
            email={profileDialog?.tutorProfile.user.email || ''}
            date={profileDialog ? fmtDate(profileDialog.createdAt) : ''}
            statusNode={<Chip label="На проверке" size="small" color="warning" variant="outlined" />}
            onClose={() => setProfileDialog(null)}
          />
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2.5 }}>
          {profileDialog && (
            <Stack spacing={2.5}>
              {profileDialog.bio !== undefined && (
                <Field label="О себе — новое значение">
                  <Typography variant="body2" sx={{ p: 1.5, bgcolor: '#F7F5FC', borderRadius: 1.5 }}>{profileDialog.bio}</Typography>
                  {profileDialog.tutorProfile.bio && (
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.75 }}>
                      Текущее: {profileDialog.tutorProfile.bio}
                    </Typography>
                  )}
                </Field>
              )}
              {profileDialog.education !== undefined && (
                <Field label="Образование — новое значение">
                  <Typography variant="body2" sx={{ p: 1.5, bgcolor: '#F7F5FC', borderRadius: 1.5 }}>{profileDialog.education}</Typography>
                  {profileDialog.tutorProfile.education && (
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.75 }}>
                      Текущее: {profileDialog.tutorProfile.education}
                    </Typography>
                  )}
                </Field>
              )}
              {profileDialog.experience !== undefined && (
                <Field label="Опыт — новое значение">
                  <Typography variant="body2">{profileDialog.experience} лет</Typography>
                  {profileDialog.tutorProfile.experience != null && (
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                      Текущее: {profileDialog.tutorProfile.experience} лет
                    </Typography>
                  )}
                </Field>
              )}
              <Divider />
              <TextField
                label="Примечание для репетитора (необязательно)" multiline rows={2} fullWidth size="small"
                value={profileNote} onChange={(e) => setProfileNote(e.target.value)}
                placeholder="Причина отклонения или комментарий..."
              />
            </Stack>
          )}
        </DialogContent>
        <ReviewActions
          status="PENDING"
          processing={profileProcessing}
          onClose={() => setProfileDialog(null)}
          onReject={() => handleProfileReview('reject')}
          onApprove={() => handleProfileReview('approve')}
        />
      </Dialog>

      {/* ── AUDIT LOG ── */}
      {mainTab === 3 && (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="body2" color="text.secondary">
              {logsTotal} записей · только чтение
            </Typography>
            <Button size="small" startIcon={<HistoryIcon />} onClick={() => fetchLogs(0)} disabled={logsLoading}>
              Обновить
            </Button>
          </Stack>

          {logsLoading && logs.length === 0 ? <PageLoader /> : logs.length === 0 ? (
            <EmptyState icon={<HistoryIcon sx={{ fontSize: 48 }} />} text="Журнал пуст — действия появятся после первых решений" />
          ) : (
            <Stack spacing={1}>
              {logs.map((entry) => {
                const cfg: Record<string, { label: string; color: string; bg: string }> = {
                  TUTOR_APPROVED:   { label: 'Репетитор одобрен',    color: '#16a34a', bg: '#F0FDF4' },
                  TUTOR_REJECTED:   { label: 'Репетитор отклонён',   color: '#dc2626', bg: '#FEF2F2' },
                  TUTOR_SUSPENDED:  { label: 'Репетитор отстранён',  color: '#d97706', bg: '#FFFBEB' },
                  SUBJECT_APPROVED: { label: 'Предмет одобрен',      color: '#16a34a', bg: '#F0FDF4' },
                  SUBJECT_REJECTED: { label: 'Предмет отклонён',     color: '#dc2626', bg: '#FEF2F2' },
                  PROFILE_APPROVED: { label: 'Профиль одобрен',      color: '#7C5CBF', bg: '#F0EBF8' },
                  PROFILE_REJECTED: { label: 'Профиль отклонён',     color: '#dc2626', bg: '#FEF2F2' },
                };
                const c = cfg[entry.action] ?? { label: entry.action, color: '#6B7280', bg: '#F9FAFB' };
                return (
                  <Card key={entry.id} elevation={0} sx={{ border: '1px solid #F0EBF8' }}>
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                      <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" gap={0.5}>
                        <Chip label={c.label} size="small"
                          sx={{ bgcolor: c.bg, color: c.color, fontWeight: 700, fontSize: 11, border: `1px solid ${c.color}22` }} />
                        <Typography variant="body2" fontWeight={600} color="text.primary">{entry.targetName}</Typography>
                        {entry.details && (
                          <Typography variant="caption" color="text.secondary">— {entry.details}</Typography>
                        )}
                        <Box sx={{ flexGrow: 1 }} />
                        <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap' }}>
                          {new Date(entry.createdAt).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
              {logs.length < logsTotal && (
                <Button variant="outlined" onClick={() => fetchLogs(logs.length)} disabled={logsLoading} sx={{ mt: 1 }}>
                  {logsLoading ? 'Загрузка...' : `Загрузить ещё (${logsTotal - logs.length})`}
                </Button>
              )}
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
}
