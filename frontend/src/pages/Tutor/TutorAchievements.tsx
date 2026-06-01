import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Stack, Chip, LinearProgress,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { PageLoader } from '../../components/Common/LoadingSpinner';
import api from '../../api/client';
import {
  TUTOR_BADGES, BADGE_CATEGORY_LABELS, BADGE_CATEGORY_COLORS,
  TUTOR_XP_THRESHOLDS, TUTOR_LEVEL_NAMES, TUTOR_LEVEL_REWARDS, getTutorLevel,
  type TutorStats, type BadgeCategory,
} from '../../utils/tutorBadges';

const LAVENDER = '#7C5CBF';
const LAVENDER_BG = '#F0EBF8';

const LEVEL_ICONS = ['🌱', '🔵', '🏅', '🎖️', '✨'];
const LEVEL_COLORS = ['#9B83CF', '#1E88E5', '#2E7D32', '#6A4DAD', '#92650a'];

export default function TutorAchievements() {
  const [stats, setStats] = useState<TutorStats | null>(null);
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BadgeCategory | 'all'>('all');

  useEffect(() => {
    Promise.all([
      api.get('/tutors/me/profile').then((r) => {
        setXp(r.data.user?.xp ?? 0);
        return r.data;
      }),
      api.get('/tutors/me/stats').then((r) => r.data),
    ]).then(([profile, st]) => {
      setStats({
        completed: st.completedSessions ?? 0,
        rating: profile.rating ?? 0,
        reviewCount: profile.reviewCount ?? 0,
        createdAt: profile.user?.createdAt,
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading || !stats) return <PageLoader />;

  const lvl = getTutorLevel(xp);
  const evaluated = TUTOR_BADGES.map((b) => ({
    ...b,
    isEarned: b.earned(stats),
    pct: b.progress ? Math.round(b.progress(stats)) : undefined,
  }));

  const categories: (BadgeCategory | 'all')[] = ['all', 'SESSIONS', 'REVIEWS', 'RATING', 'LOYALTY'];
  const shown = filter === 'all' ? evaluated : evaluated.filter((b) => b.category === filter);
  const earnedBadges = shown.filter((b) => b.isEarned);
  const lockedBadges = shown.filter((b) => !b.isEarned);
  const totalEarnedBadges = evaluated.filter((b) => b.isEarned).length;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
        <EmojiEventsIcon sx={{ color: '#f59e0b', fontSize: 28 }} />
        <Typography variant="h4" fontWeight={700}>Достижения</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Уровень {lvl.level} из {TUTOR_LEVEL_NAMES.length} · {totalEarnedBadges} из {TUTOR_BADGES.length} бейджей
      </Typography>

      {/* ── Карьерный прогресс (XP-бар) ─────────────────────────────── */}
      <Card elevation={1} sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <TrendingUpIcon sx={{ color: LAVENDER }} />
            <Typography variant="subtitle1" fontWeight={700}>Карьерный прогресс</Typography>
            <Chip
              label={`Уровень ${lvl.level} — ${lvl.name}`}
              size="small"
              sx={{ bgcolor: LAVENDER_BG, color: LAVENDER, fontWeight: 700 }}
            />
            <Chip label={`${xp} XP`} size="small" sx={{ bgcolor: '#F7F5FC', color: '#9B83CF' }} />
          </Stack>

          {lvl.next ? (
            <Box>
              <LinearProgress
                variant="determinate"
                value={lvl.progress}
                sx={{ height: 8, borderRadius: 4, bgcolor: '#EDE9F7', '& .MuiLinearProgress-bar': { bgcolor: LAVENDER, borderRadius: 4 } }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                До «{TUTOR_LEVEL_NAMES[lvl.level]}»: ещё {lvl.next - xp} XP · следующая награда: {TUTOR_LEVEL_REWARDS[lvl.level]}
              </Typography>
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">Максимальный уровень достигнут 🎉</Typography>
          )}
        </CardContent>
      </Card>

      {/* ── Уровни карьеры — карточки (получено / заблокировано) ─────── */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 18 }} />
          <Typography variant="body1" fontWeight={700}>
            Уровни карьеры ({lvl.level} из {TUTOR_LEVEL_NAMES.length})
          </Typography>
        </Stack>
        <Grid container spacing={2}>
          {TUTOR_LEVEL_NAMES.map((name, idx) => {
            const lvlNum = idx + 1;
            const isReached = lvl.level >= lvlNum;
            const isCurrent = lvl.level === lvlNum;
            const color = LEVEL_COLORS[idx];
            const xpNeeded = TUTOR_XP_THRESHOLDS[idx];
            const reward = TUTOR_LEVEL_REWARDS[idx];

            if (isReached) {
              return (
                <Grid item xs={6} sm={4} md={4} key={name}>
                  <Card
                    elevation={isCurrent ? 2 : 1}
                    sx={{
                      height: '100%',
                      border: isCurrent ? `2px solid ${color}` : `2px solid ${color}22`,
                      bgcolor: `${color}08`,
                      boxShadow: isCurrent ? `0 0 0 3px ${color}22` : undefined,
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 2.5 }}>
                      <Typography variant="h3" sx={{ mb: 1 }}>{LEVEL_ICONS[idx]}</Typography>
                      {isCurrent ? (
                        <Chip
                          label="Текущий"
                          size="small"
                          sx={{ mb: 1, bgcolor: `${color}22`, color, fontWeight: 700, fontSize: 10 }}
                        />
                      ) : (
                        <Chip
                          label="Достигнут"
                          size="small"
                          sx={{ mb: 1, bgcolor: '#F0FDF4', color: '#22c55e', fontWeight: 600, fontSize: 10 }}
                        />
                      )}
                      <Typography variant="body2" fontWeight={700} color="text.primary">{name}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, lineHeight: 1.4 }}>
                        {reward}
                      </Typography>
                      <Typography variant="caption" sx={{ color, fontWeight: 600, mt: 0.5, display: 'block' }}>
                        {xpNeeded} XP
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            }

            // Заблокированный уровень
            const prevThreshold = idx > 0 ? TUTOR_XP_THRESHOLDS[idx - 1] : 0;
            const range = xpNeeded - prevThreshold;
            const pct = range > 0 ? Math.min(100, Math.max(0, ((xp - prevThreshold) / range) * 100)) : 0;
            const xpToReach = xpNeeded - xp;

            return (
              <Grid item xs={6} sm={4} md={4} key={name}>
                <Card elevation={0} sx={{ height: '100%', bgcolor: '#F7F5FC', border: '1px dashed #D5C9EE' }}>
                  <CardContent sx={{ textAlign: 'center', p: 2.5, position: 'relative' }}>
                    <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                      <LockIcon sx={{ fontSize: 14, color: '#C0B4E4' }} />
                    </Box>
                    <Typography variant="h3" sx={{ mb: 1, filter: 'grayscale(1)', opacity: 0.4 }}>
                      {LEVEL_ICONS[idx]}
                    </Typography>
                    <Chip label="Заблокирован" size="small" sx={{ mb: 1, bgcolor: '#EDE9F7', color: '#9B83CF', fontSize: 10 }} />
                    <Typography variant="body2" fontWeight={600} color="text.disabled">{name}</Typography>
                    <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5, lineHeight: 1.4 }}>
                      {reward}
                    </Typography>
                    {pct > 0 ? (
                      <Box sx={{ mt: 1.5 }}>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{ height: 4, borderRadius: 2, bgcolor: '#E5E0F0', '& .MuiLinearProgress-bar': { bgcolor: LAVENDER, borderRadius: 2 } }}
                        />
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                          {Math.round(pct)}% · ещё {xpToReach} XP
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, mt: 0.5, display: 'block' }}>
                        нужно {xpNeeded} XP
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* ── Фильтр по категории ───────────────────────────────────────── */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        {categories.map((c) => (
          <Chip
            key={c}
            label={c === 'all' ? 'Все бейджи' : BADGE_CATEGORY_LABELS[c]}
            onClick={() => setFilter(c)}
            color={filter === c ? 'primary' : 'default'}
            sx={{
              fontWeight: 500, cursor: 'pointer',
              ...(filter !== c && c !== 'all' ? { borderLeft: `3px solid ${BADGE_CATEGORY_COLORS[c]}` } : {}),
            }}
          />
        ))}
      </Box>

      {/* ── Бейджи: получено ──────────────────────────────────────────── */}
      {earnedBadges.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 18 }} />
            <Typography variant="body1" fontWeight={700}>Бейджи: получено ({earnedBadges.length})</Typography>
          </Stack>
          <Grid container spacing={2}>
            {earnedBadges.map((b) => (
              <Grid item xs={6} sm={4} md={3} key={b.id}>
                <Card
                  elevation={1}
                  sx={{ height: '100%', border: `2px solid ${BADGE_CATEGORY_COLORS[b.category]}22`, bgcolor: `${BADGE_CATEGORY_COLORS[b.category]}08` }}
                >
                  <CardContent sx={{ textAlign: 'center', p: 2.5 }}>
                    <Typography variant="h3" sx={{ mb: 1 }}>{b.icon}</Typography>
                    <Chip
                      label={BADGE_CATEGORY_LABELS[b.category]}
                      size="small"
                      sx={{ mb: 1, bgcolor: `${BADGE_CATEGORY_COLORS[b.category]}22`, color: BADGE_CATEGORY_COLORS[b.category], fontWeight: 600, fontSize: 10 }}
                    />
                    <Typography variant="body2" fontWeight={700} color="text.primary">{b.label}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, lineHeight: 1.4 }}>
                      {b.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* ── Бейджи: ещё не получено ───────────────────────────────────── */}
      {lockedBadges.length > 0 && (
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <LockIcon sx={{ color: '#C0B4E4', fontSize: 18 }} />
            <Typography variant="body1" fontWeight={700} color="text.disabled">
              Бейджи: ещё не получено ({lockedBadges.length})
            </Typography>
          </Stack>
          <Grid container spacing={2}>
            {lockedBadges.map((b) => (
              <Grid item xs={6} sm={4} md={3} key={b.id}>
                <Card elevation={0} sx={{ height: '100%', bgcolor: '#F7F5FC', border: '1px dashed #D5C9EE' }}>
                  <CardContent sx={{ textAlign: 'center', p: 2.5, position: 'relative' }}>
                    <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                      <LockIcon sx={{ fontSize: 14, color: '#C0B4E4' }} />
                    </Box>
                    <Typography variant="h3" sx={{ mb: 1, filter: 'grayscale(1)', opacity: 0.4 }}>{b.icon}</Typography>
                    <Chip
                      label={BADGE_CATEGORY_LABELS[b.category]}
                      size="small"
                      sx={{ mb: 1, bgcolor: '#EDE9F7', color: '#9B83CF', fontSize: 10 }}
                    />
                    <Typography variant="body2" fontWeight={600} color="text.disabled">{b.label}</Typography>
                    <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5, lineHeight: 1.4 }}>
                      {b.description}
                    </Typography>
                    {b.pct !== undefined && b.pct > 0 && (
                      <Box sx={{ mt: 1.5 }}>
                        <LinearProgress
                          variant="determinate"
                          value={b.pct}
                          sx={{ height: 4, borderRadius: 2, bgcolor: '#E5E0F0', '& .MuiLinearProgress-bar': { bgcolor: LAVENDER, borderRadius: 2 } }}
                        />
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>{b.pct}%</Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {earnedBadges.length === 0 && lockedBadges.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
          <EmojiEventsIcon sx={{ fontSize: 56, opacity: 0.3, mb: 2 }} />
          <Typography variant="h6" fontWeight={600}>Нет бейджей по выбранному фильтру</Typography>
        </Box>
      )}
    </Box>
  );
}
