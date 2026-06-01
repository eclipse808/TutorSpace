import { PrismaClient } from '@prisma/client';

export async function checkAndAwardAchievements(
  studentProfileId: string,
  prisma: PrismaClient,
  notifyUserId?: string,
): Promise<string[]> {
  const [allAchievements, earnedRecords, studentProfile] = await Promise.all([
    prisma.achievement.findMany(),
    prisma.studentAchievement.findMany({ where: { studentProfileId }, select: { achievementId: true } }),
    prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: { user: { select: { level: true } } },
    }),
  ]);

  const earnedIds = new Set(earnedRecords.map((e) => e.achievementId));
  const currentLevel = studentProfile?.user.level ?? 1;

  const [completedCount, scoreGroups, subjects, weekSessions, reviewCount] = await Promise.all([
    prisma.session.count({ where: { studentProfileId, status: 'COMPLETED' } }),
    prisma.competencyScore.groupBy({
      by: ['criteriaId'],
      where: { studentProfileId },
      _max: { score: true },
    }),
    prisma.session.findMany({
      where: { studentProfileId, status: 'COMPLETED' },
      select: { subject: true },
      distinct: ['subject'],
    }),
    prisma.session.count({
      where: {
        studentProfileId,
        status: 'COMPLETED',
        scheduledAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.review.count({ where: { studentProfileId } }),
  ]);

  const maxScore = Math.max(0, ...scoreGroups.map((s) => Number(s._max.score ?? 0)));

  // "Всесторонний" — all criteria above threshold
  const allAboveThreshold = (threshold: number) =>
    scoreGroups.length > 0 && scoreGroups.every((s) => Number(s._max.score ?? 0) >= threshold);

  const newIds: string[] = [];

  for (const ach of allAchievements) {
    if (earnedIds.has(ach.id)) continue;

    let earned = false;

    if (ach.type === 'ATTENDANCE' && ach.sessionsRequired != null) {
      earned = completedCount >= ach.sessionsRequired;
    } else if (ach.type === 'SCORE_MILESTONE' && ach.threshold != null) {
      if (ach.name === 'Всесторонний') {
        earned = allAboveThreshold(ach.threshold);
      } else {
        earned = maxScore >= ach.threshold;
      }
    } else if (ach.type === 'STREAK') {
      if (ach.name === 'Неделя рывка') {
        earned = weekSessions >= 5;
      } else {
        earned = weekSessions >= 3;
      }
    } else if (ach.type === 'SPECIAL') {
      if (ach.name === 'Полиглот') earned = subjects.length >= 2;
      else if (ach.name === 'Разносторонний') earned = subjects.length >= 3;
      else if (ach.name === 'Первый отзыв') earned = reviewCount >= 1;
      else if (ach.name === 'Ступень III') earned = currentLevel >= 3;
      else if (ach.name === 'Ступень V') earned = currentLevel >= 5;
      else if (ach.name === 'Легендарный') earned = currentLevel >= 7;
      else if (ach.name === 'Гений') earned = currentLevel >= 10;
    }

    if (earned) newIds.push(ach.id);
  }

  if (newIds.length > 0) {
    await prisma.studentAchievement.createMany({
      data: newIds.map((achievementId) => ({ studentProfileId, achievementId })),
      skipDuplicates: true,
    });

    if (notifyUserId) {
      const newAchievements = allAchievements.filter((a) => newIds.includes(a.id));
      const names = newAchievements.map((a) => `${a.icon} ${a.name}`).join(', ');
      await prisma.notification.create({
        data: {
          userId: notifyUserId,
          type: 'SUCCESS',
          title: newIds.length === 1 ? 'Новое достижение!' : `Новые достижения (${newIds.length})!`,
          message: names,
          link: '/student/achievements',
        },
      });
    }
  }

  return newIds;
}
