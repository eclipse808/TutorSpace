import { Router } from 'express';
import { prisma } from '../lib/prisma';

export const studentsRouter = Router();

// Public student profile — no auth required, no sensitive data
studentsRouter.get('/:id/public', async (req, res): Promise<void> => {
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { id: true, name: true, avatar: true, xp: true, level: true } } },
  });
  if (!studentProfile) { res.status(404).json({ error: 'Not found' }); return; }

  const [achievements, completedSessions] = await Promise.all([
    prisma.studentAchievement.findMany({
      where: { studentProfileId: req.params.id },
      include: { achievement: true },
      orderBy: { earnedAt: 'desc' },
    }),
    prisma.session.count({
      where: { studentProfileId: req.params.id, status: 'COMPLETED' },
    }),
  ]);

  res.json({
    id: studentProfile.id,
    user: studentProfile.user,
    completedSessions,
    achievements: achievements.map((a) => ({ ...a.achievement, earnedAt: a.earnedAt })),
  });
});
