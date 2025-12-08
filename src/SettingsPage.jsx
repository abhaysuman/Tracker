import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Bell, Lock, User, LogOut, Moon, Sun, Heart, Edit2, Check, X, Camera } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from './firebase';

export default function SettingsPage({ onNavigate, isDarkMode, toggleTheme, onLogout, user, userData }) {
  
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(userData?.displayName || user?.displayName || "My Love");
  const [loading, setLoading] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  
  const fileInputRef = useRef(null);

  // --- HANDLE PHOTO UPLOAD ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImg(true);
    try {
      // 1. Create a reference to where the image will be stored
      const storageRef = ref(storage, `profile_pictures/${user.uid}`);
      
      // 2. Upload the file
      await uploadBytes(storageRef, file);
      
      // 3. Get the URL of the uploaded file
      const downloadURL = await getDownloadURL(storageRef);

      // 4. Update Firebase Auth (The main user object)
      await updateProfile(auth.currentUser, { photoURL: downloadURL });

      // 5. Update Firestore Database (So friends can see it)
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { photoURL: downloadURL });

      alert("Profile photo updated! 📸");
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image.");
    }
    setUploadingImg(false);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { displayName: newName });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating name:", error);
      alert("Could not update name.");
    }
    setLoading(false);
  };

  const SettingSection = ({ title, children }) => (
    <div className="bg-white dark:bg-midnight-card rounded-[2rem] p-6 shadow-sm mb-4 transition-colors duration-300">
      <h3 className="text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-wider mb-4">{title}</h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );

  const SettingRow = ({ icon: Icon, label, action }) => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 text-gray-700 dark:text-gray-200">
        <div className="p-2 bg-pink-50 dark:bg-pink-900/30 text-pink-400 rounded-full">
          <Icon size={18} />
        </div>
        <span className="font-medium text-sm">{label}</span>
      </div>
      {action}
    </div>
  );

  const Toggle = ({ active, onClick }) => (
    <div 
      onClick={onClick}
      className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors duration-300 ${active ? 'bg-pink-400' : 'bg-pink-200 dark:bg-gray-600'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${active ? 'right-1' : 'left-1'}`} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#EBD4F4] dark:bg-midnight-bg pb-10 font-sans selection:bg-pink-200 transition-colors duration-300 relative">
      
      {/* Header */}
      <div className="pt-8 px-6 pb-6 flex items-center justify-between sticky top-0 z-10 bg-[#EBD4F4]/90 dark:bg-midnight-bg/90 backdrop-blur-sm transition-colors duration-300">
        <button 
          onClick={() => onNavigate('home')}
          className="p-3 bg-white dark:bg-midnight-card rounded-full text-gray-600 dark:text-gray-200 shadow-sm hover:scale-105 transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-700 dark:text-white">Settings</h1>
        <div className="w-12"></div>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }}
        className="px-6 max-w-md mx-auto"
      >
        {/* PROFILE CARD */}
        <div className="bg-white dark:bg-midnight-card rounded-[2rem] p-6 shadow-sm mb-6 flex items-center gap-4 transition-colors duration-300 relative overflow-hidden">
          
          {/* Avatar with Upload Click */}
          <div className="relative shrink-0">
            <div 
              onClick={() => fileInputRef.current.click()}
              className="w-20 h-20 bg-pink-100 dark:bg-pink-900/20 rounded-full flex items-center justify-center text-2xl border-4 border-pink-50 dark:border-pink-900/10 overflow-hidden cursor-pointer group"
            >
               {uploadingImg ? (
                 <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div>
               ) : (userData?.photoURL || user?.photoURL) ? (
                 <img src={userData?.photoURL || user?.photoURL} alt="User" className="w-full h-full object-cover" />
               ) : (
                 "👩‍❤️‍👨"
               )}
               
               {/* Hover Overlay */}
               <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <Camera size={20} className="text-white" />
               </div>
            </div>
            
            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*"
              className="hidden" 
            />
          </div>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-black/20 border border-pink-200 dark:border-white/10 rounded-lg px-2 py-1 text-gray-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  autoFocus
                />
                <button 
                  onClick={handleSaveName}
                  disabled={loading}
                  className="p-1.5 bg-green-100 text-green-600 rounded-full hover:bg-green-200"
                >
                  <Check size={16} />
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                 <h2 className="font-bold text-gray-700 dark:text-white text-lg truncate">
                   {userData?.displayName || user?.displayName || "My Love"}
                 </h2>
                 <button 
                   onClick={() => setIsEditing(true)}
                   className="p-1 text-gray-400 hover:text-pink-500 transition-colors"
                 >
                   <Edit2 size={14} />
                 </button>
              </div>
            )}
            
            <p className="text-gray-400 dark:text-gray-400 text-xs truncate mt-0.5">
              {user?.email || "No Email Linked"}
            </p>
          </div>

        </div>

        <SettingSection title="Preferences">
          <SettingRow icon={Bell} label="Notifications" action={<Toggle />} />
          <SettingRow 
            icon={isDarkMode ? Sun : Moon} 
            label="Dark Mode" 
            action={<Toggle active={isDarkMode} onClick={toggleTheme} />} 
          />
          <SettingRow icon={Heart} label="Daily Reminders" action={<Toggle />} />
        </SettingSection>

        <SettingSection title="Privacy & Security">
          <SettingRow icon={Lock} label="Privacy Mode" action={<Toggle />} />
          <SettingRow icon={User} label="Friend List" action={<span className="text-xs text-gray-400">{userData?.friends?.length || 0} Friends</span>} />
        </SettingSection>

        <button 
          onClick={onLogout}
          className="w-full bg-white dark:bg-midnight-card rounded-2xl p-4 text-red-400 font-bold flex items-center justify-center gap-2 shadow-sm mt-4 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors duration-300"
        >
          <LogOut size={18} />
          Log Out
        </button>

        <p className="text-center text-gray-400 dark:text-gray-600 text-xs mt-8">
          GF Mood Tracker v1.3 <br/> Made with ❤️
        </p>

      </motion.div>
    </div>
  );
}