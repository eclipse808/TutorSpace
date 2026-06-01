import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkAndAwardAchievements } from '../utils/achievements';
import { awardXP, awardTutorXP, SESSION_XP, STREAK_BONUS_XP, TUTOR_SESSION_XP } from '../utils/xp';

export const sessionsRouter = Router();

sessionsRouter.use(authenticate);

sessionsRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
  } catch (err) { console.error('Sessions GET error:', err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

sessionsRouter.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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

    // Notify tutor about new booking
    try {
      const tutorUser = await prisma.tutorProfile.findUnique({
        where: { id: tutorProfileId },
        select: { userId: true },
      });
      const studentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { name: true },
      });
      if (tutorUser && studentUser) {
        const dateStr = newStart.toLocaleDateString('ru', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
        await prisma.notification.create({
          data: {
            userId: tutorUser.userId,
            type: 'INFO',
            title: 'Новая запись на занятие',
            message: `${studentUser.name} записался к вам на ${subject ? `«${subject}»` : 'занятие'} — ${dateStr}.`,
            link: '/tutor/sessions',
          },
        });
      }
    } catch (err) {
      console.error('Failed to send booking notification:', err);
    }

    res.status(201).json(session);
  } catch (err) { console.error('Sessions POST error:', err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

sessionsRouter.put('/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, notes } = req.body;

  // Validate status value
  const VALID_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];
  if (!status || !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: 'Invalid status' }); return;
  }

  const session = await prisma.session.findUnique({ where: { id: req.params.id } });
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

  // Prevent any changes to already-cancelled sessions
  if (session.status === 'CANCELLED') {
    res.status(400).json({ error: 'Cannot change status of a cancelled session' }); return;
  }

  // 24-hour cancellation policy — neither party can cancel within 24h of the session
  if (status === 'CANCELLED') {
    const hoursUntil = (session.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 24) {
      res.status(400).json({ error: 'Отменить занятие можно не позднее чем за 24 часа до начала' }); return;
    }
  }

  // Ownership + role-based status restrictions
  if (req.user!.role === 'TUTOR') {
    const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!tutor || tutor.id !== session.tutorProfileId) { res.status(403).json({ error: 'Forbidden' }); return; }
  } else if (req.user!.role === 'STUDENT') {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile || profile.id !== session.studentProfileId) { res.status(403).json({ error: 'Forbidden' }); return; }
    // Students can only cancel their own sessions
    if (status !== 'CANCELLED') { res.status(403).json({ error: 'Students can only cancel sessions' }); return; }
  } else {
    res.status(403).json({ error: 'Forbidden' }); return;
  }

  const updated = await prisma.session.update({
    where: { id: req.params.id },
    data: { status, notes },
  });

  // Notify the other party when session is cancelled
  if (status === 'CANCELLED') {
    try {
      const [studentProfile, tutorProfile] = await Promise.all([
        prisma.studentProfile.findUnique({ where: { id: session.studentProfileId }, select: { userId: true } }),
        prisma.tutorProfile.findUnique({ where: { id: session.tutorProfileId }, select: { userId: true } }),
      ]);
      const cancelledBy = req.user!.role === 'STUDENT' ? 'Студент' : 'Репетитор';
      const dateStr = new Date(session.scheduledAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
      const notifyUserId = req.user!.role === 'STUDENT' ? tutorProfile?.userId : studentProfile?.userId;
      if (notifyUserId) {
        await prisma.notification.create({
          data: {
            userId: notifyUserId,
            type: 'WARNING',
            title: 'Занятие отменено',
            message: `${cancelledBy} отменил занятие по «${session.subject}» запланированное на ${dateStr}.`,
            link: req.user!.role === 'STUDENT' ? '/tutor/sessions' : '/student/sessions',
          },
        });
      }
    } catch (err) {
      console.error('Failed to send cancellation notification:', err);
    }
  }

  if (status === 'COMPLETED' && session.status !== 'COMPLETED') {
    try {
      const [studentProfile, tutorProfile] = await Promise.all([
        prisma.studentProfile.findUnique({ where: { id: session.studentProfileId }, select: { userId: true } }),
        prisma.tutorProfile.findUnique({ where: { id: session.tutorProfileId }, select: { userId: true } }),
      ]);

      await checkAndAwardAchievements(session.studentProfileId, prisma, studentProfile?.userId);

      const awardPromises: Promise<void>[] = [];

      if (studentProfile) {
        let xpToAward = SESSION_XP;
        const prevSession = await prisma.session.findFirst({
          where: { studentProfileId: session.studentProfileId, status: 'COMPLETED', id: { not: session.id } },
          orderBy: { scheduledAt: 'desc' },
          select: { scheduledAt: true },
        });
        if (prevSession) {
          const daysDiff = (session.scheduledAt.getTime() - new Date(prevSession.scheduledAt).getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff > 0 && daysDiff <= 8) xpToAward += STREAK_BONUS_XP;
        }
        awardPromises.push(awardXP(studentProfile.userId, xpToAward, prisma));
      }

      if (tutorProfile) {
        awardPromises.push(awardTutorXP(tutorProfile.userId, TUTOR_SESSION_XP, prisma));
      }

      await Promise.all(awardPromises);
    } catch (err) {
      console.error('Error awarding session completion rewards:', err);
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

  // Only participants or admin can view session details
  if (req.user!.role === 'STUDENT') {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile || profile.id !== session.studentProfileId) { res.status(403).json({ error: 'Forbidden' }); return; }
  } else if (req.user!.role === 'TUTOR') {
    const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!tutor || tutor.id !== session.tutorProfileId) { res.status(403).json({ error: 'Forbidden' }); return; }
  }

  res.json(session);
});
