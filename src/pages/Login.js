import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { FaArrowLeft } from 'react-icons/fa';

const Login = () => {
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/'); 
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col p-6">
      <button onClick={() => navigate('/landing')} className="text-gray-400 self-start p-2 mb-10">
        <FaArrowLeft />
      </button>
      
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <div className="mb-12">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mb-6 shadow-lg shadow-brand-200">
            B.
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-500">Sign in to access your campus marketplace.</p>
        </div>

        <button 
          onClick={handleLogin}
          className="w-full bg-white border-2 border-gray-100 hover:border-brand-200 text-gray-800 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm hover:shadow-md"
        >
          <FcGoogle size={24} />
          <span>Continue with Google</span>
        </button>
        
        <p className="text-center text-xs text-gray-400 mt-8">
          By clicking continue, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Login;