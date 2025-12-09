import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Save, User, Hash, AlignLeft, Palette } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from './firebase';

export default function ProfileModal({ isOpen, onClose, user, userData }) {
  const [name, setName] = useState(userData?.displayName || user?.displayName || "");
  const [bio, setBio] = useState(userData?.bio || "");
  const [statusMsg, setStatusMsg] = useState(userData?.statusMessage || "");
  const [bannerColor, setBannerColor] = useState(userData?.bannerColor || "#F472B6"); // Default Pink
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Cloudinary Config
  const CLOUD_NAME = "qbqrzy56"; 
  const UPLOAD_PRESET = "gf_mood_app"; 
  const API_KEY = "282875156328147"; 

  const handleSave = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: name,
        bio: bio,
        statusMessage: statusMsg,
        bannerColor: bannerColor
      });
      onClose();
    } catch (e) {
      console.error("Save failed", e);
      alert("Could not save profile.");
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('api_key', API_KEY);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        await updateProfile(auth.currentUser, { photoURL: data.secure_url });
        await updateDoc(doc(db, "users", user.uid), { photoURL: data.secure_url });
      }
    } catch (e) { alert("Upload failed"); }
    setUploading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800"
      >
        {/* BANNER */}
        <div className="h-32 w-full relative" style={{ backgroundColor: bannerColor }}>
          <div className="absolute bottom-2 right-2 flex gap-2">
             <div className="flex gap-1 bg-black/30 backdrop-blur-md p-1.5 rounded-lg">
                {['#F472B6', '#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#111827'].map(c => (
                    <button key={c} onClick={() => setBannerColor(c)} className="w-5 h-5 rounded-full border border-white/50" style={{ backgroundColor: c }} />
                ))}
             </div>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"><X size={18} /></button>
        </div>

        {/* AVATAR */}
        <div className="px-6 relative">
          <div className="-mt-12 mb-4 relative inline-block">
            <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-900 overflow-hidden bg-gray-100">
               {uploading ? <div className="w-full h-full flex items-center justify-center bg-gray-200"><div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"/></div> : <img src={userData?.photoURL || user?.photoURL} className="w-full h-full object-cover" />}
            </div>
            <button onClick={() => fileInputRef.current.click()} className="absolute bottom-0 right-0 p-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 border-2 border-white dark:border-gray-900 transition-colors shadow-sm">
                <Camera size={14} />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
          </div>
        </div>

        {/* FORM */}
        <div className="px-6 pb-6 space-y-4">
          
          {/* Name & Status Msg */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Display Name</label>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 focus-within:border-pink-400 transition-colors">
               <User size={18} className="text-gray-400" />
               <input value={name} onChange={(e) => setName(e.target.value)} className="bg-transparent w-full text-sm outline-none dark:text-white font-bold" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Custom Status</label>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 focus-within:border-pink-400 transition-colors">
               <Hash size={18} className="text-gray-400" />
               <input value={statusMsg} onChange={(e) => setStatusMsg(e.target.value)} placeholder="What's happening?" className="bg-transparent w-full text-sm outline-none dark:text-white" />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">About Me</label>
            <div className="flex gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 focus-within:border-pink-400 transition-colors">
               <AlignLeft size={18} className="text-gray-400 mt-1" />
               <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Write a short bio..." className="bg-transparent w-full text-sm outline-none dark:text-white resize-none h-20" />
            </div>
          </div>

          {/* Save Button */}
          <button onClick={handleSave} className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-pink-500/30 transition-all active:scale-95">
            <Save size={18} /> Save Changes
          </button>

        </div>
      </motion.div>
    </div>
  );
}