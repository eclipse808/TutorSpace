import { PrismaClient } from '@prisma/client';

export async function checkAndAwardAchievements(studentProfileId: string, prisma: PrismaClient): Promise<string[]> {
  const allAchievements = await prisma.achievement.findMany();
  const earned = await prisma.studentAchievement.findMany({
    where: { studentProfileId },
    select: { achievementId: true },
  });
  const earnedIds = new Set(earned.map((e) => e.achievementId));

  const completedCount = await prisma.session.count({
    where: { studentProfileId, status: 'COMPLETED' },
  });

  const scoreGroups = await prisma.competencyScore.groupBy({
    by: ['criteriaId'],
    where: { studentProfileId },
    _max: { score: true },
  });
  const maxScore = Math.max(0, ...scoreGroups.map((s) => Number(s._max.score ?? 0)));

  const subjects = await prisma.session.findMany({
    where: { studentProfileId, status: 'COMPLETED' },
    select: { subject: true },
    distinct: ['subject'],
  });

  const newIds: string[] = [];

  for (const ach of allAchievements) {
    if (earnedIds.has(ach.id)) continue;

    let earned = false;
    if (ach.type === 'ATTENDANCE' && ach.sessionsRequired != null) {
      earned = completedCount >= ach.sessionsRequired;
    } else if (ach.type === 'SCORE_MILESTONE' && ach.threshold != null) {
      earned = maxScore >= ach.threshold;
    } else if (ach.type === 'SPECIAL' && ach.name === 'Полиглот') {
      earned = subjects.length >= 2;
    }

    if (earned) newIds.push(ach.id);
  }

  if (newIds.length > 0) {
    await prisma.studentAchievement.createMany({
      data: newIds.map((achievementId) => ({ studentProfileId, achievementId })),
      skipDuplicates: true,
    });
  }

  return newIds;
}
