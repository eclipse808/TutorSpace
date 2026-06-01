import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { GOAL_XP, awardXP } from '../utils/xp';

export const goalsRouter = Router();
goalsRouter.use(authenticate);

goalsRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role === 'TUTOR') {
      const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
      if (!tutor) { res.status(404).json({ error: 'Not found' }); return; }
      const { studentProfileId } = req.query;
      const goals = await prisma.goal.findMany({
        where: { tutorProfileId: tutor.id, ...(studentProfileId ? { studentProfileId: studentProfileId as string } : {}) },
        include: { studentProfile: { include: { user: { select: { id: true, name: true, avatar: true } } } } },
        orderBy: [{ completed: 'asc' }, { pendingConfirmation: 'desc' }, { createdAt: 'desc' }],
      });
      res.json(goals);
    } else {
      const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
      if (!student) { res.status(404).json({ error: 'Not found' }); return; }
      const goals = await prisma.goal.findMany({
        where: { studentProfileId: student.id },
        include: { tutorProfile: { include: { user: { select: { id: true, name: true, avatar: true } } } } },
        orderBy: [{ completed: 'asc' }, { pendingConfirmation: 'desc' }, { createdAt: 'desc' }],
      });
      res.json(goals);
    }
  } catch (err) { console.error('Goals list error:', err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

goalsRouter.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Tutor only' }); return; }
  try {
    const { studentProfileId, subject, title, description, difficulty } = req.body;
    if (!studentProfileId || !subject || !title) {
      res.status(400).json({ error: 'studentProfileId, subject and title are required' }); return;
    }
    const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!tutor) { res.status(404).json({ error: 'Tutor profile not found' }); return; }

    if (difficulty && !['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
      res.status(400).json({ error: 'difficulty must be EASY, MEDIUM or HARD' }); return;
    }
    const diff = (difficulty ?? 'MEDIUM') as 'EASY' | 'MEDIUM' | 'HARD';
    const goal = await prisma.goal.create({
      data: { tutorProfileId: tutor.id, studentProfileId, subject, title, description, difficulty: diff, xpReward: GOAL_XP[diff] },
      include: { studentProfile: { include: { user: { select: { id: true, name: true, avatar: true } } } } },
    });
    res.status(201).json(goal);
  } catch (err) { console.error('Goal create error:', err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

goalsRouter.put('/:id/request-complete', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'STUDENT') { res.status(403).json({ error: 'Student only' }); return; }
  try {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!student) { res.status(404).json({ error: 'Not found' }); return; }
    const goal = await prisma.goal.findFirst({ where: { id: req.params.id, studentProfileId: student.id } });
    if (!goal) { res.status(404).json({ error: 'Not found' }); return; }
    if (goal.completed) { res.status(400).json({ error: 'Already completed' }); return; }
    if (goal.pendingConfirmation) { res.status(400).json({ error: 'Already pending' }); return; }
    const updated = await prisma.goal.update({ where: { id: req.params.id }, data: { pendingConfirmation: true } });

    // Notify tutor that student requests completion
    try {
      const tutor = await prisma.tutorProfile.findUnique({ where: { id: goal.tutorProfileId }, select: { userId: true } });
      if (tutor) {
        await prisma.notification.create({
          data: {
            userId: tutor.userId,
            type: 'INFO',
            title: 'Ученик выполнил цель',
            message: `Ученик отмечает цель «${goal.title}» как выполненную. Подтвердите или отклоните.`,
            link: '/tutor/goals',
          },
        });
      }
    } catch (err) { console.error('Goal notify tutor error:', err); }

    res.json(updated);
  } catch (err) { console.error('Goal request-complete error:', err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

goalsRouter.put('/:id/complete', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Tutor only' }); return; }
  try {
    const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!tutor) { res.status(404).json({ error: 'Not found' }); return; }
    const goal = await prisma.goal.findFirst({ where: { id: req.params.id, tutorProfileId: tutor.id } });
    if (!goal) { res.status(404).json({ error: 'Not found' }); return; }
    if (goal.completed) { res.status(400).json({ error: 'Already completed' }); return; }

    const updated = await prisma.goal.update({
      where: { id: req.params.id },
      data: { completed: true, completedAt: new Date(), pendingConfirmation: false },
    });

    const student = await prisma.studentProfile.findUnique({ where: { id: goal.studentProfileId }, select: { userId: true } });
    if (student) {
      await awardXP(student.userId, goal.xpReward, prisma);
      // Notify student about completion
      try {
        await prisma.notification.create({
          data: {
            userId: student.userId,
            type: 'SUCCESS',
            title: 'Цель выполнена! 🎉',
            message: `Репетитор подтвердил выполнение цели «${goal.title}». Вы получили +${goal.xpReward} XP!`,
            link: '/student/goals',
          },
        });
      } catch (err) { console.error('Goal complete notify error:', err); }
    }

    res.json(updated);
  } catch (err) { console.error('Goal complete error:', err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

goalsRouter.put('/:id/reject-complete', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Tutor only' }); return; }
  try {
    const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!tutor) { res.status(404).json({ error: 'Not found' }); return; }
    const goal = await prisma.goal.findFirst({ where: { id: req.params.id, tutorProfileId: tutor.id } });
    if (!goal) { res.status(404).json({ error: 'Not found' }); return; }
    const updated = await prisma.goal.update({ where: { id: req.params.id }, data: { pendingConfirmation: false } });

    // Notify student that completion was rejected
    try {
      const student = await prisma.studentProfile.findUnique({ where: { id: goal.studentProfileId }, select: { userId: true } });
      if (student) {
        await prisma.notification.create({
          data: {
            userId: student.userId,
            type: 'WARNING',
            title: 'Цель пока не засчитана',
            message: `Репетитор не подтвердил выполнение цели «${goal.title}». Продолжайте работу!`,
            link: '/student/goals',
          },
        });
      }
    } catch (err) { console.error('Goal reject notify error:', err); }

    res.json(updated);
  } catch (err) { console.error('Goal reject error:', err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

goalsRouter.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Tutor only' }); return; }
  try {
    const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!tutor) { res.status(404).json({ error: 'Not found' }); return; }
    const goal = await prisma.goal.findFirst({ where: { id: req.params.id, tutorProfileId: tutor.id } });
    if (!goal) { res.status(404).json({ error: 'Not found' }); return; }
    await prisma.goal.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { console.error('Goal delete error:', err); res.status(500).json({ error: 'Ошибка сервера' }); }
});
