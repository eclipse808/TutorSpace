import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const chatRouter = Router();
chatRouter.use(authenticate);

const userSelect = {
  id: true, name: true, avatar: true, role: true,
  tutorProfile:   { select: { id: true, photoUrl: true } },
  studentProfile: { select: { id: true, photoUrl: true } },
};

function toPartner(u: any) {
  return {
    id:        u.id,
    name:      u.name,
    avatar:    u.avatar,
    role:      u.role,
    photoUrl:  u.tutorProfile?.photoUrl ?? u.studentProfile?.photoUrl ?? null,
    profileId: u.tutorProfile?.id ?? u.studentProfile?.id ?? null,
  };
}

// List conversations: unique partners with last message + unread count
chatRouter.get('/conversations', async (req: AuthRequest, res: Response): Promise<void> => {
  const myId = req.user!.id;
  const messages = await prisma.chatMessage.findMany({
    where: { OR: [{ fromUserId: myId }, { toUserId: myId }] },
    orderBy: { createdAt: 'desc' },
    include: {
      fromUser: { select: userSelect },
      toUser:   { select: userSelect },
    },
  });
  const convMap = new Map<string, { partner: any; lastMessage: any; unread: number }>();
  for (const m of messages) {
    const partnerId = m.fromUserId === myId ? m.toUserId : m.fromUserId;
    const partner   = toPartner(m.fromUserId === myId ? m.toUser : m.fromUser);
    if (!convMap.has(partnerId)) {
      convMap.set(partnerId, { partner, lastMessage: m, unread: 0 });
    }
    if (!m.read && m.toUserId === myId) {
      convMap.get(partnerId)!.unread++;
    }
  }
  res.json([...convMap.values()]);
});

// Messages thread with a specific user (also marks received as read)
chatRouter.get('/messages', async (req: AuthRequest, res: Response): Promise<void> => {
  const myId = req.user!.id;
  const { withUserId } = req.query;
  if (!withUserId) { res.status(400).json({ error: 'withUserId required' }); return; }
  const messages = await prisma.chatMessage.findMany({
    where: { OR: [
      { fromUserId: myId, toUserId: withUserId as string },
      { fromUserId: withUserId as string, toUserId: myId },
    ]},
    orderBy: { createdAt: 'asc' },
    include: { fromUser: { select: { id: true, name: true, avatar: true } } },
  });
  await prisma.chatMessage.updateMany({
    where: { fromUserId: withUserId as string, toUserId: myId, read: false },
    data: { read: true },
  });
  res.json(messages);
});

// Send a message
chatRouter.post('/messages', async (req: AuthRequest, res: Response): Promise<void> => {
  const myId = req.user!.id;
  const { toUserId, text } = req.body;
  if (!toUserId || !text?.trim()) { res.status(400).json({ error: 'toUserId and text required' }); return; }
  if (text.trim().length > 2000) { res.status(400).json({ error: 'Сообщение не может быть длиннее 2000 символов' }); return; }

  // Suspended (PENDING) tutors cannot send messages
  if (req.user!.role === 'TUTOR') {
    const tutor = await prisma.tutorProfile.findUnique({ where: { userId: myId }, select: { status: true } });
    if (!tutor || tutor.status !== 'APPROVED') {
      res.status(403).json({ error: 'Отстранённые репетиторы не могут отправлять сообщения' }); return;
    }
  }
  // Verify the target user exists
  const target = await prisma.user.findUnique({ where: { id: toUserId }, select: { id: true } });
  if (!target) { res.status(404).json({ error: 'User not found' }); return; }
  const message = await prisma.chatMessage.create({
    data: { fromUserId: myId, toUserId, text: text.trim() },
    include: { fromUser: { select: { id: true, name: true, avatar: true } } },
  });
  res.json(message);
});

// Basic user info for chat header (when no conversation exists yet)
chatRouter.get('/user/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.userId },
    select: userSelect,
  });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(toPartner(user));
});

// Unread count for navbar badge
chatRouter.get('/unread', async (req: AuthRequest, res: Response): Promise<void> => {
  const myId = req.user!.id;
  const count = await prisma.chatMessage.count({ where: { toUserId: myId, read: false } });
  res.json({ count });
});
