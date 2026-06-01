import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const progressRouter = Router();
progressRouter.use(authenticate);

async function resolveStudentProfileId(req: AuthRequest): Promise<string | null> {
  if (req.user!.role === 'STUDENT') {
    const p = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } });
    return p?.id || null;
  }
  return (req.query.studentProfileId as string) || null;
}

progressRouter.get('/my-tutors', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentProfileId = await resolveStudentProfileId(req);
    if (!studentProfileId) { res.status(404).json({ error: 'Student profile not found' }); return; }
    const sessions = await prisma.session.findMany({
      where: { studentProfileId, status: 'COMPLETED' },
      include: { tutorProfile: { include: { user: { select: { id: true, name: true, avatar: true } } } } },
      distinct: ['tutorProfileId'],
    });
    res.json(sessions.map((s) => ({ ...s.tutorProfile, subject: s.subject })));
  } catch (err) { console.error('My-tutors error:', err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

progressRouter.get('/radar', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tutorProfileId, period, subject } = req.query;
    if (!tutorProfileId) { res.status(400).json({ error: 'tutorProfileId required' }); return; }
    const studentProfileId = await resolveStudentProfileId(req);
    if (!studentProfileId) { res.status(404).json({ error: 'Student profile not found' }); return; }

    const criteria = await prisma.competencyCriteria.findMany({
      where: { tutorProfileId: tutorProfileId as string, ...(subject ? { subject: subject as string } : {}) },
      orderBy: [{ subject: 'asc' }, { orderIndex: 'asc' }],
    });
    const criteriaIds = criteria.map((c) => c.id);
    const allScores = await prisma.competencyScore.findMany({
      where: { studentProfileId, criteriaId: { in: criteriaIds } },
      orderBy: { scoredAt: 'asc' },
    });

    const now = new Date();
    let periodMs: number | null = null;
    if (period === 'week') periodMs = 7 * 24 * 60 * 60 * 1000;
    else if (period === 'month') periodMs = 30 * 24 * 60 * 60 * 1000;

    const currentScores: Record<string, number> = {};
    const previousScores: Record<string, number> = {};
    for (const cId of criteriaIds) {
      const cs = allScores.filter((s) => s.criteriaId === cId);
      if (periodMs) {
        const periodStart = new Date(now.getTime() - periodMs);
        const prevStart   = new Date(periodStart.getTime() - periodMs);
        const current  = cs.filter((s) => s.scoredAt >= periodStart);
        const previous = cs.filter((s) => s.scoredAt >= prevStart && s.scoredAt < periodStart);
        if (current.length)  currentScores[cId]  = current[current.length - 1].score;
        if (previous.length) previousScores[cId] = previous[previous.length - 1].score;
      } else {
        if (cs.length) currentScores[cId] = cs[cs.length - 1].score;
      }
    }
    res.json({ criteria, currentScores, previousScores });
  } catch (err) { console.error('Radar error:', err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

progressRouter.get('/history', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tutorProfileId, subject } = req.query;
    const studentProfileId = await resolveStudentProfileId(req);
    if (!studentProfileId) { res.status(404).json({ error: 'Student profile not found' }); return; }

    let tutorIds: string[] = [];
    if (tutorProfileId) {
      tutorIds = [tutorProfileId as string];
    } else {
      const sessions = await prisma.session.findMany({
        where: { studentProfileId, status: 'COMPLETED' },
        select: { tutorProfileId: true }, distinct: ['tutorProfileId'],
      });
      tutorIds = sessions.map((s) => s.tutorProfileId);
    }
    if (tutorIds.length === 0) { res.json({ criteria: [], history: [] }); return; }

    const criteria = await prisma.competencyCriteria.findMany({
      where: { tutorProfileId: { in: tutorIds }, ...(subject ? { subject: subject as string } : {}) },
      orderBy: [{ subject: 'asc' }, { orderIndex: 'asc' }],
    });
    const scores = await prisma.competencyScore.findMany({
      where: { studentProfileId, criteriaId: { in: criteria.map((c) => c.id) } },
      orderBy: { scoredAt: 'asc' },
    });

    const byDate: Record<string, Record<string, number>> = {};
    for (const s of scores) {
      const day = s.scoredAt.toISOString().split('T')[0];
      if (!byDate[day]) byDate[day] = {};
      byDate[day][s.criteriaId] = s.score;
    }
    res.json({ criteria, history: Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, s]) => ({ date, scores: s })) });
  } catch (err) { console.error('History error:', err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

progressRouter.get('/achievements', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentProfileId = await resolveStudentProfileId(req);
    if (!studentProfileId) { res.status(404).json({ error: 'Student profile not found' }); return; }
    const all    = await prisma.achievement.findMany({ orderBy: { type: 'asc' } });
    const earned = await prisma.studentAchievement.findMany({ where: { studentProfileId }, include: { achievement: true }, orderBy: { earnedAt: 'desc' } });
    const earnedIds = new Set(earned.map((e) => e.achievementId));
    res.json({ all, earned: earned.map((e) => ({ ...e.achievement, earnedAt: e.earnedAt })), locked: all.filter((a) => !earnedIds.has(a.id)) });
  } catch (err) { console.error('Achievements error:', err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

progressRouter.get('/by-subject', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentProfileId = await resolveStudentProfileId(req);
    if (!studentProfileId) { res.status(404).json({ error: 'Student profile not found' }); return; }
    const { tutorProfileId } = req.query;

    const sessions = await prisma.session.findMany({
      where: { studentProfileId, ...(tutorProfileId ? { tutorProfileId: tutorProfileId as string } : {}) },
      select: { tutorProfileId: true, subject: true },
    });
    const tutorIds = tutorProfileId ? [tutorProfileId as string] : [...new Set(sessions.map((s) => s.tutorProfileId))];
    const sessionSubjects = new Set(sessions.map((s) => s.subject));
    if (tutorIds.length === 0) { res.json({}); return; }

    const criteria  = await prisma.competencyCriteria.findMany({ where: { tutorProfileId: { in: tutorIds } }, orderBy: [{ subject: 'asc' }, { orderIndex: 'asc' }] });
    const criteriaIds = criteria.map((c) => c.id);
    const allScores = await prisma.competencyScore.findMany({ where: { studentProfileId, criteriaId: { in: criteriaIds } }, orderBy: { scoredAt: 'asc' } });
    const scoredCriteriaIds = new Set(allScores.map((s) => s.criteriaId));

    const currentScores: Record<string, number> = {};
    const currentNotes: Record<string, string>  = {};
    for (const cId of criteriaIds) {
      const cs = allScores.filter((s) => s.criteriaId === cId);
      if (cs.length) { const latest = cs[cs.length - 1]; currentScores[cId] = latest.score; if (latest.note) currentNotes[cId] = latest.note; }
    }

    const subjectMap: Record<string, { criteria: typeof criteria; currentScores: Record<string, number>; currentNotes: Record<string, string> }> = {};
    for (const c of criteria) {
      if (!sessionSubjects.has(c.subject) && !scoredCriteriaIds.has(c.id)) continue;
      if (!subjectMap[c.subject]) subjectMap[c.subject] = { criteria: [], currentScores: {}, currentNotes: {} };
      subjectMap[c.subject].criteria.push(c);
      if (currentScores[c.id] !== undefined) subjectMap[c.subject].currentScores[c.id] = currentScores[c.id];
      if (currentNotes[c.id]) subjectMap[c.subject].currentNotes[c.id] = currentNotes[c.id];
    }
    res.json(subjectMap);
  } catch (err) { console.error('By-subject error:', err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

progressRouter.get('/activity', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentProfileId = await resolveStudentProfileId(req);
    if (!studentProfileId) { res.status(404).json({ error: 'Student profile not found' }); return; }

    // Build last 12 Monday-to-Sunday week buckets
    const now = new Date();
    const weeks: { start: Date; end: Date; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const pivot = new Date(now);
      pivot.setDate(pivot.getDate() - i * 7);
      const dow = pivot.getDay(); // 0=Sun
      const toMonday = dow === 0 ? -6 : 1 - dow;
      const monday = new Date(pivot);
      monday.setDate(pivot.getDate() + toMonday);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      weeks.push({ start: monday, end: sunday, label: monday.toISOString().split('T')[0] });
    }

    const sessions = await prisma.session.findMany({
      where: {
        studentProfileId,
        status: 'COMPLETED',
        scheduledAt: { gte: weeks[0].start, lte: weeks[weeks.length - 1].end },
      },
      select: { scheduledAt: true },
    });

    const result = weeks.map((w) => ({
      week: w.label,
      count: sessions.filter((s) => s.scheduledAt >= w.start && s.scheduledAt <= w.end).length,
    }));

    res.json(result);
  } catch (err) { console.error('Activity error:', err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

progressRouter.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentProfileId = await resolveStudentProfileId(req);
    if (!studentProfileId) { res.status(404).json({ error: 'Student profile not found' }); return; }
    const [totalSessions, upcomingSessions, achievementsCount, scoreGroups, studentProfile] = await Promise.all([
      prisma.session.count({ where: { studentProfileId, status: 'COMPLETED' } }),
      prisma.session.count({ where: { studentProfileId, status: 'SCHEDULED' } }),
      prisma.studentAchievement.count({ where: { studentProfileId } }),
      prisma.competencyScore.groupBy({ by: ['criteriaId'], where: { studentProfileId }, _max: { score: true } }),
      prisma.studentProfile.findUnique({ where: { id: studentProfileId }, include: { user: { select: { xp: true, level: true } } } }),
    ]);
    const avgScore = scoreGroups.length ? scoreGroups.reduce((sum: number, s) => sum + Number(s._max.score ?? 0), 0) / scoreGroups.length : 0;
    res.json({ totalSessions, upcomingSessions, achievementsCount, avgScore: Math.round(avgScore * 10) / 10, xp: studentProfile?.user.xp ?? 0, level: studentProfile?.user.level ?? 1 });
  } catch (err) { console.error('Stats error:', err); res.status(500).json({ error: 'Ошибка сервера' }); }
});
