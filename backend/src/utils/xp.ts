import { PrismaClient } from '@prisma/client';

// Cumulative XP required to reach each level (index = level - 1)
// Must stay in sync with frontend src/utils/levelRewards.ts LEVEL_THRESHOLDS
export const LEVEL_THRESHOLDS = [0, 80, 200, 500, 800, 1200, 1700, 2400, 3200, 4200];

export const GOAL_XP: Record<string, number> = {
  EASY: 15,
  MEDIUM: 30,
  HARD: 50,
};

export const SESSION_XP = 20;
export const STREAK_BONUS_XP = 10;

// Tutor XP — slightly higher than student to reward teaching time
export const TUTOR_SESSION_XP = 25;
export const TUTOR_REVIEW_XP = 20;

// Tutor XP thresholds — 5 levels, max reachable in ~2 years at average pace
// Average active tutor (~15 sessions/month, 3 reviews/month ≈ 435 XP/month):
//   Level 2 < 1 month · Level 3 ≈ 4.5 months · Level 4 ≈ 12 months · Level 5 ≈ 2.3 years
// Must stay in sync with frontend src/utils/tutorBadges.ts TUTOR_XP_THRESHOLDS
export const TUTOR_XP_THRESHOLDS = [0, 400, 2000, 5500, 12000];

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
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { xp: { increment: amount } },
    select: { xp: true },
  });
  const newLevel = getLevelFromXp(updated.xp);
  await prisma.user.update({ where: { id: userId }, data: { level: newLevel } });
}

// Tutor XP: only updates xp, not level (tutor level is computed on frontend using TUTOR_XP_THRESHOLDS)
export async function awardTutorXP(userId: string, amount: number, prisma: PrismaClient): Promise<void> {
  try {
    await prisma.user.update({ where: { id: userId }, data: { xp: { increment: amount } } });
  } catch (err) {
    console.error(`Failed to award tutor XP to user ${userId}:`, err);
  }
}
