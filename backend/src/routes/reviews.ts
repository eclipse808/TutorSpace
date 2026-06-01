import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { awardTutorXP, TUTOR_REVIEW_XP } from '../utils/xp';
import { checkAndAwardAchievements } from '../utils/achievements';

export const reviewsRouter = Router();

// GET /api/reviews?tutorProfileId=... (public)
reviewsRouter.get('/', async (req, res) => {
  const { tutorProfileId } = req.query;
  if (!tutorProfileId) { res.status(400).json({ error: 'tutorProfileId required' }); return; }

  const reviews = await prisma.review.findMany({
    where: { tutorProfileId: tutorProfileId as string },
    include: {
      studentProfile: { include: { user: { select: { id: true, name: true, avatar: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(reviews);
});

// GET /api/reviews/mine — student's own reviews
reviewsRouter.get('/mine', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'STUDENT') { res.status(403).json({ error: 'Forbidden' }); return; }
  const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }

  const reviews = await prisma.review.findMany({
    where: { studentProfileId: profile.id },
    include: {
      tutorProfile: { include: { user: { select: { id: true, name: true, avatar: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(reviews);
});

// GET /api/reviews/received — tutor's received reviews
reviewsRouter.get('/received', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Forbidden' }); return; }
  const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
  if (!tutor) { res.status(404).json({ error: 'Profile not found' }); return; }

  const reviews = await prisma.review.findMany({
    where: { tutorProfileId: tutor.id },
    include: {
      studentProfile: { include: { user: { select: { id: true, name: true, avatar: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(reviews);
});

// POST /api/reviews — student leaves review (one per tutor)
reviewsRouter.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'STUDENT') { res.status(403).json({ error: 'Only students can leave reviews' }); return; }
  const { tutorProfileId, sessionId, rating, text } = req.body;
  if (!tutorProfileId || !rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'tutorProfileId and rating (1-5) required' }); return;
  }
  if (text && text.length > 3000) {
    res.status(400).json({ error: 'Текст отзыва не может быть длиннее 3000 символов' }); return;
  }

  try {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }

    // One review per student per tutor
    const existingReview = await prisma.review.findUnique({
      where: { studentProfileId_tutorProfileId: { studentProfileId: profile.id, tutorProfileId } },
    });
    if (existingReview) { res.status(400).json({ error: 'Вы уже оставили отзыв этому репетитору' }); return; }

    // Check if session exists, is completed, and belongs to the reviewed tutor
    if (sessionId) {
      const session = await prisma.session.findFirst({
        where: { id: sessionId, studentProfileId: profile.id, tutorProfileId, status: 'COMPLETED' },
      });
      if (!session) { res.status(400).json({ error: 'Session not found or not completed' }); return; }
    }

    const review = await prisma.review.create({
      data: { tutorProfileId, studentProfileId: profile.id, sessionId: sessionId || null, rating: Number(rating), text },
      include: {
        studentProfile: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      },
    });

    // Update tutor's rating and reviewCount using aggregation (avoids manual calculation race condition)
    const agg = await prisma.review.aggregate({
      where: { tutorProfileId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const updatedTutor = await prisma.tutorProfile.update({
      where: { id: tutorProfileId },
      data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count.rating },
      select: { userId: true },
    });

    await awardTutorXP(updatedTutor.userId, TUTOR_REVIEW_XP, prisma);

    // Check if student earned "Первый отзыв" achievement
    await checkAndAwardAchievements(profile.id, prisma, req.user!.id);

    res.status(201).json(review);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      res.status(400).json({ error: 'Вы уже оставили отзыв этому репетитору' });
    } else {
      console.error('Review POST error:', err);
      res.status(500).json({ error: 'Ошибка сервера при сохранении отзыва' });
    }
  }
});

// DELETE /api/reviews/:id — student deletes own review, admin deletes any
reviewsRouter.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) { res.status(404).json({ error: 'Review not found' }); return; }

    if (req.user!.role === 'STUDENT') {
      const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
      if (!profile || review.studentProfileId !== profile.id) {
        res.status(403).json({ error: 'Forbidden' }); return;
      }
    } else if (req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    const { tutorProfileId } = review;
    await prisma.review.delete({ where: { id: req.params.id } });

    // Recalculate tutor rating using aggregation
    const agg = await prisma.review.aggregate({
      where: { tutorProfileId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.tutorProfile.update({
      where: { id: tutorProfileId },
      data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count.rating },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Review DELETE error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /api/reviews/:id/reply — tutor replies
reviewsRouter.put('/:id/reply', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Forbidden' }); return; }
  const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
  if (!tutor) { res.status(404).json({ error: 'Profile not found' }); return; }

  const review = await prisma.review.findFirst({ where: { id: req.params.id, tutorProfileId: tutor.id } });
  if (!review) { res.status(404).json({ error: 'Review not found' }); return; }

  const updated = await prisma.review.update({
    where: { id: req.params.id },
    data: { tutorReply: req.body.tutorReply },
    include: {
      studentProfile: { include: { user: { select: { id: true, name: true, avatar: true } } } },
    },
  });
  res.json(updated);
});
