import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkAndAwardAchievements } from '../utils/achievements';

export const competenciesRouter = Router();

competenciesRouter.use(authenticate);

// --- Criteria CRUD (tutor only) ---

competenciesRouter.get('/criteria', async (req: AuthRequest, res: Response): Promise<void> => {
  const { tutorId } = req.query;
  let tutorProfileId: string | undefined;

  if (tutorId) {
    tutorProfileId = tutorId as string;
  } else if (req.user!.role === 'TUTOR') {
    const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
    tutorProfileId = tutor?.id;
  }

  if (!tutorProfileId) { res.status(400).json({ error: 'Tutor ID required' }); return; }

  const criteria = await prisma.competencyCriteria.findMany({
    where: { tutorProfileId },
    orderBy: [{ subject: 'asc' }, { orderIndex: 'asc' }],
  });
  res.json(criteria);
});

competenciesRouter.post('/criteria', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Forbidden' }); return; }
  const { name, subject, description } = req.body;
  const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
  if (!tutor) { res.status(404).json({ error: 'Tutor profile not found' }); return; }

  const count = await prisma.competencyCriteria.count({ where: { tutorProfileId: tutor.id, subject } });
  const criterion = await prisma.competencyCriteria.create({
    data: { tutorProfileId: tutor.id, name, subject, description, orderIndex: count },
  });
  res.status(201).json(criterion);
});

competenciesRouter.put('/criteria/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Forbidden' }); return; }
  const { name, subject, description } = req.body;
  const criterion = await prisma.competencyCriteria.update({
    where: { id: req.params.id },
    data: { name, subject, description },
  });
  res.json(criterion);
});

competenciesRouter.delete('/criteria/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Forbidden' }); return; }
  await prisma.competencyCriteria.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// --- Evaluation (submit scores) ---

competenciesRouter.post('/evaluate', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Forbidden' }); return; }
  const { sessionId, studentProfileId, scores } = req.body as {
    sessionId: string;
    studentProfileId: string;
    scores: { criteriaId: string; score: number; note?: string }[];
  };

  if (!scores?.length) { res.status(400).json({ error: 'Scores required' }); return; }

  const now = new Date();
  await prisma.competencyScore.createMany({
    data: scores.map((s) => ({
      studentProfileId,
      criteriaId: s.criteriaId,
      sessionId,
      score: Math.min(10, Math.max(0, s.score)),
      note: s.note || null,
      scoredAt: now,
    })),
  });

  const newAchievements = await checkAndAwardAchievements(studentProfileId, prisma);

  const earnedAchievements = newAchievements.length
    ? await prisma.achievement.findMany({ where: { id: { in: newAchievements } } })
    : [];

  res.json({ success: true, newAchievements: earnedAchievements });
});

// --- Scores for a student (tutor viewing) ---

competenciesRouter.get('/scores/:studentProfileId', async (req: AuthRequest, res: Response): Promise<void> => {
  const { tutorId } = req.query;
  let tutorProfileId: string | undefined;

  if (tutorId) {
    tutorProfileId = tutorId as string;
  } else if (req.user!.role === 'TUTOR') {
    const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
    tutorProfileId = tutor?.id;
  }

  const where = tutorProfileId
    ? { studentProfileId: req.params.studentProfileId, criteria: { tutorProfileId } }
    : { studentProfileId: req.params.studentProfileId };

  const scores = await prisma.competencyScore.findMany({
    where,
    include: { criteria: true },
    orderBy: { scoredAt: 'asc' },
  });
  res.json(scores);
});
