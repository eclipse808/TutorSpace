import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const adminRouter = Router();

adminRouter.use(authenticate);

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = (req as AuthRequest).user?.role;
  if (role !== 'ADMIN') { res.status(403).json({ error: 'Admin only' }); return; }
  next();
}

// Helper: write an audit log entry
async function log(adminId: string, action: string, targetType: string, targetId: string, targetName: string, details?: string) {
  try {
    await prisma.adminLog.create({ data: { adminId, action, targetType, targetId, targetName, details: details || null } });
  } catch (e) {
    console.error('Audit log write failed:', e);
  }
}

// ── Tutors ────────────────────────────────────────────────────────────────────

adminRouter.get('/tutors/pending', requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const tutors = await prisma.tutorProfile.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { id: true, name: true, email: true, avatar: true, createdAt: true } } },
      orderBy: { user: { createdAt: 'desc' } },
    });
    res.json(tutors);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

adminRouter.get('/tutors/all', requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const tutors = await prisma.tutorProfile.findMany({
      include: { user: { select: { id: true, name: true, email: true, avatar: true, createdAt: true } } },
      orderBy: { user: { createdAt: 'desc' } },
    });
    res.json(tutors);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

adminRouter.put('/tutors/:id/approve', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as AuthRequest).user!.id;
    const tutor = await prisma.tutorProfile.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    await log(adminId, 'TUTOR_APPROVED', 'TUTOR', req.params.id, tutor.user.name);
    res.json(tutor);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

adminRouter.put('/tutors/:id/reject', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as AuthRequest).user!.id;
    const tutor = await prisma.tutorProfile.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    await log(adminId, 'TUTOR_REJECTED', 'TUTOR', req.params.id, tutor.user.name);
    res.json(tutor);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

adminRouter.put('/tutors/:id/suspend', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as AuthRequest).user!.id;
    const tutor = await prisma.tutorProfile.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!tutor) { res.status(404).json({ error: 'Not found' }); return; }

    const reason = (req as AuthRequest).body?.reason || '';
    const [updated] = await Promise.all([
      prisma.tutorProfile.update({
        where: { id: req.params.id },
        data: { status: 'PENDING' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.notification.create({
        data: {
          userId: tutor.user.id,
          type: 'WARNING',
          title: 'Ваш профиль приостановлен',
          message: `Ваш аккаунт репетитора отправлен на повторное рассмотрение.${reason ? ` Причина: ${reason}` : ' Свяжитесь с администратором для уточнения.'}`,
          link: '/tutor/pending',
        },
      }),
    ]);
    await log(adminId, 'TUTOR_SUSPENDED', 'TUTOR', req.params.id, tutor.user.name, reason || undefined);
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// ── Profile change requests ───────────────────────────────────────────────────

adminRouter.get('/profile-changes', requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const requests = await prisma.profileChangeRequest.findMany({
      where: { status: 'PENDING' },
      include: { tutorProfile: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

adminRouter.put('/profile-changes/:id/approve', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as AuthRequest).user!.id;
    const change = await prisma.profileChangeRequest.findUnique({
      where: { id: req.params.id },
      include: { tutorProfile: { include: { user: { select: { id: true, name: true } } } } },
    });
    if (!change) { res.status(404).json({ error: 'Not found' }); return; }

    const updateData: Record<string, any> = {};
    if (change.bio !== null) updateData.bio = change.bio;
    if (change.education !== null) updateData.education = change.education;
    if (change.experience !== null) updateData.experience = change.experience;

    const [updated] = await Promise.all([
      prisma.profileChangeRequest.update({
        where: { id: req.params.id },
        data: { status: 'APPROVED', reviewedAt: new Date(), adminNote: req.body?.adminNote || null },
      }),
      prisma.tutorProfile.update({ where: { id: change.tutorProfileId }, data: updateData }),
      prisma.notification.create({
        data: { userId: change.tutorProfile.userId, type: 'SUCCESS', title: 'Изменения профиля одобрены', message: 'Ваши изменения профиля успешно применены.', link: '/tutor/dashboard' },
      }),
    ]);
    await log(adminId, 'PROFILE_APPROVED', 'PROFILE_CHANGE', req.params.id, change.tutorProfile.user.name);
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

adminRouter.put('/profile-changes/:id/reject', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as AuthRequest).user!.id;
    const change = await prisma.profileChangeRequest.findUnique({
      where: { id: req.params.id },
      include: { tutorProfile: { include: { user: { select: { id: true, name: true } } } } },
    });
    if (!change) { res.status(404).json({ error: 'Not found' }); return; }

    const adminNote = req.body?.adminNote || '';
    const [updated] = await Promise.all([
      prisma.profileChangeRequest.update({
        where: { id: req.params.id },
        data: { status: 'REJECTED', reviewedAt: new Date(), adminNote: adminNote || null },
      }),
      prisma.notification.create({
        data: { userId: change.tutorProfile.userId, type: 'WARNING', title: 'Изменения профиля отклонены', message: `Ваши изменения не одобрены.${adminNote ? ` Причина: ${adminNote}` : ''}`, link: '/tutor/dashboard' },
      }),
    ]);
    await log(adminId, 'PROFILE_REJECTED', 'PROFILE_CHANGE', req.params.id, change.tutorProfile.user.name, adminNote || undefined);
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});

// ── Audit log ─────────────────────────────────────────────────────────────────

adminRouter.get('/logs', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { admin: { select: { name: true } } },
      }),
      prisma.adminLog.count(),
    ]);
    res.json({ logs, total });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
});
