import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import StudentDashboard from './pages/StudentDashboard';
import ShopDashboard from './pages/ShopDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import GlobalChat from './pages/GlobalChat';
import Layout from './components/Layout';

const PrivateRoute = ({ children }) => {
  const { user, userData, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center text-brand-500">Loading Brotherhood...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!userData) return <Navigate to="/onboarding" />;
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
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          
          {/* Protected Routes wrapped in Layout */}
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="/" element={<DashboardRouter />} />
            <Route path="/global-chat" element={<GlobalChat />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;