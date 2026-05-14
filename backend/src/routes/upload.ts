import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

export const uploadRouter = Router();

const storage = multer.diskStorage({
  destination: '/app/uploads',
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    cb(null, allowed);
  },
});

// POST /upload/photo — update profile photo for TUTOR or STUDENT
uploadRouter.post('/photo', authenticate, upload.single('photo'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: 'Файл не загружен' }); return; }
  const photoUrl = `/uploads/${req.file.filename}`;

  try {
    if (req.user!.role === 'TUTOR') {
      await prisma.tutorProfile.update({ where: { userId: req.user!.id }, data: { photoUrl } });
    } else if (req.user!.role === 'STUDENT') {
      await prisma.studentProfile.update({ where: { userId: req.user!.id }, data: { photoUrl } });
    } else {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    res.json({ photoUrl });
  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /upload/certs — upload tutor certificates (stored in TutorProfile.certificateUrls)
uploadRouter.post('/certs', authenticate, upload.array('certificates', 5), async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Forbidden' }); return; }
  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length === 0) { res.status(400).json({ error: 'Файлы не загружены' }); return; }

  try {
    const urls = files.map((f) => `/uploads/${f.filename}`);
    const tutor = await prisma.tutorProfile.findUnique({ where: { userId: req.user!.id } });
    if (!tutor) { res.status(404).json({ error: 'Профиль не найден' }); return; }

    await prisma.tutorProfile.update({
      where: { id: tutor.id },
      data: { certificateUrls: [...tutor.certificateUrls, ...urls].slice(0, 10) },
    });
    res.json({ urls });
  } catch (err) {
    console.error('Certs upload error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
