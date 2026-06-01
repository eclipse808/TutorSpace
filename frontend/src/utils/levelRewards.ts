export const LEVEL_NAMES = ['Новичок', 'Ученик', 'Знаток', 'Эксперт', 'Мастер', 'Гуру', 'Легенда', 'Чемпион', 'Виртуоз', 'Гений'];

// Adjusted thresholds: faster early levels, same endgame
// Avg student (2x/week + goals ~80 XP/wk): lvl 5 ~10 weeks, lvl 10 ~1 year
export const LEVEL_THRESHOLDS = [0, 80, 200, 500, 800, 1200, 1700, 2400, 3200, 4200];

export interface LevelReward {
  bannerGradient: string;
  frameColor: string;       // '' = no frame
  frameGlow: boolean;
  title: string;
  frameLabel: string;
  bannerLabel: string;
}

// index 0 = level 1
export const LEVEL_REWARDS: LevelReward[] = [
  { bannerGradient: 'linear-gradient(135deg, #7C5CBF, #6A4DAD)', frameColor: '',        frameGlow: false, title: '',         frameLabel: 'Без рамки',              bannerLabel: 'Лавандовый' },
  { bannerGradient: 'linear-gradient(135deg, #1565C0, #1E88E5)', frameColor: '#1E88E5', frameGlow: false, title: 'Ученик',   frameLabel: 'Синяя рамка',            bannerLabel: 'Синий' },
  { bannerGradient: 'linear-gradient(135deg, #2E7D32, #43A047)', frameColor: '#43A047', frameGlow: false, title: 'Знаток',   frameLabel: 'Зелёная рамка',          bannerLabel: 'Зелёный' },
  { bannerGradient: 'linear-gradient(135deg, #6A4DAD, #9B59B6)', frameColor: '#9B59B6', frameGlow: false, title: 'Эксперт', frameLabel: 'Фиолетовая рамка',       bannerLabel: 'Фиолетовый' },
  { bannerGradient: 'linear-gradient(135deg, #E65100, #FF8F00)', frameColor: '#FF8F00', frameGlow: true,  title: 'Мастер',  frameLabel: 'Золотая рамка + свечение', bannerLabel: 'Золотой' },
  { bannerGradient: 'linear-gradient(135deg, #B71C1C, #E53935)', frameColor: '#E53935', frameGlow: true,  title: 'Гуру',    frameLabel: 'Красная рамка + свечение', bannerLabel: 'Красный' },
  { bannerGradient: 'linear-gradient(135deg, #880E4F, #C2185B)', frameColor: '#E91E63', frameGlow: true,  title: 'Легенда', frameLabel: 'Розовая рамка + свечение', bannerLabel: 'Пурпурный' },
  { bannerGradient: 'linear-gradient(135deg, #006064, #00838F)', frameColor: '#00BCD4', frameGlow: true,  title: 'Чемпион', frameLabel: 'Бирюзовая + свечение',     bannerLabel: 'Бирюзовый' },
  { bannerGradient: 'linear-gradient(135deg, #BF360C, #D84315)', frameColor: '#FF5722', frameGlow: true,  title: 'Виртуоз', frameLabel: 'Огненная + свечение',       bannerLabel: 'Огненный' },
  { bannerGradient: 'linear-gradient(135deg, #F57F17, #E65100, #B71C1C)', frameColor: '#FFD700', frameGlow: true, title: 'Гений', frameLabel: '✨ Радужная',         bannerLabel: '✨ Золотой' },
];

export function getLevelReward(level: number): LevelReward {
  const idx = Math.max(0, Math.min(level - 1, LEVEL_REWARDS.length - 1));
  return LEVEL_REWARDS[idx];
}

export function getNextLevelReward(level: number): { reward: LevelReward; level: number; name: string; xpNeeded: number } | null {
  if (level >= LEVEL_NAMES.length) return null;
  return {
    reward: LEVEL_REWARDS[level],
    level: level + 1,
    name: LEVEL_NAMES[level],
    xpNeeded: LEVEL_THRESHOLDS[level],
  };
}

export function getLevelProgress(xp: number, level: number) {
  const cur = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const next = LEVEL_THRESHOLDS[level] ?? cur + 1000;
  return {
    progress: Math.min(100, Math.max(0, ((xp - cur) / (next - cur)) * 100)),
    xpInLevel: xp - cur,
    xpForLevel: next - cur,
    xpToNext: Math.max(0, next - xp),
    name: LEVEL_NAMES[level - 1] ?? 'Гений',
  };
}

// Returns the effective level for display (equipped if unlocked, else current)
export function effectiveFrame(level: number, equipped?: number | null): number {
  if (equipped != null && equipped >= 1 && equipped <= level) return equipped;
  return level;
}

export function effectiveBanner(level: number, equipped?: number | null): number {
  if (equipped != null && equipped >= 1 && equipped <= level) return equipped;
  return level;
}

export function getAvatarFrameSx(level: number): object {
  const r = getLevelReward(level);
  if (!r.frameColor) return {};
  return {
    border: `3px solid ${r.frameColor}`,
    boxShadow: r.frameGlow ? `0 0 14px ${r.frameColor}bb` : undefined,
  };
}
