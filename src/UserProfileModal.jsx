import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Zap, MessageCircle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function UserProfileModal({ isOpen, onClose, targetUid, onMessageClick }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!targetUid || !isOpen) return;
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, "users", targetUid));
      if (snap.exists()) setProfile(snap.data());
    };
    fetchProfile();
  }, [targetUid, isOpen]);

  if (!isOpen) return null;

  const getBadges = (userData) => {
    const badges = [];
    if (userData?.streak >= 3) badges.push({ icon: '🔥', label: 'Heating Up', color: 'bg-orange-100 text-orange-600' });
    if (userData?.streak >= 30) badges.push({ icon: '👑', label: 'Commitment', color: 'bg-yellow-100 text-yellow-600' });
    if ((userData?.friends?.length || 0) >= 5) badges.push({ icon: '🦋', label: 'Social Butterfly', color: 'bg-pink-100 text-pink-600' });
    badges.push({ icon: '🛠️', label: 'User', color: 'bg-gray-100 text-gray-600' });
    return badges;
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-midnight-card w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative z-10 overflow-hidden"
      >
        {/* CLOSE BTN */}
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/5 rounded-full hover:bg-black/10 transition-colors z-20">
          <X size={18} />
        </button>

        {/* HEADER BG */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-pink-200 to-purple-200 dark:from-pink-900 dark:to-purple-900"></div>

        <div className="relative mt-8 flex flex-col items-center">
          {/* AVATAR */}
          <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg">
             <div className="w-full h-full rounded-full bg-gray-100 overflow-hidden">
               {profile?.photoURL ? <img src={profile.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>}
             </div>
          </div>
          
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mt-3">{profile?.displayName || "Unknown"}</h2>
          {profile?.status && <p className="text-pink-500 text-sm font-medium flex items-center gap-1"><Zap size={12} /> {profile.status}</p>}

          {/* MESSAGE BUTTON */}
          <button 
            onClick={() => { onClose(); onMessageClick({ uid: targetUid, ...profile }); }}
            className="mt-4 px-6 py-2 bg-pink-500 text-white rounded-full font-bold shadow-md hover:bg-pink-600 flex items-center gap-2 active:scale-95 transition-all"
          >
            <MessageCircle size={18} /> Message
          </button>

          {/* BADGES */}
          <div className="w-full mt-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Badges</h3>
            <div className="flex flex-wrap justify-center gap-2">
               {profile ? getBadges(profile).map((b, i) => (
                 <div key={i} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${b.color}`}>
                    {b.icon} {b.label}
                 </div>
               )) : <span className="text-xs text-gray-400">Loading...</span>}
            </div>
          </div>

          <div className="w-full mt-6 border-t border-gray-100 dark:border-white/5 pt-4 text-center">
             <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
               <Calendar size={12} /> Joined {profile?.isSetupComplete ? "Recently" : "New User"}
             </p>
          </div>

        </div>
      </motion.div>
    </div>
  );
}