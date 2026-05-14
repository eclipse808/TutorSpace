import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const authRouter = Router();

const BCRYPT_ROUNDS = 8; // 10 rounds in Docker = 1-3s per request; 8 rounds ≈ 200ms

authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name || !role) {
      res.status(400).json({ error: 'Все поля обязательны' });
      return;
    }
    if (!['STUDENT', 'TUTOR'].includes(role)) {
      res.status(400).json({ error: 'Недопустимая роль' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
      return;
    }
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      res.status(400).json({ error: 'Этот email уже зарегистрирован' });
      return;
    }
    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashed,
        name: name.trim(),
        role,
        avatar: name.trim().split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
        ...(role === 'TUTOR'
          ? { tutorProfile: { create: { subjects: [], hourlyRate: 0, experience: 0 } } }
          : { studentProfile: { create: {} } }),
      },
      include: { tutorProfile: { select: { id: true, status: true } }, studentProfile: { select: { id: true } } },
    });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    const tutorStatus = user.tutorProfile?.status ?? null;
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar, xp: user.xp, level: user.level, tutorStatus },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email и пароль обязательны' });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { tutorProfile: { select: { status: true } } },
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    const tutorStatus = user.tutorProfile?.status ?? null;
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar, xp: user.xp, level: user.level, tutorStatus },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { tutorProfile: true, studentProfile: true },
    });
    if (!user) { res.status(404).json({ error: 'Not found' }); return; }
    const tutorStatus = user.tutorProfile?.status ?? null;
    res.json({
      id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar,
      xp: user.xp, level: user.level, tutorStatus,
      tutorProfile: user.tutorProfile, studentProfile: user.studentProfile,
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

authRouter.put('/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bio, subjects, hourlyRate, experience, education } = req.body;
    if (req.user!.role !== 'TUTOR') { res.status(403).json({ error: 'Forbidden' }); return; }
    const tutor = await prisma.tutorProfile.update({
      where: { userId: req.user!.id },
      data: { bio, subjects, hourlyRate, experience, education },
    });
    res.json(tutor);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
