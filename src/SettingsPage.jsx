import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Lock, User, LogOut, Moon, Sun, Edit2, Check, Camera, MessageSquare, Palette } from 'lucide-react'; // Added Palette
import { doc, updateDoc } from 'firebase/firestore'; 
import { updateProfile } from 'firebase/auth';
import { db, auth } from './firebase';
import FeedbackModal from './FeedbackModal';

export default function SettingsPage({ onNavigate, isDarkMode, toggleTheme, onLogout, user, userData, openDialog }) {
  
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(userData?.displayName || user?.displayName || "My Love");
  const [status, setStatus] = useState(userData?.status || "");
  const [isStatusEditing, setIsStatusEditing] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  
  const fileInputRef = useRef(null);

  // THEMES LIST
  const themes = [
    { id: 'pink', color: '#ec4899', name: 'Love Pink' },
    { id: 'blue', color: '#3b82f6', name: 'Ocean Blue' },
    { id: 'purple', color: '#a855f7', name: 'Royal Purple' },
    { id: 'green', color: '#22c55e', name: 'Forest Green' },
    { id: 'orange', color: '#f97316', name: 'Sunset' },
  ];

  // Cloudinary Config
  const CLOUD_NAME = "qbqrzy56"; 
  const UPLOAD_PRESET = "gf_mood_app";

  // --- ACTIONS ---
  const handleThemeChange = async (themeId) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { theme: themeId });
      // The App.jsx listener will pick this up and apply it instantly
    } catch (e) { console.error(e); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        await updateProfile(auth.currentUser, { photoURL: data.secure_url });
        await updateDoc(doc(db, "users", user.uid), { photoURL: data.secure_url });
        alert("Profile photo updated! 📸");
      }
    } catch (error) { alert("Failed to upload image."); }
    setUploadingImg(false);
  };

  const handleSaveName = async () => { if (!newName.trim()) return; await updateDoc(doc(db, "users", user.uid), { displayName: newName }); setIsEditing(false); };
  const handleSaveStatus = async () => { await updateDoc(doc(db, "users", user.uid), { status: status }); setIsStatusEditing(false); };
  const togglePrivacy = async () => { await updateDoc(doc(db, "users", user.uid), { isPrivate: !userData?.isPrivate }); };

  const SettingSection = ({ title, children }) => (
    <div className="bg-white dark:bg-midnight-card rounded-[2rem] p-6 shadow-sm mb-4 transition-colors duration-300">
      <h3 className="text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-wider mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );

  const SettingRow = ({ icon: Icon, label, action, onClick }) => (
    <div className="flex items-center justify-between cursor-pointer" onClick={onClick}>
      <div className="flex items-center gap-3 text-gray-700 dark:text-gray-200">
        <div className="p-2 bg-pink-50 dark:bg-pink-900/30 text-pink-400 rounded-full relative"><Icon size={18} /></div>
        <span className="font-medium text-sm">{label}</span>
      </div>
      {action}
    </div>
  );

  const Toggle = ({ active, onClick }) => (
    <div onClick={(e) => { e.stopPropagation(); onClick && onClick(); }} className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors duration-300 ${active ? 'bg-pink-400' : 'bg-pink-200 dark:bg-gray-600'}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${active ? 'right-1' : 'left-1'}`} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#EBD4F4] dark:bg-midnight-bg pb-10 font-sans transition-colors duration-300 relative">
      <div className="pt-8 px-6 pb-6 flex items-center justify-between sticky top-0 z-10 bg-[#EBD4F4]/90 dark:bg-midnight-bg/90 backdrop-blur-sm">
        <button onClick={() => onNavigate('home')} className="p-3 bg-white dark:bg-midnight-card rounded-full text-gray-600 dark:text-gray-200 shadow-sm hover:scale-105 transition-all"><ChevronLeft size={24} /></button>
        <h1 className="text-xl font-bold text-gray-700 dark:text-white">Settings</h1>
        <div className="w-12"></div>
      </div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="px-6 max-w-md mx-auto">
        
        {/* PROFILE CARD */}
        <div className="bg-white dark:bg-midnight-card rounded-[2rem] p-6 shadow-sm mb-6 relative overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative shrink-0">
              <div onClick={() => fileInputRef.current.click()} className="w-20 h-20 bg-pink-100 dark:bg-pink-900/20 rounded-full flex items-center justify-center text-2xl border-4 border-pink-50 dark:border-pink-900/10 overflow-hidden cursor-pointer group">
                 {uploadingImg ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div> : (userData?.photoURL || user?.photoURL) ? <img src={userData?.photoURL || user?.photoURL} alt="User" className="w-full h-full object-cover" /> : "👩‍❤️‍👨"}
                 <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100"><Camera size={20} className="text-white" /></div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            </div>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-2 mb-1"><input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-gray-50 dark:bg-black/20 border border-pink-200 rounded-lg px-2 py-1 text-sm" autoFocus /><button onClick={handleSaveName} className="p-1.5 bg-green-100 text-green-600 rounded-full"><Check size={14} /></button></div>
              ) : (
                <div className="flex items-center gap-2"><h2 className="font-bold text-gray-700 dark:text-white text-lg truncate">{userData?.displayName || user?.displayName}</h2><button onClick={() => setIsEditing(true)} className="p-1 text-gray-400 hover:text-pink-500"><Edit2 size={14} /></button></div>
              )}
              {isStatusEditing ? (
                <div className="flex items-center gap-2 mt-1"><input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Set status..." className="w-full bg-gray-50 dark:bg-black/20 border border-pink-200 rounded-lg px-2 py-1 text-xs" /><button onClick={handleSaveStatus} className="p-1.5 bg-green-100 text-green-600 rounded-full"><Check size={12} /></button></div>
              ) : (
                <div onClick={() => setIsStatusEditing(true)} className="flex items-center gap-2 cursor-pointer mt-1 group"><p className={`text-xs truncate ${status ? 'text-pink-500 font-medium' : 'text-gray-400 italic'}`}>{status || "Set a status..."}</p><Edit2 size={10} className="text-gray-300 opacity-0 group-hover:opacity-100" /></div>
              )}
            </div>
          </div>
        </div>

        {/* --- THEME PICKER --- */}
        <SettingSection title="Appearance">
          <SettingRow icon={isDarkMode ? Sun : Moon} label="Dark Mode" action={<Toggle active={isDarkMode} onClick={toggleTheme} />} />
          
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3 text-gray-700 dark:text-gray-200">
                <div className="p-2 bg-pink-50 dark:bg-pink-900/30 text-pink-400 rounded-full"><Palette size={18} /></div>
                <span className="font-medium text-sm">App Theme</span>
            </div>
            <div className="flex gap-3 justify-between px-2">
                {themes.map(t => (
                    <button 
                        key={t.id}
                        onClick={() => handleThemeChange(t.id)}
                        className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${userData?.theme === t.id ? 'border-gray-400 scale-110 shadow-md' : 'border-transparent'}`}
                        style={{ backgroundColor: t.color }}
                        title={t.name}
                    >
                        {userData?.theme === t.id && <Check size={16} className="text-white drop-shadow-md" />}
                    </button>
                ))}
            </div>
          </div>
        </SettingSection>

        <SettingSection title="Privacy & Security">
          <SettingRow icon={Lock} label="Privacy Mode" action={<Toggle active={userData?.isPrivate} onClick={togglePrivacy} />} />
          <SettingRow icon={User} label="Friend List" action={<span className="text-xs text-gray-400">{userData?.friends?.length || 0} Friends</span>} />
        </SettingSection>

        <SettingSection title="Support">
           <SettingRow icon={MessageSquare} label="Send Feedback" onClick={() => setShowFeedback(true)} action={<div className="bg-gray-100 dark:bg-white/10 p-1 rounded-full"><ChevronLeft size={16} className="rotate-180" /></div>} />
        </SettingSection>

        <button onClick={onLogout} className="w-full bg-white dark:bg-midnight-card rounded-2xl p-4 text-red-400 font-bold flex items-center justify-center gap-2 shadow-sm mt-4 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
          <LogOut size={18} /> Log Out
        </button>
      </motion.div>

      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} user={user} />
    </div>
  );
}