export type Role = 'STUDENT' | 'TUTOR' | 'ADMIN';
export type SessionStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type AchievementType = 'SCORE_MILESTONE' | 'ATTENDANCE' | 'STREAK' | 'SPECIAL';
export type TutorStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type GoalDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type SubjectRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string;
  xp?: number;
  level?: number;
  tutorStatus?: TutorStatus | null;
  tutorProfile?: TutorProfile;
  studentProfile?: StudentProfile;
}

export interface TutorProfile {
  id: string;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'email' | 'avatar'> & { xp?: number; createdAt?: string };
  bio?: string;
  subjects: string[];
  hourlyRate?: number;
  experience?: number;
  rating: number;
  reviewCount: number;
  photoUrl?: string;
  education?: string;
  status?: TutorStatus;
  criteria?: CompetencyCriteria[];
}

export interface StudentProfile {
  id: string;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
  photoUrl?: string;
  grade?: string;
}

export interface Session {
  id: string;
  tutorProfileId: string;
  studentProfileId: string;
  scheduledAt: string;
  duration: number;
  subject: string;
  status: SessionStatus;
  notes?: string;
  createdAt: string;
  tutorProfile?: TutorProfile;
  studentProfile?: StudentProfile;
  competencyScores?: CompetencyScore[];
}

export interface CompetencyCriteria {
  id: string;
  tutorProfileId: string;
  name: string;
  subject: string;
  description?: string;
  orderIndex: number;
}

export interface CompetencyScore {
  id: string;
  studentProfileId: string;
  criteriaId: string;
  sessionId?: string;
  score: number;
  note?: string;
  scoredAt: string;
  criteria?: CompetencyCriteria;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: AchievementType;
  threshold?: number;
  sessionsRequired?: number;
  earnedAt?: string;
}

export interface Goal {
  id: string;
  tutorProfileId: string;
  studentProfileId: string;
  subject: string;
  title: string;
  description?: string;
  difficulty: GoalDifficulty;
  xpReward: number;
  completed: boolean;
  completedAt?: string;
  pendingConfirmation: boolean;
  createdAt: string;
  tutorProfile?: TutorProfile;
  studentProfile?: StudentProfile;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  type: NotificationType;
  link?: string;
  createdAt: string;
}

export interface SubjectRequest {
  id: string;
  tutorProfileId: string;
  subject: string;
  justification: string;
  certificateUrl?: string;
  status: SubjectRequestStatus;
  adminNote?: string;
  createdAt: string;
  reviewedAt?: string;
  tutorProfile?: TutorProfile & { user: { id: string; name: string; email: string; avatar?: string } };
}

export interface RadarData {
  criteria: CompetencyCriteria[];
  currentScores: Record<string, number>;
  previousScores: Record<string, number>;
}

export interface HistoryData {
  criteria: CompetencyCriteria[];
  history: { date: string; scores: Record<string, number> }[];
}

export interface ProgressStats {
  totalSessions: number;
  upcomingSessions: number;
  achievementsCount: number;
  avgScore: number;
  xp: number;
  level: number;
}

export interface Review {
  id: string;
  tutorProfileId: string;
  studentProfileId: string;
  sessionId?: string;
  rating: number;
  text?: string;
  tutorReply?: string;
  createdAt: string;
  updatedAt: string;
  studentProfile?: StudentProfile;
  tutorProfile?: TutorProfile;
}

export interface ChatMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  read: boolean;
  createdAt: string;
  fromUser?: { id: string; name: string; avatar: string };
}
