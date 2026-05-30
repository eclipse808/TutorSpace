import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { GOAL_XP, awardXP } from '../utils/xp';

export const goalsRouter = Router();
goalsRouter.use(authenticate);

// GET /goals — tutor: their goals per student; student: own goals
goalsRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role === 'TUTOR') {
    const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!tutor) { res.status(404).json({ error: 'Not found' }); return; }
    const { studentProfileId } = req.query;
    const goals = await prisma.goal.findMany({
      where: {
        tutorProfileId: tutor.id,
        ...(studentProfileId ? { studentProfileId: studentProfileId as string } : {}),
      },
      include: {
        studentProfile: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      },
      orderBy: [{ completed: 'asc' }, { pendingConfirmation: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(goals);
  } else {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!student) { res.status(404).json({ error: 'Not found' }); return; }
    const goals = await prisma.goal.findMany({
      where: { studentProfileId: student.id },
      include: {
        tutorProfile: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      },
      orderBy: [{ completed: 'asc' }, { pendingConfirmation: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(goals);
  }
});

// POST /goals — tutor creates a goal for a student
goalsRouter.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Tutor only' }); return; }
  const { studentProfileId, subject, title, description, difficulty } = req.body;
  if (!studentProfileId || !subject || !title) {
    res.status(400).json({ error: 'studentProfileId, subject and title are required' });
    return;
  }
  const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
  if (!tutor) { res.status(404).json({ error: 'Tutor profile not found' }); return; }

  const diff = (['EASY', 'MEDIUM', 'HARD'].includes(difficulty) ? difficulty : 'MEDIUM') as 'EASY' | 'MEDIUM' | 'HARD';
  const xpReward = GOAL_XP[diff];

  const goal = await prisma.goal.create({
    data: { tutorProfileId: tutor.id, studentProfileId, subject, title, description, difficulty: diff, xpReward },
    include: {
      studentProfile: { include: { user: { select: { id: true, name: true, avatar: true } } } },
    },
  });
  res.status(201).json(goal);
});

// PUT /goals/:id/request-complete — student requests confirmation
goalsRouter.put('/:id/request-complete', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'STUDENT') { res.status(403).json({ error: 'Student only' }); return; }
  const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
  if (!student) { res.status(404).json({ error: 'Not found' }); return; }

  const goal = await prisma.goal.findFirst({ where: { id: req.params.id, studentProfileId: student.id } });
  if (!goal) { res.status(404).json({ error: 'Not found' }); return; }
  if (goal.completed) { res.status(400).json({ error: 'Already completed' }); return; }
  if (goal.pendingConfirmation) { res.status(400).json({ error: 'Already pending' }); return; }

  const updated = await prisma.goal.update({
    where: { id: req.params.id },
    data: { pendingConfirmation: true },
  });
  res.json(updated);
});

// PUT /goals/:id/complete — tutor confirms completion and awards XP
goalsRouter.put('/:id/complete', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Tutor only' }); return; }
  const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
  if (!tutor) { res.status(404).json({ error: 'Not found' }); return; }
  const goal = await prisma.goal.findFirst({ where: { id: req.params.id, tutorProfileId: tutor.id } });
  if (!goal) { res.status(404).json({ error: 'Not found' }); return; }
  if (goal.completed) { res.status(400).json({ error: 'Already completed' }); return; }

  const updated = await prisma.goal.update({
    where: { id: req.params.id },
    data: { completed: true, completedAt: new Date(), pendingConfirmation: false },
  });

  const student = await prisma.studentProfile.findUnique({
    where: { id: goal.studentProfileId },
    select: { userId: true },
  });
  if (student) await awardXP(student.userId, goal.xpReward, prisma);

  res.json(updated);
});

// PUT /goals/:id/reject-complete — tutor rejects student's completion request
goalsRouter.put('/:id/reject-complete', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Tutor only' }); return; }
  const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
  if (!tutor) { res.status(404).json({ error: 'Not found' }); return; }
  const goal = await prisma.goal.findFirst({ where: { id: req.params.id, tutorProfileId: tutor.id } });
  if (!goal) { res.status(404).json({ error: 'Not found' }); return; }

  const updated = await prisma.goal.update({
    where: { id: req.params.id },
    data: { pendingConfirmation: false },
  });
  res.json(updated);
});

// DELETE /goals/:id — tutor deletes a goal
goalsRouter.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Tutor only' }); return; }
  const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
  if (!tutor) { res.status(404).json({ error: 'Not found' }); return; }
  const goal = await prisma.goal.findFirst({ where: { id: req.params.id, tutorProfileId: tutor.id } });
  if (!goal) { res.status(404).json({ error: 'Not found' }); return; }
  await prisma.goal.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});
