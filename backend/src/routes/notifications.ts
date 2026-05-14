import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

// GET /notifications — own notifications
notificationsRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /notifications/unread-count
notificationsRouter.get('/unread-count', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await prisma.notification.count({ where: { userId: req.user!.id, read: false } });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /notifications/read-all
notificationsRouter.put('/read-all', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /notifications/:id/read
notificationsRouter.put('/:id/read', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const n = await prisma.notification.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!n) { res.status(404).json({ error: 'Not found' }); return; }
    const updated = await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /notifications/:id
notificationsRouter.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.deleteMany({ where: { id: req.params.id, userId: req.user!.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
