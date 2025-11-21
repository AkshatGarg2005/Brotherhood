import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Landing from './pages/Landing'; // NEW
import Onboarding from './pages/Onboarding';
import StudentDashboard from './pages/StudentDashboard';
import ShopDashboard from './pages/ShopDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import GlobalChat from './pages/GlobalChat';
import Layout from './components/Layout';

// Only allows logged in users
const PrivateRoute = ({ children }) => {
  const { user, userData, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center bg-white text-brand-600 font-bold animate-pulse">Loading...</div>;
  if (!user) return <Navigate to="/landing" />; // Redirect to Landing
  if (!userData) return <Navigate to="/onboarding" />;
  return children;
};

// Only allows guests (redirects to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to="/" />;
  return children;
};

const DashboardRouter = () => {
  const { userData } = useAuth();
  if (userData.role === 'admin') return <AdminDashboard />;
  if (userData.role === 'shop') return <ShopDashboard />;
  return <StudentDashboard />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/landing" element={<PublicRoute><Landing /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          
          <Route path="/onboarding" element={<Onboarding />} />
          
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="/" element={<DashboardRouter />} />
            <Route path="/global-chat" element={<GlobalChat />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Default Catch-all */}
          <Route path="*" element={<Navigate to="/landing" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;