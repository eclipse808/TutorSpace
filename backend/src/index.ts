import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth';
import { tutorsRouter } from './routes/tutors';
import { sessionsRouter } from './routes/sessions';
import { competenciesRouter } from './routes/competencies';
import { progressRouter } from './routes/progress';
import { uploadRouter } from './routes/upload';
import { adminRouter } from './routes/admin';
import { goalsRouter } from './routes/goals';
import { reviewsRouter } from './routes/reviews';
import { studentsRouter } from './routes/students';
import { subjectRequestsRouter } from './routes/subjectRequests';
import { notificationsRouter } from './routes/notifications';
import { chatRouter } from './routes/chat';

const app = express();

// Restrict CORS to the configured frontend origin (set CORS_ORIGIN in production)
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static('/app/uploads'));

// Rate limiting — защита от брутфорса и спама
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 минут
  max: 10,                    // не более 10 попыток входа/регистрации с одного IP
  message: { error: 'Слишком много попыток. Попробуйте через 15 минут.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 минута
  max: 120,                   // не более 120 запросов в минуту
  message: { error: 'Слишком много запросов. Замедлите активность.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api',               apiLimiter);

app.use('/api/auth', authRouter);
app.use('/api/tutors', tutorsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/competencies', competenciesRouter);
app.use('/api/progress', progressRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/admin', adminRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/students', studentsRouter);
app.use('/api/subject-requests', subjectRequestsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/chat', chatRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
