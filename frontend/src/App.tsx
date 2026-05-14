import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import TutorList from './pages/Tutors/TutorList';
import TutorProfile from './pages/Tutors/TutorProfile';
import StudentDashboard from './pages/Student/StudentDashboard';
import MySessions from './pages/Student/MySessions';
import MyProgress from './pages/Student/MyProgress';
import MyGoals from './pages/Student/MyGoals';
import TutorDashboard from './pages/Tutor/TutorDashboard';
import SessionJournal from './pages/Tutor/SessionJournal';
import ManageCriteria from './pages/Tutor/ManageCriteria';
import ManageGoals from './pages/Tutor/ManageGoals';
import StudentProgress from './pages/Tutor/StudentProgress';
import EvaluateStudent from './pages/Tutor/EvaluateStudent';
import TutorSetup from './pages/Tutor/TutorSetup';
import PendingApproval from './pages/Tutor/PendingApproval';
import TutorReviews from './pages/Tutor/TutorReviews';
import StudentPublicProfile from './pages/Student/StudentPublicProfile';
import StudentAchievements from './pages/Student/StudentAchievements';
import AdminPanel from './pages/Admin/AdminPanel';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string | string[] }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(user.role)) {
      if (user.role === 'STUDENT') return <Navigate to="/student/dashboard" replace />;
      if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
      return <Navigate to="/tutor/dashboard" replace />;
    }
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/tutors" element={<TutorList />} />
          <Route path="/tutors/:id" element={<TutorProfile />} />

          {/* Student routes */}
          <Route path="/student/dashboard" element={<ProtectedRoute role="STUDENT"><StudentDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/student" element={<Navigate to="/student/dashboard" replace />} />
          <Route path="/student/sessions" element={<ProtectedRoute role="STUDENT"><MySessions /></ProtectedRoute>} />
          <Route path="/student/progress" element={<ProtectedRoute role="STUDENT"><MyProgress /></ProtectedRoute>} />
          <Route path="/student/goals" element={<ProtectedRoute role="STUDENT"><MyGoals /></ProtectedRoute>} />
          <Route path="/student/achievements" element={<ProtectedRoute role="STUDENT"><StudentAchievements /></ProtectedRoute>} />
          <Route path="/students/:id" element={<StudentPublicProfile />} />

          {/* Tutor routes */}
          <Route path="/tutor/dashboard" element={<ProtectedRoute role="TUTOR"><TutorDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/tutor" element={<Navigate to="/tutor/dashboard" replace />} />
          <Route path="/tutor/setup" element={<ProtectedRoute role="TUTOR"><TutorSetup /></ProtectedRoute>} />
          <Route path="/tutor/pending" element={<ProtectedRoute role="TUTOR"><PendingApproval /></ProtectedRoute>} />
          <Route path="/tutor/sessions" element={<ProtectedRoute role="TUTOR"><SessionJournal /></ProtectedRoute>} />
          <Route path="/tutor/criteria" element={<ProtectedRoute role="TUTOR"><ManageCriteria /></ProtectedRoute>} />
          <Route path="/tutor/goals" element={<ProtectedRoute role="TUTOR"><ManageGoals /></ProtectedRoute>} />
          <Route path="/tutor/students/:studentProfileId/progress" element={<ProtectedRoute role="TUTOR"><StudentProgress /></ProtectedRoute>} />
          <Route path="/tutor/evaluate/:sessionId" element={<ProtectedRoute role="TUTOR"><EvaluateStudent /></ProtectedRoute>} />
          <Route path="/tutor/reviews" element={<ProtectedRoute role="TUTOR"><TutorReviews /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminPanel /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
