import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const tutorsRouter = Router();

tutorsRouter.get('/', async (req, res) => {
  const { subject, search, minRate, maxRate, minRating } = req.query;
  const tutors = await prisma.tutorProfile.findMany({
    where: {
      status: 'APPROVED',
      ...(subject ? { subjects: { has: subject as string } } : {}),
      ...(search ? { user: { name: { contains: search as string, mode: 'insensitive' } } } : {}),
      ...(minRate || maxRate ? {
        hourlyRate: {
          ...(minRate ? { gte: Number(minRate) } : {}),
          ...(maxRate ? { lte: Number(maxRate) } : {}),
        },
      } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true, xp: true, createdAt: true } },
      _count: { select: { reviews: true } },
    },
    orderBy: { rating: 'desc' },
  });

  // Real ratings from actual reviews
  const ratingAgg = await prisma.review.groupBy({
    by: ['tutorProfileId'],
    _avg: { rating: true },
    where: { tutorProfileId: { in: tutors.map((t) => t.id) } },
  });
  const ratingMap = new Map(ratingAgg.map((r) => [r.tutorProfileId, r._avg.rating ?? 0]));

  const result = tutors.map(({ _count, ...t }) => ({
    ...t,
    reviewCount: _count.reviews,
    rating: Math.round((ratingMap.get(t.id) ?? 0) * 10) / 10,
  }));

  // Apply minRating filter on real rating (post-compute)
  const filtered = minRating ? result.filter((t) => t.rating >= Number(minRating)) : result;
  res.json(filtered);
});

tutorsRouter.put('/setup', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Forbidden' }); return; }
  const { subjects, hourlyRate, experience, bio, education } = req.body;
  const tutor = await prisma.tutorProfile.update({
    where: { userId: req.user!.id },
    data: { subjects, hourlyRate: Number(hourlyRate), experience: Number(experience), bio, education, status: 'PENDING' },
  });
  res.json(tutor);
});

tutorsRouter.get('/subjects', async (_req, res) => {
  const tutors = await prisma.tutorProfile.findMany({ where: { status: 'APPROVED' }, select: { subjects: true } });
  const all = new Set(tutors.flatMap((t) => t.subjects));
  res.json([...all].sort());
});

tutorsRouter.get('/me/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Forbidden' }); return; }
  const tutor = await prisma.tutorProfile.findUnique({
    where: { userId: req.user!.id },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true, xp: true, level: true, createdAt: true } },
      _count: { select: { reviews: true } },
    },
  });
  if (!tutor) { res.status(404).json({ error: 'Not found' }); return; }

  const ratingAgg = await prisma.review.aggregate({
    where: { tutorProfileId: tutor.id },
    _avg: { rating: true },
  });

  const { _count, ...rest } = tutor;
  res.json({
    ...rest,
    reviewCount: _count.reviews,
    rating: Math.round((ratingAgg._avg.rating ?? 0) * 10) / 10,
  });
});

tutorsRouter.get('/me/stats', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Forbidden' }); return; }
  const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
  if (!tutor) { res.status(404).json({ error: 'Tutor not found' }); return; }

  const completedSessions = await prisma.session.count({
    where: { tutorProfileId: tutor.id, status: 'COMPLETED' },
  });

  res.json({ completedSessions });
});

tutorsRouter.get('/me/students', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Forbidden' }); return; }
  const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
  if (!tutor) { res.status(404).json({ error: 'Tutor profile not found' }); return; }

  const sessions = await prisma.session.findMany({
    where: { tutorProfileId: tutor.id },
    include: { studentProfile: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } } },
    distinct: ['studentProfileId'],
  });

  const students = sessions.map((s) => s.studentProfile);
  const unique = [...new Map(students.map((s) => [s.id, s])).values()];
  res.json(unique);
});

// PUT /tutors/me/hourly-rate — instant price update (no admin review)
tutorsRouter.put('/me/hourly-rate', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Forbidden' }); return; }
  const { hourlyRate } = req.body;
  if (hourlyRate === undefined || isNaN(Number(hourlyRate))) {
    res.status(400).json({ error: 'hourlyRate required' }); return;
  }
  try {
    const tutor = await prisma.tutorProfile.update({
      where: { userId: req.user!.id },
      data: { hourlyRate: Number(hourlyRate) },
    });
    res.json({ hourlyRate: tutor.hourlyRate });
  } catch (err) {
    console.error('HourlyRate update error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /tutors/me/profile-change — submit bio/education/experience for admin review
tutorsRouter.post('/me/profile-change', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Forbidden' }); return; }
  const { bio, education, experience } = req.body;
  if (!bio && !education && experience === undefined) {
    res.status(400).json({ error: 'Нет данных для изменения' }); return;
  }
  try {
    const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!tutor) { res.status(404).json({ error: 'Профиль не найден' }); return; }

    // Cancel previous pending request if any
    await prisma.profileChangeRequest.updateMany({
      where: { tutorProfileId: tutor.id, status: 'PENDING' },
      data: { status: 'REJECTED', adminNote: 'Заменено новой заявкой', reviewedAt: new Date() },
    });

    const request = await prisma.profileChangeRequest.create({
      data: {
        tutorProfileId: tutor.id,
        bio: bio || null,
        education: education || null,
        experience: experience !== undefined ? Number(experience) : null,
      },
    });
    res.status(201).json(request);
  } catch (err) {
    console.error('ProfileChange error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /tutors/me/profile-change — get current pending request
tutorsRouter.get('/me/profile-change', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Forbidden' }); return; }
  try {
    const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!tutor) { res.status(404).json({ error: 'Not found' }); return; }
    const pending = await prisma.profileChangeRequest.findFirst({
      where: { tutorProfileId: tutor.id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Busy slots for a tutor on a given date (no auth required — public info for booking)
tutorsRouter.get('/:id/slots', async (req, res) => {
  const { date } = req.query;
  if (!date) { res.status(400).json({ error: 'date required (YYYY-MM-DD)' }); return; }

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

  const sessions = await prisma.session.findMany({
    where: {
      tutorProfileId: req.params.id,
      status: { not: 'CANCELLED' },
      scheduledAt: { gte: dayStart, lte: dayEnd },
    },
    select: { scheduledAt: true, duration: true },
  });

  // Return set of busy hours (0-23)
  const busyHours = new Set<number>();
  sessions.forEach((s) => {
    const startHour = new Date(s.scheduledAt).getHours();
    const hoursNeeded = Math.ceil(s.duration / 60);
    for (let i = 0; i < hoursNeeded; i++) {
      busyHours.add(startHour + i);
    }
  });

  res.json([...busyHours]);
});

tutorsRouter.get('/:id', async (req, res) => {
  const [tutor, completedSessions, ratingAgg] = await Promise.all([
    prisma.tutorProfile.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true, xp: true, createdAt: true } },
        _count: { select: { reviews: true } },
      },
    }),
    prisma.session.count({ where: { tutorProfileId: req.params.id, status: 'COMPLETED' } }),
    prisma.review.aggregate({
      where: { tutorProfileId: req.params.id },
      _avg: { rating: true },
    }),
  ]);
  if (!tutor) { res.status(404).json({ error: 'Not found' }); return; }

  const { _count, ...rest } = tutor;
  res.json({
    ...rest,
    reviewCount: _count.reviews,
    rating: Math.round((ratingAgg._avg.rating ?? 0) * 10) / 10,
    completedSessions,
  });
});
