import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Bell, Lock, User, LogOut, Moon, Sun, Heart, Edit2, Check, X, Camera, MessageSquare, Zap } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from './firebase';
import FeedbackModal from './FeedbackModal'; // <--- Import Feedback

export default function SettingsPage({ onNavigate, isDarkMode, toggleTheme, onLogout, user, userData }) {
  
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(userData?.displayName || user?.displayName || "My Love");
  const [status, setStatus] = useState(userData?.status || ""); // <--- User Status
  const [isStatusEditing, setIsStatusEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false); // <--- Feedback State
  
  const fileInputRef = useRef(null);

  // --- PHOTO UPLOAD ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const storageRef = ref(storage, `profile_pictures/${user.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await updateProfile(auth.currentUser, { photoURL: downloadURL });
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { photoURL: downloadURL });
      alert("Profile photo updated! 📸");
    } catch (error) {
      console.error("Error uploading image:", error);
    }
    setUploadingImg(false);
  };

  // --- SAVE NAME ---
  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { displayName: newName });
      setIsEditing(false);
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  // --- SAVE STATUS ---
  const handleSaveStatus = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { status: status });
      setIsStatusEditing(false);
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  // --- TOGGLE PRIVACY ---
  const togglePrivacy = async () => {
    const currentPrivacy = userData?.isPrivate || false;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { isPrivate: !currentPrivacy });
    } catch (error) { console.error(error); }
  };

  const SettingSection = ({ title, children }) => (
    <div className="bg-white dark:bg-midnight-card rounded-[2rem] p-6 shadow-sm mb-4 transition-colors duration-300">
      <h3 className="text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-wider mb-4">{title}</h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );

  const SettingRow = ({ icon: Icon, label, action, onClick }) => (
    <div className="flex items-center justify-between cursor-pointer" onClick={onClick}>
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
      onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
      className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors duration-300 ${active ? 'bg-pink-400' : 'bg-pink-200 dark:bg-gray-600'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${active ? 'right-1' : 'left-1'}`} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#EBD4F4] dark:bg-midnight-bg pb-10 font-sans selection:bg-pink-200 transition-colors duration-300 relative">
      
      {/* Header */}
      <div className="pt-8 px-6 pb-6 flex items-center justify-between sticky top-0 z-10 bg-[#EBD4F4]/90 dark:bg-midnight-bg/90 backdrop-blur-sm transition-colors duration-300">
        <button onClick={() => onNavigate('home')} className="p-3 bg-white dark:bg-midnight-card rounded-full text-gray-600 dark:text-gray-200 shadow-sm hover:scale-105 transition-all">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-700 dark:text-white">Settings</h1>
        <div className="w-12"></div>
      </div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="px-6 max-w-md mx-auto">
        
        {/* PROFILE CARD */}
        <div className="bg-white dark:bg-midnight-card rounded-[2rem] p-6 shadow-sm mb-6 flex items-center gap-4 transition-colors duration-300 relative overflow-hidden">
          <div className="relative shrink-0">
            <div onClick={() => fileInputRef.current.click()} className="w-20 h-20 bg-pink-100 dark:bg-pink-900/20 rounded-full flex items-center justify-center text-2xl border-4 border-pink-50 dark:border-pink-900/10 overflow-hidden cursor-pointer group">
               {uploadingImg ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div> : (userData?.photoURL || user?.photoURL) ? <img src={userData?.photoURL || user?.photoURL} alt="User" className="w-full h-full object-cover" /> : "👩‍❤️‍👨"}
               <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={20} className="text-white" /></div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          </div>

          <div className="flex-1 min-w-0">
            {/* NAME EDIT */}
            {isEditing ? (
              <div className="flex items-center gap-2 mb-1">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-gray-50 dark:bg-black/20 border border-pink-200 dark:border-white/10 rounded-lg px-2 py-1 text-gray-700 dark:text-white text-sm" autoFocus />
                <button onClick={handleSaveName} className="p-1.5 bg-green-100 text-green-600 rounded-full"><Check size={14} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                 <h2 className="font-bold text-gray-700 dark:text-white text-lg truncate">{userData?.displayName || user?.displayName}</h2>
                 <button onClick={() => setIsEditing(true)} className="p-1 text-gray-400 hover:text-pink-500"><Edit2 size={14} /></button>
              </div>
            )}
            
            {/* STATUS EDIT */}
            {isStatusEditing ? (
              <div className="flex items-center gap-2 mt-1">
                <input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Set status..." className="w-full bg-gray-50 dark:bg-black/20 border border-pink-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-gray-600 dark:text-gray-300" />
                <button onClick={handleSaveStatus} className="p-1.5 bg-green-100 text-green-600 rounded-full"><Check size={12} /></button>
              </div>
            ) : (
              <div onClick={() => setIsStatusEditing(true)} className="flex items-center gap-2 cursor-pointer mt-1 group">
                 <p className={`text-xs truncate ${status ? 'text-pink-500 font-medium' : 'text-gray-400 italic'}`}>
                   {status || "Set a status..."}
                 </p>
                 <Edit2 size={10} className="text-gray-300 opacity-0 group-hover:opacity-100" />
              </div>
            )}
          </div>
        </div>

        <SettingSection title="Preferences">
          <SettingRow icon={Bell} label="Notifications" action={<Toggle />} />
          <SettingRow icon={isDarkMode ? Sun : Moon} label="Dark Mode" action={<Toggle active={isDarkMode} onClick={toggleTheme} />} />
        </SettingSection>

        <SettingSection title="Privacy & Security">
          <SettingRow 
            icon={Lock} 
            label="Privacy Mode" 
            action={<Toggle active={userData?.isPrivate} onClick={togglePrivacy} />} 
          />
          <SettingRow icon={User} label="Friend List" action={<span className="text-xs text-gray-400">{userData?.friends?.length || 0} Friends</span>} />
        </SettingSection>

        <SettingSection title="Support">
           <SettingRow 
             icon={MessageSquare} 
             label="Send Feedback" 
             onClick={() => setShowFeedback(true)}
             action={<div className="bg-gray-100 dark:bg-white/10 p-1 rounded-full"><ChevronLeft size={16} className="rotate-180" /></div>} 
           />
        </SettingSection>

        <button onClick={onLogout} className="w-full bg-white dark:bg-midnight-card rounded-2xl p-4 text-red-400 font-bold flex items-center justify-center gap-2 shadow-sm mt-4 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
          <LogOut size={18} /> Log Out
        </button>

        <p className="text-center text-gray-400 dark:text-gray-600 text-xs mt-8">GF Mood Tracker v1.4 <br/> Made with ❤️</p>
      </motion.div>

      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} user={user} />
    </div>
  );
}