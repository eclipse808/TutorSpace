import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('/app/uploads'));

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

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
