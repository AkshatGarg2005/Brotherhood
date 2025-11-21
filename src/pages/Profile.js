import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { updateProfile, signOut } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { uploadImage } from '../utils/cloudinary';
import { useNavigate } from 'react-router-dom';
import { FaCamera, FaSignOutAlt, FaSave } from 'react-icons/fa';

const Profile = () => {
  const user = auth.currentUser;
  const navigate = useNavigate();
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [shopCategory, setShopCategory] = useState('');
  const [role, setRole] = useState('');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [loading, setLoading] = useState(false);

  // Fetch extra data (Role/Category) from Firestore
  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRole(data.role);
          if (data.category) setShopCategory(data.category);
        }
      }
    };
    fetchData();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Update Auth Profile
      await updateProfile(user, { displayName, photoURL });

      // 2. Update Firestore Data
      const updateData = { displayName, photoURL };
      if (role === 'shop') updateData.category = shopCategory;

      await updateDoc(doc(db, "users", user.uid), updateData);
      alert("Profile Updated!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    }
    setLoading(false);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setLoading(true);
      const url = await uploadImage(file);
      if (url) setPhotoURL(url);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto min-h-screen bg-white">
      <h1 className="text-2xl font-bold text-gray-800 mb-8">Edit Profile</h1>

      {/* Avatar Section */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          <img 
            src={photoURL || 'https://via.placeholder.com/150'} 
            alt="Profile" 
            className="w-32 h-32 rounded-full object-cover border-4 border-brand-100 shadow-sm"
          />
          <label className="absolute bottom-0 right-0 bg-brand-500 p-2 rounded-full text-white cursor-pointer hover:bg-brand-600 shadow-md">
            <FaCamera size={16} />
            <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
          </label>
        </div>
        <p className="mt-3 text-gray-500 capitalize font-medium">{role}</p>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
          <input 
            type="text" 
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>

        {role === 'shop' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shop Category</label>
            <select 
              value={shopCategory}
              onChange={(e) => setShopCategory(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
            >
              <option value="General Store">General Store</option>
              <option value="Stationery">Stationery</option>
              <option value="Food & Snacks">Food & Snacks</option>
              <option value="Printing/Xerox">Printing/Xerox</option>
            </select>
          </div>
        )}

        {/* Save Button */}
        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-brand-500 text-white py-3 rounded-xl font-bold hover:bg-brand-600 transition-all shadow-md mt-4"
        >
          <FaSave /> {loading ? "Saving..." : "Save Changes"}
        </button>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-500 py-3 rounded-xl font-bold hover:bg-red-100 transition-all mt-2"
        >
          <FaSignOutAlt /> Logout
        </button>
      </div>
    </div>
  );
};

export default Profile;