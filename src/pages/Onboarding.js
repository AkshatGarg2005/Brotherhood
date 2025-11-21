import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { FaUserGraduate, FaStore, FaSpinner } from 'react-icons/fa';

const Onboarding = () => {
  const { user, setUserData } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null);
  const [shopCategory, setShopCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const saveUser = async (selectedRole, category = null) => {
    if(!user) return alert("Error: You are not logged in.");
    
    setIsSaving(true);
    
    const data = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "User",
      photoURL: user.photoURL,
      role: selectedRole,
      createdAt: serverTimestamp(),
    };

    if (category) data.category = category;

    try {
      // 1. Write to Database
      await setDoc(doc(db, "users", user.uid), data);
      
      // 2. Update Local State (Fixes the reload issue)
      setUserData(data); 
      
      // 3. Redirect
      navigate('/');
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile. Check your Internet or Firebase Rules.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isSaving) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <FaSpinner className="animate-spin text-brand-500 text-4xl mb-4"/>
        <p className="text-gray-500">Setting up your profile...</p>
      </div>
    );
  }

  // Step 1: Role Selection
  if (step === 1) {
    return (
      <div className="min-h-screen bg-brand-50 p-6 flex flex-col justify-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Who are you?</h2>
        <div className="grid grid-cols-1 gap-4 max-w-md mx-auto w-full">
          <button 
            onClick={() => saveUser('student')}
            className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-brand-400 transition-all"
          >
            <div className="bg-brand-100 p-4 rounded-full mb-3 text-brand-500"><FaUserGraduate size={30} /></div>
            <h3 className="font-bold text-lg">I am a Student</h3>
          </button>

          <button 
            onClick={() => { setRole('shop'); setStep(2); }}
            className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-brand-400 transition-all"
          >
            <div className="bg-blue-100 p-4 rounded-full mb-3 text-blue-500"><FaStore size={30} /></div>
            <h3 className="font-bold text-lg">I own a Shop</h3>
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Shop Details
  return (
    <div className="min-h-screen bg-white p-6 flex flex-col justify-center max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Shop Details</h2>
      <select 
        className="w-full p-3 border border-gray-300 rounded-xl mb-6 outline-none focus:border-brand-500"
        value={shopCategory}
        onChange={(e) => setShopCategory(e.target.value)}
      >
        <option value="">Select Category</option>
        <option value="General Store">General Store</option>
        <option value="Stationery">Stationery</option>
        <option value="Food & Snacks">Food & Snacks</option>
        <option value="Printing/Xerox">Printing/Xerox</option>
      </select>

      <button 
        onClick={() => saveUser('shop', shopCategory)}
        disabled={!shopCategory}
        className="w-full bg-brand-500 text-white py-3 rounded-xl font-bold shadow-lg disabled:opacity-50"
      >
        Complete Setup
      </button>
    </div>
  );
};

export default Onboarding;