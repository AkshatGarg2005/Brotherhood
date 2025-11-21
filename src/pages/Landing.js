import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion'; // Ensure you have framer-motion installed
import { FaArrowRight, FaStore, FaUserGraduate, FaBolt } from 'react-icons/fa';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-brand-100 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50" />

      {/* Header */}
      <nav className="relative z-10 flex justify-between items-center p-6">
        <h1 className="text-2xl font-extrabold text-brand-600 tracking-tight">Brotherhood.</h1>
        <button 
          onClick={() => navigate('/login')}
          className="text-sm font-bold text-gray-600 hover:text-brand-600 transition-colors"
        >
          Log In
        </button>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 px-6 pt-10 pb-20 flex flex-col items-center text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block py-1 px-3 rounded-full bg-brand-50 text-brand-600 text-xs font-bold mb-4 tracking-wide border border-brand-100">
            🚀 EXCLUSIVE FOR CAMPUS
          </span>
          <h2 className="text-5xl font-extrabold text-gray-900 leading-[1.1] mb-6">
            Campus life, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-orange-600">Sorted.</span>
          </h2>
          <p className="text-gray-500 text-lg mb-8 leading-relaxed max-w-xs mx-auto">
            Connect directly with local shops. Order snacks, stationery, and supplies instantly via chat.
          </p>

          <button 
            onClick={() => navigate('/login')}
            className="w-full max-w-xs bg-brand-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-brand-200 hover:bg-brand-700 transform transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            Get Started <FaArrowRight size={16} />
          </button>
        </motion.div>

        {/* Features Grid */}
        <div className="mt-20 grid gap-6 w-full max-w-sm">
          <FeatureCard 
            icon={<FaBolt className="text-yellow-500" />} 
            title="Fast Orders" 
            desc="Skip the queue. Chat & collect." 
          />
          <FeatureCard 
            icon={<FaStore className="text-blue-500" />} 
            title="Local Shops" 
            desc="Support the stores around you." 
          />
          <FeatureCard 
            icon={<FaUserGraduate className="text-purple-500" />} 
            title="Student Verified" 
            desc="Safe community for students." 
          />
        </div>
      </main>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 flex items-center gap-4"
  >
    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-xl">
      {icon}
    </div>
    <div className="text-left">
      <h3 className="font-bold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-400">{desc}</p>
    </div>
  </motion.div>
);

export default Landing;