import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext'; // NEW
import Login from './pages/Login';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import StudentDashboard from './pages/StudentDashboard';
import ShopDashboard from './pages/ShopDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import GlobalChat from './pages/GlobalChat';
import Layout from './components/Layout';

const PrivateRoute = ({ children }) => {
  const { user, userData, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center bg-white text-brand-600 font-bold animate-pulse">Loading...</div>;
  if (!user) return <Navigate to="/landing" />;
  if (!userData) return <Navigate to="/onboarding" />;
  return children;
};

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
      <CartProvider>
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

            <Route path="*" element={<Navigate to="/landing" />} />
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;