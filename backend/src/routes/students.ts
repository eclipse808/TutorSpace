import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const studentsRouter = Router();

// Public student profile — no auth required
studentsRouter.get('/:id/public', async (req, res): Promise<void> => {
  try {
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
      prisma.session.count({ where: { studentProfileId: req.params.id, status: 'COMPLETED' } }),
    ]);

    res.json({
      id: studentProfile.id,
      user: studentProfile.user,
      photoUrl: studentProfile.photoUrl,
      grade: studentProfile.grade,
      learningGoal: studentProfile.learningGoal,
      completedSessions,
      equippedFrame: studentProfile.equippedFrame,
      equippedBanner: studentProfile.equippedBanner,
      achievements: achievements.map((a) => ({ ...a.achievement, earnedAt: a.earnedAt })),
    });
  } catch (err) {
    console.error('Public profile error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Update profile info (grade, learningGoal)
studentsRouter.put('/me/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'STUDENT') { res.status(403).json({ error: 'Forbidden' }); return; }
  try {
    const { grade, learningGoal } = req.body;
    const updated = await prisma.studentProfile.update({
      where: { userId: req.user!.id },
      data: {
        grade: grade ?? undefined,
        learningGoal: learningGoal ?? undefined,
      },
      select: { grade: true, learningGoal: true },
    });
    res.json(updated);
  } catch (err) {
    console.error('Student profile update error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Save equipment selection (authenticated student only)
studentsRouter.put('/me/equipment', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'STUDENT') { res.status(403).json({ error: 'Forbidden' }); return; }
  try {
    const { equippedFrame, equippedBanner } = req.body as { equippedFrame?: number | null; equippedBanner?: number | null };

    const userRecord = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { level: true } });
    const userLevel = userRecord?.level ?? 1;

    if (equippedFrame != null && (equippedFrame < 1 || equippedFrame > userLevel)) {
      res.status(400).json({ error: 'Рамка ещё не разблокирована' }); return;
    }
    if (equippedBanner != null && (equippedBanner < 1 || equippedBanner > userLevel)) {
      res.status(400).json({ error: 'Стиль ленты ещё не разблокирован' }); return;
    }

    const updated = await prisma.studentProfile.update({
      where: { userId: req.user!.id },
      data: { equippedFrame: equippedFrame ?? null, equippedBanner: equippedBanner ?? null },
      select: { equippedFrame: true, equippedBanner: true },
    });
    res.json(updated);
  } catch (err) {
    console.error('Equipment update error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
