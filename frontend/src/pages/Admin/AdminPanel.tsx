import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Stack, Avatar,
  Chip, Grid, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, CircularProgress, Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import StarIcon from '@mui/icons-material/Star';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ImageIcon from '@mui/icons-material/Image';
import EditNoteIcon from '@mui/icons-material/EditNote';
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

const API_BASE = 'http://localhost:3001';

export default function AdminPanel() {
  const [mainTab, setMainTab] = useState(0);

  // Tutors state
  const [tutors, setTutors] = useState<TutorWithStatus[]>([]);
  const [tutorsLoading, setTutorsLoading] = useState(true);
  const [tutorFilter, setTutorFilter] = useState<TutorStatus | 'ALL'>('PENDING');
  const [processing, setProcessing] = useState<string | null>(null);

  // Subject requests state
  const [subjectRequests, setSubjectRequests] = useState<SubjectRequest[]>([]);
  const [subjectLoading, setSubjectLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<SubjectRequestStatus | 'ALL'>('PENDING');
  const [reviewDialog, setReviewDialog] = useState<SubjectRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [reviewProcessing, setReviewProcessing] = useState(false);

  // Profile change requests state
  const [profileChanges, setProfileChanges] = useState<ProfileChangeRequest[]>([]);
  const [profileChangesLoading, setProfileChangesLoading] = useState(true);
  const [profileChangeDialog, setProfileChangeDialog] = useState<ProfileChangeRequest | null>(null);
  const [profileChangeNote, setProfileChangeNote] = useState('');
  const [profileChangeProcessing, setProfileChangeProcessing] = useState(false);

  const fetchTutors = async () => {
    setTutorsLoading(true);
    try {
      const { data } = await api.get('/admin/tutors/all');
      setTutors(data);
    } finally {
      setTutorsLoading(false);
    }
  };

  const fetchSubjectRequests = async () => {
    setSubjectLoading(true);
    try {
      const { data } = await api.get('/subject-requests');
      setSubjectRequests(data);
    } finally {
      setSubjectLoading(false);
    }
  };

  const fetchProfileChanges = async () => {
    setProfileChangesLoading(true);
    try {
      const { data } = await api.get('/admin/profile-changes');
      setProfileChanges(data);
    } finally {
      setProfileChangesLoading(false);
    }
  };

  useEffect(() => { fetchTutors(); fetchSubjectRequests(); fetchProfileChanges(); }, []);

  const approveTutor = async (id: string) => {
    setProcessing(id);
    try {
      await api.put(`/admin/tutors/${id}/approve`);
      setTutors((prev) => prev.map((t) => t.id === id ? { ...t, status: 'APPROVED' } : t));
    } finally { setProcessing(null); }
  };

  const rejectTutor = async (id: string) => {
    setProcessing(id);
    try {
      await api.put(`/admin/tutors/${id}/reject`);
      setTutors((prev) => prev.map((t) => t.id === id ? { ...t, status: 'REJECTED' } : t));
    } finally { setProcessing(null); }
  };

  const handleSubjectReview = async (action: 'approve' | 'reject') => {
    if (!reviewDialog) return;
    setReviewProcessing(true);
    try {
      const { data } = await api.put(`/subject-requests/${reviewDialog.id}/${action}`, { adminNote });
      setSubjectRequests((prev) => prev.map((r) => r.id === data.id ? { ...r, status: data.status, adminNote: data.adminNote } : r));
      setReviewDialog(null);
    } finally {
      setReviewProcessing(false);
    }
  };

  const handleProfileChangeReview = async (action: 'approve' | 'reject') => {
    if (!profileChangeDialog) return;
    setProfileChangeProcessing(true);
    try {
      await api.put(`/admin/profile-changes/${profileChangeDialog.id}/${action}`, { adminNote: profileChangeNote });
      setProfileChanges((prev) => prev.filter((r) => r.id !== profileChangeDialog.id));
      setProfileChangeDialog(null);
    } finally {
      setProfileChangeProcessing(false);
    }
  };

  const filteredTutors = tutorFilter === 'ALL' ? tutors : tutors.filter((t) => t.status === tutorFilter);
  const filteredSubjectRequests = subjectFilter === 'ALL' ? subjectRequests : subjectRequests.filter((r) => r.status === subjectFilter);

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

  return (
    <Box sx={{ maxWidth: 880, mx: 'auto' }}>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700}>Панель администратора</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>Управление заявками</Typography>
      </Box>

      <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} sx={{ mb: 3, borderBottom: '1px solid #F0EBF8' }}>
        <Tab
          label={
            <Stack direction="row" alignItems="center" spacing={1}>
              <PeopleIcon sx={{ fontSize: 18 }} />
              <span>Репетиторы</span>
              {tutorCounts.PENDING > 0 && <Chip label={tutorCounts.PENDING} size="small" color="warning" sx={{ height: 18, fontSize: 11 }} />}
            </Stack>
          }
        />
        <Tab
          label={
            <Stack direction="row" alignItems="center" spacing={1}>
              <MenuBookIcon sx={{ fontSize: 18 }} />
              <span>Заявки на предметы</span>
              {subjectCounts.PENDING > 0 && <Chip label={subjectCounts.PENDING} size="small" color="warning" sx={{ height: 18, fontSize: 11 }} />}
            </Stack>
          }
        />
        <Tab
          label={
            <Stack direction="row" alignItems="center" spacing={1}>
              <EditNoteIcon sx={{ fontSize: 18 }} />
              <span>Изменения профиля</span>
              {profileChanges.length > 0 && <Chip label={profileChanges.length} size="small" color="warning" sx={{ height: 18, fontSize: 11 }} />}
            </Stack>
          }
        />
      </Tabs>

      {/* --- TUTORS TAB --- */}
      {mainTab === 0 && (
        <>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {([
              { key: 'ALL' as const, label: 'Всего', icon: <PeopleIcon />, bgcolor: LAVENDER_BG, iconColor: LAVENDER },
              { key: 'PENDING' as const, label: 'На проверке', icon: <HourglassEmptyIcon />, bgcolor: '#FEFCE8', iconColor: '#d97706' },
              { key: 'APPROVED' as const, label: 'Одобрено', icon: <CheckCircleIcon />, bgcolor: '#F0FDF4', iconColor: '#16a34a' },
              { key: 'REJECTED' as const, label: 'Отклонено', icon: <CancelIcon />, bgcolor: '#FEF2F2', iconColor: '#dc2626' },
            ] as const).map((s) => (
              <Grid item xs={6} sm={3} key={s.key}>
                <Card
                  elevation={tutorFilter === s.key ? 3 : 1}
                  onClick={() => setTutorFilter(s.key)}
                  sx={{ cursor: 'pointer', outline: tutorFilter === s.key ? `2px solid ${LAVENDER}` : 'none', transition: 'all 0.2s' }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ width: 40, height: 40, bgcolor: s.bgcolor, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, color: s.iconColor }}>
                      {s.icon}
                    </Box>
                    <Typography variant="h4" fontWeight={700}>{tutorCounts[s.key]}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {tutorsLoading ? <PageLoader /> : filteredTutors.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 12, color: 'text.secondary' }}>
              <PeopleIcon sx={{ fontSize: 48, opacity: 0.35, mb: 2 }} />
              <Typography variant="h6" fontWeight={600}>Нет репетиторов в этой категории</Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {filteredTutors.map((tutor) => (
                <Card key={tutor.id} elevation={1}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <Avatar
                        src={tutor.photoUrl}
                        sx={{ width: 56, height: 56, bgcolor: LAVENDER_BG, color: LAVENDER, fontWeight: 700, fontSize: 18, flexShrink: 0 }}
                      >
                        {tutor.user.avatar || tutor.user.name.slice(0, 2).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={700}>{tutor.user.name}</Typography>
                            <Typography variant="body2" color="text.secondary">{tutor.user.email}</Typography>
                            <Typography variant="caption" color="text.disabled">
                              Зарегистрирован: {new Date(tutor.user.createdAt).toLocaleDateString('ru')}
                            </Typography>
                          </Box>
                          <StatusChip status={tutor.status} />
                        </Stack>
                        {tutor.education && (
                          <Stack direction="row" alignItems="center" spacing={0.75} mt={1.5}>
                            <SchoolIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                            <Typography variant="body2" color="text.secondary">{tutor.education}</Typography>
                          </Stack>
                        )}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
                          {tutor.subjects.map((s) => (
                            <Chip key={s} label={s} size="small" sx={{ bgcolor: LAVENDER_BG, color: LAVENDER, fontSize: 11 }} />
                          ))}
                        </Box>
                        <Stack direction="row" spacing={2.5} mt={1.5}>
                          {tutor.experience != null && (
                            <Typography variant="caption" color="text.secondary">{tutor.experience} лет опыта</Typography>
                          )}
                          {tutor.hourlyRate && (
                            <Typography variant="caption" color="text.secondary">{tutor.hourlyRate.toLocaleString('ru')} ₽/час</Typography>
                          )}
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <StarIcon sx={{ fontSize: 13, color: '#f59e0b' }} />
                            <Typography variant="caption" color="text.secondary">{tutor.rating.toFixed(1)}</Typography>
                          </Stack>
                        </Stack>
                        {tutor.bio && (
                          <Typography variant="body2" color="text.secondary" mt={1.5} sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {tutor.bio}
                          </Typography>
                        )}
                        {tutor.certificateUrls?.length > 0 && (
                          <Box mt={1.5}>
                            <Typography variant="caption" color="text.disabled" fontWeight={600} sx={{ display: 'block', mb: 0.75 }}>
                              Документы при регистрации
                            </Typography>
                            <Stack direction="row" flexWrap="wrap" gap={1}>
                              {tutor.certificateUrls.map((url, i) => (
                                <Button
                                  key={url}
                                  size="small"
                                  startIcon={<ImageIcon />}
                                  href={`${API_BASE}${url}`}
                                  target="_blank"
                                  rel="noopener"
                                  variant="outlined"
                                  sx={{ fontSize: 12, color: LAVENDER, borderColor: '#D5C9EE', '&:hover': { bgcolor: LAVENDER_BG } }}
                                >
                                  Документ {i + 1}
                                </Button>
                              ))}
                            </Stack>
                          </Box>
                        )}
                        {tutor.status === 'PENDING' && (
                          <Stack direction="row" spacing={1.5} mt={2} pt={2} sx={{ borderTop: '1px solid #F7F5FC' }}>
                            <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => approveTutor(tutor.id)} disabled={processing === tutor.id} sx={{ flex: 1 }}>
                              Одобрить
                            </Button>
                            <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => rejectTutor(tutor.id)} disabled={processing === tutor.id} sx={{ flex: 1 }}>
                              Отклонить
                            </Button>
                          </Stack>
                        )}
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </>
      )}

      {/* --- SUBJECT REQUESTS TAB --- */}
      {mainTab === 1 && (
        <>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {([
              { key: 'ALL' as const, label: 'Всего', icon: <MenuBookIcon />, bgcolor: LAVENDER_BG, iconColor: LAVENDER },
              { key: 'PENDING' as const, label: 'На проверке', icon: <HourglassEmptyIcon />, bgcolor: '#FEFCE8', iconColor: '#d97706' },
              { key: 'APPROVED' as const, label: 'Одобрено', icon: <CheckCircleIcon />, bgcolor: '#F0FDF4', iconColor: '#16a34a' },
              { key: 'REJECTED' as const, label: 'Отклонено', icon: <CancelIcon />, bgcolor: '#FEF2F2', iconColor: '#dc2626' },
            ] as const).map((s) => (
              <Grid item xs={6} sm={3} key={s.key}>
                <Card
                  elevation={subjectFilter === s.key ? 3 : 1}
                  onClick={() => setSubjectFilter(s.key)}
                  sx={{ cursor: 'pointer', outline: subjectFilter === s.key ? `2px solid ${LAVENDER}` : 'none', transition: 'all 0.2s' }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ width: 40, height: 40, bgcolor: s.bgcolor, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, color: s.iconColor }}>
                      {s.icon}
                    </Box>
                    <Typography variant="h4" fontWeight={700}>{subjectCounts[s.key]}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {subjectLoading ? <PageLoader /> : filteredSubjectRequests.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 12, color: 'text.secondary' }}>
              <MenuBookIcon sx={{ fontSize: 48, opacity: 0.35, mb: 2 }} />
              <Typography variant="h6" fontWeight={600}>Нет заявок в этой категории</Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {filteredSubjectRequests.map((req) => (
                <Card key={req.id} elevation={1}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <Avatar sx={{ width: 44, height: 44, bgcolor: LAVENDER_BG, color: LAVENDER, fontWeight: 700, flexShrink: 0 }}>
                        {req.tutorProfile?.user.avatar || req.tutorProfile?.user.name?.slice(0, 2).toUpperCase() || '?'}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={700}>{req.tutorProfile?.user.name}</Typography>
                            <Typography variant="body2" color="text.secondary">{req.tutorProfile?.user.email}</Typography>
                          </Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label={req.subject} size="small" sx={{ bgcolor: LAVENDER_BG, color: LAVENDER, fontWeight: 600 }} />
                            <SubjectStatusChip status={req.status} />
                          </Stack>
                        </Stack>

                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                          {new Date(req.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </Typography>

                        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#F7F5FC', borderRadius: 1.5, borderLeft: '3px solid #D5C9EE' }}>
                          <Typography variant="body2" color="text.secondary">{req.justification}</Typography>
                        </Box>

                        {req.certificateUrl && (
                          <Button
                            size="small"
                            startIcon={<ImageIcon />}
                            href={`${API_BASE}${req.certificateUrl}`}
                            target="_blank"
                            rel="noopener"
                            sx={{ mt: 1, color: LAVENDER }}
                          >
                            Посмотреть сертификат
                          </Button>
                        )}

                        {req.adminNote && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                            Примечание администратора: {req.adminNote}
                          </Typography>
                        )}

                        {req.status === 'PENDING' && (
                          <Stack direction="row" spacing={1.5} mt={2} pt={2} sx={{ borderTop: '1px solid #F7F5FC' }}>
                            <Button
                              variant="contained"
                              color="success"
                              startIcon={<CheckCircleIcon />}
                              onClick={() => { setReviewDialog(req); setAdminNote(''); }}
                              sx={{ flex: 1 }}
                            >
                              Рассмотреть
                            </Button>
                          </Stack>
                        )}
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </>
      )}

      {/* --- PROFILE CHANGES TAB --- */}
      {mainTab === 2 && (
        <>
          {profileChangesLoading ? <PageLoader /> : profileChanges.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 12, color: 'text.secondary' }}>
              <EditNoteIcon sx={{ fontSize: 48, opacity: 0.35, mb: 2 }} />
              <Typography variant="h6" fontWeight={600}>Нет заявок на изменение профиля</Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {profileChanges.map((req) => (
                <Card key={req.id} elevation={1}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <Avatar sx={{ width: 44, height: 44, bgcolor: LAVENDER_BG, color: LAVENDER, fontWeight: 700, flexShrink: 0 }}>
                        {req.tutorProfile.user.name.slice(0, 2).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={700}>{req.tutorProfile.user.name}</Typography>
                            <Typography variant="body2" color="text.secondary">{req.tutorProfile.user.email}</Typography>
                            <Typography variant="caption" color="text.disabled">
                              {new Date(req.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </Typography>
                          </Box>
                          <Chip label="На проверке" size="small" color="warning" variant="outlined" />
                        </Stack>

                        <Box sx={{ mt: 2, display: 'grid', gap: 1.5 }}>
                          {req.bio !== undefined && (
                            <Box>
                              <Typography variant="caption" color="text.disabled" fontWeight={600}>О себе (новое)</Typography>
                              <Typography variant="body2" sx={{ mt: 0.25 }}>{req.bio}</Typography>
                              {req.tutorProfile.bio && (
                                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                                  Текущее: {req.tutorProfile.bio}
                                </Typography>
                              )}
                            </Box>
                          )}
                          {req.education !== undefined && (
                            <Box>
                              <Typography variant="caption" color="text.disabled" fontWeight={600}>Образование (новое)</Typography>
                              <Typography variant="body2" sx={{ mt: 0.25 }}>{req.education}</Typography>
                              {req.tutorProfile.education && (
                                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                                  Текущее: {req.tutorProfile.education}
                                </Typography>
                              )}
                            </Box>
                          )}
                          {req.experience !== undefined && (
                            <Box>
                              <Typography variant="caption" color="text.disabled" fontWeight={600}>Опыт (новое)</Typography>
                              <Typography variant="body2" sx={{ mt: 0.25 }}>{req.experience} лет</Typography>
                              {req.tutorProfile.experience != null && (
                                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                                  Текущее: {req.tutorProfile.experience} лет
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>

                        <Stack direction="row" spacing={1.5} mt={2} pt={2} sx={{ borderTop: '1px solid #F7F5FC' }}>
                          <Button
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => { setProfileChangeDialog(req); setProfileChangeNote(''); }}
                            sx={{ flex: 1 }}
                          >
                            Рассмотреть
                          </Button>
                        </Stack>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </>
      )}

      {/* Profile change review dialog */}
      <Dialog open={Boolean(profileChangeDialog)} onClose={() => setProfileChangeDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Изменение профиля — {profileChangeDialog?.tutorProfile.user.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {profileChangeDialog?.bio !== undefined && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>О себе</Typography>
                <Typography variant="body2" sx={{ mt: 0.5, p: 1.5, bgcolor: '#F7F5FC', borderRadius: 1.5 }}>{profileChangeDialog.bio}</Typography>
              </Box>
            )}
            {profileChangeDialog?.education !== undefined && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Образование</Typography>
                <Typography variant="body2" sx={{ mt: 0.5, p: 1.5, bgcolor: '#F7F5FC', borderRadius: 1.5 }}>{profileChangeDialog.education}</Typography>
              </Box>
            )}
            {profileChangeDialog?.experience !== undefined && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Опыт</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>{profileChangeDialog.experience} лет</Typography>
              </Box>
            )}
            <Divider />
            <TextField
              label="Примечание для репетитора (необязательно)"
              multiline
              rows={2}
              value={profileChangeNote}
              onChange={(e) => setProfileChangeNote(e.target.value)}
              placeholder="Причина отклонения или комментарий..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button variant="outlined" onClick={() => setProfileChangeDialog(null)} disabled={profileChangeProcessing} sx={{ flex: 1 }}>Отмена</Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={profileChangeProcessing ? <CircularProgress size={16} color="inherit" /> : <CancelIcon />}
            onClick={() => handleProfileChangeReview('reject')}
            disabled={profileChangeProcessing}
            sx={{ flex: 1 }}
          >
            Отклонить
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={profileChangeProcessing ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
            onClick={() => handleProfileChangeReview('approve')}
            disabled={profileChangeProcessing}
            sx={{ flex: 1 }}
          >
            Одобрить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review dialog */}
      <Dialog open={Boolean(reviewDialog)} onClose={() => setReviewDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          Рассмотреть заявку — {reviewDialog?.subject}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Репетитор</Typography>
              <Typography variant="body2">{reviewDialog?.tutorProfile?.user.name}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Обоснование</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>{reviewDialog?.justification}</Typography>
            </Box>
            {reviewDialog?.certificateUrl && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Сертификат</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Button size="small" startIcon={<ImageIcon />} href={`${API_BASE}${reviewDialog.certificateUrl}`} target="_blank" rel="noopener" sx={{ color: LAVENDER }}>
                    Открыть документ
                  </Button>
                </Box>
              </Box>
            )}
            <TextField
              label="Примечание (необязательно)"
              multiline
              rows={2}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Комментарий для репетитора..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button variant="outlined" onClick={() => setReviewDialog(null)} disabled={reviewProcessing} sx={{ flex: 1 }}>Отмена</Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={reviewProcessing ? <CircularProgress size={16} color="inherit" /> : <CancelIcon />}
            onClick={() => handleSubjectReview('reject')}
            disabled={reviewProcessing}
            sx={{ flex: 1 }}
          >
            Отклонить
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={reviewProcessing ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
            onClick={() => handleSubjectReview('approve')}
            disabled={reviewProcessing}
            sx={{ flex: 1 }}
          >
            Одобрить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
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
