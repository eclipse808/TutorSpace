import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const subjectRequestsRouter = Router();
subjectRequestsRouter.use(authenticate);

const storage = multer.diskStorage({
  destination: '/app/uploads',
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `cert-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

// POST /subject-requests — tutor submits a new request
subjectRequestsRouter.post('/', upload.single('certificate'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Tutor only' }); return; }
  const { subject, justification } = req.body;
  if (!subject || !justification) { res.status(400).json({ error: 'subject and justification required' }); return; }

  try {
    const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!tutor) { res.status(404).json({ error: 'Profile not found' }); return; }

    if (tutor.subjects.includes(subject)) {
      res.status(400).json({ error: 'Этот предмет уже есть в вашем профиле' }); return;
    }

    const existing = await prisma.subjectRequest.findFirst({
      where: { tutorProfileId: tutor.id, subject, status: 'PENDING' },
    });
    if (existing) { res.status(400).json({ error: 'Заявка на этот предмет уже отправлена и ожидает рассмотрения' }); return; }

    const certificateUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const request = await prisma.subjectRequest.create({
      data: { tutorProfileId: tutor.id, subject, justification, certificateUrl },
      include: { tutorProfile: { include: { user: { select: { id: true, name: true } } } } },
    });
    res.status(201).json(request);
  } catch (err) {
    console.error('SubjectRequest POST error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /subject-requests/mine — tutor sees own requests
subjectRequestsRouter.get('/mine', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Forbidden' }); return; }
  const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
  if (!tutor) { res.status(404).json({ error: 'Not found' }); return; }

  const requests = await prisma.subjectRequest.findMany({
    where: { tutorProfileId: tutor.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
});

// GET /subject-requests — admin sees all requests
subjectRequestsRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'ADMIN') { res.status(403).json({ error: 'Admin only' }); return; }
  const { status } = req.query;
  const requests = await prisma.subjectRequest.findMany({
    where: { ...(status ? { status: status as any } : {}) },
    include: {
      tutorProfile: {
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
});

// PUT /subject-requests/:id/approve — admin approves
subjectRequestsRouter.put('/:id/approve', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'ADMIN') { res.status(403).json({ error: 'Admin only' }); return; }
  try {
    const request = await prisma.subjectRequest.findUnique({ where: { id: req.params.id } });
    if (!request) { res.status(404).json({ error: 'Not found' }); return; }

    const tutor = await prisma.tutorProfile.findUnique({ where: { id: request.tutorProfileId } });
    if (!tutor) { res.status(404).json({ error: 'Tutor not found' }); return; }

    if (!tutor.subjects.includes(request.subject)) {
      await prisma.tutorProfile.update({
        where: { id: tutor.id },
        data: { subjects: [...tutor.subjects, request.subject] },
      });
    }

    const [updated] = await Promise.all([
      prisma.subjectRequest.update({
        where: { id: req.params.id },
        data: { status: 'APPROVED', reviewedAt: new Date(), adminNote: req.body.adminNote || null },
        include: { tutorProfile: { include: { user: { select: { id: true, name: true, email: true } } } } },
      }),
      prisma.notification.create({
        data: {
          userId: tutor.userId,
          type: 'SUCCESS',
          title: 'Заявка на предмет одобрена',
          message: `Предмет «${request.subject}» добавлен в ваш профиль.${req.body.adminNote ? ` Комментарий: ${req.body.adminNote}` : ''}`,
          link: '/tutor/dashboard',
        },
      }),
    ]);

    res.json(updated);
  } catch (err) {
    console.error('SubjectRequest approve error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /subject-requests/:id/reject — admin rejects
subjectRequestsRouter.put('/:id/reject', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'ADMIN') { res.status(403).json({ error: 'Admin only' }); return; }
  try {
    const request = await prisma.subjectRequest.findUnique({
      where: { id: req.params.id },
      include: { tutorProfile: { select: { userId: true } } },
    });
    if (!request) { res.status(404).json({ error: 'Not found' }); return; }

    const adminNote = req.body.adminNote || '';
    const [updated] = await Promise.all([
      prisma.subjectRequest.update({
        where: { id: req.params.id },
        data: { status: 'REJECTED', reviewedAt: new Date(), adminNote: adminNote || null },
        include: { tutorProfile: { include: { user: { select: { id: true, name: true, email: true } } } } },
      }),
      prisma.notification.create({
        data: {
          userId: request.tutorProfile.userId,
          type: 'ERROR',
          title: 'Заявка на предмет отклонена',
          message: `Предмет «${request.subject}» не добавлен.${adminNote ? ` Причина: ${adminNote}` : ' Обратитесь к администратору за уточнениями.'}`,
          link: '/tutor/dashboard',
        },
      }),
    ]);

    res.json(updated);
  } catch (err) {
    console.error('SubjectRequest reject error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
