import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-brand-500 tracking-tight mb-2">Brotherhood.</h1>
        <p className="text-gray-500">Campus essentials, one chat away.</p>
      </div>
      
      <div className="w-full max-w-md">
        <button 
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 transform active:scale-95"
        >
          <FcGoogle size={24} />
          <span className="font-semibold text-gray-700">Continue with Google</span>
        </button>
      </div>
    </div>
  );
};

export default Login;