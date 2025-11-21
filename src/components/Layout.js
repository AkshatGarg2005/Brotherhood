import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { FaHome, FaGlobe, FaUser } from 'react-icons/fa';

const Layout = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'text-brand-500' : 'text-gray-400';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Main Content Area */}
      <div className="flex-1 pb-20"> 
        <Outlet />
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around py-3 pb-5 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Link to="/" className={`flex flex-col items-center gap-1 ${isActive('/')}`}>
          <FaHome size={24} />
          <span className="text-xs font-medium">Home</span>
        </Link>
        
        <Link to="/global-chat" className={`flex flex-col items-center gap-1 ${isActive('/global-chat')}`}>
          <FaGlobe size={24} />
          <span className="text-xs font-medium">Global</span>
        </Link>
        
        <Link to="/profile" className={`flex flex-col items-center gap-1 ${isActive('/profile')}`}>
          <FaUser size={24} />
          <span className="text-xs font-medium">Profile</span>
        </Link>
      </div>
    </div>
  );
};

export default Layout;