// Shared tutor gamification catalog — used by dashboard, public profile, catalog card, and achievements page.

export interface TutorStats {
  completed: number;
  rating: number;
  reviewCount: number;
  createdAt?: string;
}

export type BadgeCategory = 'SESSIONS' | 'REVIEWS' | 'RATING' | 'LOYALTY';

export interface TutorBadgeDef {
  id: string;
  icon: string;
  label: string;
  description: string;
  category: BadgeCategory;
  earned: (s: TutorStats) => boolean;
  progress?: (s: TutorStats) => number; // 0..100
}

const yearsOnSite = (createdAt?: string) =>
  createdAt ? (Date.now() - new Date(createdAt).getTime()) / (365 * 24 * 60 * 60 * 1000) : 0;

export const TUTOR_BADGES: TutorBadgeDef[] = [
  // — Занятия —
  { id: 'first',   icon: '🎓', label: 'Первое занятие', description: 'Проведите первое занятие',  category: 'SESSIONS',
    earned: (s) => s.completed >= 1,   progress: (s) => Math.min(100, s.completed / 1 * 100) },
  { id: 'ten',     icon: '🔟', label: 'Десятка',        description: 'Проведите 10 занятий',       category: 'SESSIONS',
    earned: (s) => s.completed >= 10,  progress: (s) => Math.min(100, s.completed / 10 * 100) },
  { id: 'quarter', icon: '📚', label: '25 занятий',     description: 'Проведите 25 занятий',       category: 'SESSIONS',
    earned: (s) => s.completed >= 25,  progress: (s) => Math.min(100, s.completed / 25 * 100) },
  { id: 'fifty',   icon: '🏆', label: 'Полсотни',       description: 'Проведите 50 занятий',       category: 'SESSIONS',
    earned: (s) => s.completed >= 50,  progress: (s) => Math.min(100, s.completed / 50 * 100) },
  { id: 'hundred', icon: '💯', label: 'Сотня',          description: 'Проведите 100 занятий',      category: 'SESSIONS',
    earned: (s) => s.completed >= 100, progress: (s) => Math.min(100, s.completed / 100 * 100) },

  // — Отзывы —
  { id: 'rev10',   icon: '💬', label: '10 отзывов',     description: 'Получите 10 отзывов',        category: 'REVIEWS',
    earned: (s) => s.reviewCount >= 10, progress: (s) => Math.min(100, s.reviewCount / 10 * 100) },
  { id: 'rev50',   icon: '🗣️', label: '50 отзывов',     description: 'Получите 50 отзывов',        category: 'REVIEWS',
    earned: (s) => s.reviewCount >= 50, progress: (s) => Math.min(100, s.reviewCount / 50 * 100) },

  // — Рейтинг —
  { id: 'high',    icon: '⭐', label: 'Высокий рейтинг', description: 'Рейтинг 4.5+ при 3+ отзывах', category: 'RATING',
    earned: (s) => s.rating >= 4.5 && s.reviewCount >= 3 },
  { id: 'perfect', icon: '🌟', label: 'Идеальный рейтинг', description: 'Рейтинг 4.9+ при 5+ отзывах', category: 'RATING',
    earned: (s) => s.rating >= 4.9 && s.reviewCount >= 5 },

  // — Стаж —
  { id: 'half_year', icon: '📆', label: 'Полгода с нами', description: 'Полгода на платформе',     category: 'LOYALTY',
    earned: (s) => yearsOnSite(s.createdAt) >= 0.5, progress: (s) => Math.min(100, yearsOnSite(s.createdAt) / 0.5 * 100) },
  { id: 'year',    icon: '📅', label: 'Год на сайте',   description: 'Год на платформе',           category: 'LOYALTY',
    earned: (s) => yearsOnSite(s.createdAt) >= 1, progress: (s) => Math.min(100, yearsOnSite(s.createdAt) * 100) },
];

export const BADGE_CATEGORY_LABELS: Record<BadgeCategory, string> = {
  SESSIONS: 'Занятия',
  REVIEWS:  'Отзывы',
  RATING:   'Рейтинг',
  LOYALTY:  'Стаж',
};

export const BADGE_CATEGORY_COLORS: Record<BadgeCategory, string> = {
  SESSIONS: '#7C5CBF',
  REVIEWS:  '#3b82f6',
  RATING:   '#f59e0b',
  LOYALTY:  '#16a34a',
};

export function getEarnedTutorBadges(s: TutorStats): { icon: string; label: string }[] {
  return TUTOR_BADGES.filter((b) => b.earned(s)).map((b) => ({ icon: b.icon, label: b.label }));
}

// ── Tutor level ladder (5 levels) ──────────────────────────────────────────
// Thresholds must stay in sync with backend/src/utils/xp.ts TUTOR_XP_THRESHOLDS
// Average active tutor (~15 sessions/month, 3 reviews/month ≈ 435 XP/month):
//   Level 2 < 1 month · Level 3 ≈ 4.5 months · Level 4 ≈ 12 months · Level 5 ≈ 2.3 years
export const TUTOR_XP_THRESHOLDS = [0, 400, 2000, 5500, 12000];

export const TUTOR_LEVEL_NAMES = ['Старт', 'Активный', 'Надёжный', 'Признанный', 'Элитный'];

export const TUTOR_LEVEL_REWARDS = [
  'Доступ к платформе, инструменты обучения',
  'Бейдж «Активный» в личном кабинете',
  '🏅 Бейдж «Надёжный» на публичном профиле',
  '🎖️ Бейдж «Признанный» на публичном профиле',
  '✨ Статус «Элитный репетитор» + золотая рамка в каталоге',
];

export function getTutorLevel(xp: number) {
  const idx = Math.max(0, TUTOR_XP_THRESHOLDS.filter((t) => xp >= t).length - 1);
  const cur = TUTOR_XP_THRESHOLDS[idx];
  const next = TUTOR_XP_THRESHOLDS[idx + 1] ?? null;
  const progress = next ? Math.min(100, ((xp - cur) / (next - cur)) * 100) : 100;
  return {
    level: idx + 1,
    name: TUTOR_LEVEL_NAMES[idx],
    reward: TUTOR_LEVEL_REWARDS[idx],
    nextReward: TUTOR_LEVEL_REWARDS[idx + 1] ?? '',
    cur, next, progress, xp,
  };
}

// ── Public-facing status badge (shown to students) ─────────────────────────
// Only displayed for level 3+. Does NOT expose internal XP/level numbers.
export interface TutorPublicBadge {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function getTutorPublicBadge(xp: number): TutorPublicBadge | null {
  const level = getTutorLevel(xp).level;
  if (level >= 5) return { label: '✨ Элитный репетитор', color: '#92650a', bgColor: '#FFF8E1', borderColor: '#FFB30066' };
  if (level >= 4) return { label: '🎖️ Признанный',       color: '#6A4DAD', bgColor: '#F0EBF8', borderColor: '#9B83CF44' };
  if (level >= 3) return { label: '🏅 Надёжный',         color: '#2E7D32', bgColor: '#F1F8E9', borderColor: '#43A04744' };
  return null;
}

export function isEliteTutor(xp: number): boolean {
  return xp >= TUTOR_XP_THRESHOLDS[4];
}
