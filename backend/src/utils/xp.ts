import { PrismaClient } from '@prisma/client';

// Cumulative XP required to reach each level (index = level - 1)
export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1700, 2400, 3200, 4200];

export const GOAL_XP: Record<string, number> = {
  EASY: 15,
  MEDIUM: 30,
  HARD: 50,
};

export const SESSION_XP = 20;
export const STREAK_BONUS_XP = 10;

// Tutor XP
export const TUTOR_SESSION_XP = 20;
export const TUTOR_REVIEW_XP = 15;

// Tutor XP thresholds (separate from student, computed on frontend only — DB level field unused for tutors)
export const TUTOR_XP_THRESHOLDS = [0, 200, 800, 2000, 5000, 12000];

export function getLevelFromXp(xp: number): number {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return level;
}

export async function awardXP(userId: string, amount: number, prisma: PrismaClient): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
  if (!user) return;
  const newXp = user.xp + amount;
  const newLevel = getLevelFromXp(newXp);
  await prisma.user.update({ where: { id: userId }, data: { xp: newXp, level: newLevel } });
}

// Tutor XP: only updates xp, not level (tutor level is computed on frontend using TUTOR_XP_THRESHOLDS)
export async function awardTutorXP(userId: string, amount: number, prisma: PrismaClient): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
    if (!user) return;
    await prisma.user.update({ where: { id: userId }, data: { xp: user.xp + amount } });
  } catch {
    // Non-critical — don't fail the parent request
  }
}
