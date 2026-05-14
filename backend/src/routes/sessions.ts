import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkAndAwardAchievements } from '../utils/achievements';
import { awardXP, awardTutorXP, SESSION_XP, STREAK_BONUS_XP, TUTOR_SESSION_XP } from '../utils/xp';

export const sessionsRouter = Router();

sessionsRouter.use(authenticate);

sessionsRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.query;
  let sessions: any[] = [];

  if (req.user!.role === 'STUDENT') {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }
    sessions = await prisma.session.findMany({
      where: {
        studentProfileId: profile.id,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        tutorProfile: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  } else {
    const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!tutor) { res.status(404).json({ error: 'Profile not found' }); return; }
    sessions = await prisma.session.findMany({
      where: {
        tutorProfileId: tutor.id,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        studentProfile: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        competencyScores: { select: { id: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }
  res.json(sessions);
});

sessionsRouter.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'STUDENT') { res.status(403).json({ error: 'Only students can book sessions' }); return; }
  const { tutorProfileId, scheduledAt, duration, subject } = req.body;
  const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }

  // Overlap validation
  const newStart = new Date(scheduledAt);
  const durationMin = duration || 60;
  const newEnd = new Date(newStart.getTime() + durationMin * 60 * 1000);

  const dayStart = new Date(newStart);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(newStart);
  dayEnd.setHours(23, 59, 59, 999);

  const existing = await prisma.session.findMany({
    where: { tutorProfileId, status: { not: 'CANCELLED' }, scheduledAt: { gte: dayStart, lte: dayEnd } },
    select: { scheduledAt: true, duration: true },
  });

  const hasConflict = existing.some((s) => {
    const eStart = new Date(s.scheduledAt);
    const eEnd = new Date(eStart.getTime() + s.duration * 60 * 1000);
    return newStart < eEnd && newEnd > eStart;
  });

  if (hasConflict) {
    res.status(409).json({ error: 'Это время уже занято у репетитора' });
    return;
  }

  const session = await prisma.session.create({
    data: { tutorProfileId, studentProfileId: profile.id, scheduledAt: newStart, duration: durationMin, subject },
    include: { tutorProfile: { include: { user: { select: { id: true, name: true, avatar: true } } } } },
  });
  res.status(201).json(session);
});

sessionsRouter.put('/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, notes } = req.body;
  const session = await prisma.session.findUnique({ where: { id: req.params.id } });
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

  const updated = await prisma.session.update({
    where: { id: req.params.id },
    data: { status, notes },
  });

  if (status === 'COMPLETED') {
    await checkAndAwardAchievements(session.studentProfileId, prisma);

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: session.studentProfileId },
      select: { userId: true },
    });
    if (studentProfile) {
      // Base XP for attending
      let xpToAward = SESSION_XP;

      // Streak bonus: check if previous completed session was within 8 days
      const prevSession = await prisma.session.findFirst({
        where: { studentProfileId: session.studentProfileId, status: 'COMPLETED', id: { not: session.id } },
        orderBy: { scheduledAt: 'desc' },
        select: { scheduledAt: true },
      });
      if (prevSession) {
        const daysDiff = (session.scheduledAt.getTime() - new Date(prevSession.scheduledAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff <= 8) xpToAward += STREAK_BONUS_XP;
      }

      await awardXP(studentProfile.userId, xpToAward, prisma);
    }

    // Award XP to tutor
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { id: session.tutorProfileId },
      select: { userId: true },
    });
    if (tutorProfile) {
      await awardTutorXP(tutorProfile.userId, TUTOR_SESSION_XP, prisma);
    }
  }

  res.json(updated);
});

sessionsRouter.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: {
      tutorProfile: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      studentProfile: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      competencyScores: { include: { criteria: true } },
    },
  });
  if (!session) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(session);
});
