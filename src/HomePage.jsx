import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Heart, Flame, Home, Calendar, BarChart2, History, Gift, Camera, X, Paperclip } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
// REMOVED: import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth } from './firebase'; // REMOVED storage import

export default function HomePage({ onNavigate, onSaveMood }) {
  const [selectedMood, setSelectedMood] = useState(null);
  const [note, setNote] = useState('');
  const [tags, setTags] = useState([]);
  const [streak, setStreak] = useState(0);
  const [stickyNote, setStickyNote] = useState(null);
  
  const [moodPhoto, setMoodPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // --- CLOUDINARY CONFIG ---
  const CLOUD_NAME = "dqbqrzy56"; // <--- 1. PASTE YOUR CLOUD NAME
  const UPLOAD_PRESET = "gf_mood_app"; // <--- 2. PASTE YOUR UNSIGNED PRESET NAME

  const moods = [
    { emoji: '😍', label: 'Amazing', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300' },
    { emoji: '🙂', label: 'Happy', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-300' },
    { emoji: '😐', label: 'Neutral', color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' },
    { emoji: '😔', label: 'Sad', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300' },
    { emoji: '😤', label: 'Angry', color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300' },
    { emoji: '😴', label: 'Tired', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300' },
  ];

  const possibleTags = ['Work', 'Family', 'Love', 'Sleep', 'Food', 'Weather', 'Health', 'School'];

  useEffect(() => {
    const checkUser = async () => {
      if (!auth.currentUser) return;
      const userRef = doc(db, "users", auth.currentUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        if (data.stickyNote) setStickyNote(data.stickyNote);
        const lastDate = data.lastLoginDate; 
        const currentStreak = data.streak || 0;
        const today = new Date().toISOString().split('T')[0];
        
        // Simple streak logic (check only today vs last login)
        if (lastDate !== today) {
           // ... (Same streak logic as before)
        }
        setStreak(currentStreak);
      }
    };
    checkUser();
  }, []);

  const handleMoodSelect = (mood) => setSelectedMood(mood);
  
  const toggleTag = (tag) => {
    if (tags.includes(tag)) setTags(tags.filter(t => t !== tag));
    else setTags([...tags, tag]);
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMoodPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removePhoto = () => {
    setMoodPhoto(null);
    setPreviewUrl(null);
  };

  const save = async () => {
    if (!selectedMood) return;
    setUploading(true);

    let photoURL = null;

    // --- UPLOAD TO CLOUDINARY ---
    if (moodPhoto) {
      const formData = new FormData();
      formData.append('file', moodPhoto);
      formData.append('upload_preset', UPLOAD_PRESET); 

      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        photoURL = data.secure_url; // Cloudinary returns the web URL
      } catch (e) {
        console.error("Upload failed", e);
        alert("Photo failed to upload.");
      }
    }

    onSaveMood({
      emoji: selectedMood.emoji,
      label: selectedMood.label,
      note,
      tags,
      photo: photoURL
    });

    setSelectedMood(null);
    setNote('');
    setTags([]);
    setMoodPhoto(null);
    setPreviewUrl(null);
    setUploading(false);
  };

  const clearSticky = async () => {
    if(!auth.currentUser) return;
    setStickyNote(null);
    await updateDoc(doc(db, "users", auth.currentUser.uid), { stickyNote: null });
  };

  return (
    <div className="min-h-screen bg-[#EBD4F4] dark:bg-midnight-bg pb-24 font-sans selection:bg-pink-200 flex flex-col items-center transition-colors duration-300">
      
      {/* Header */}
      <div className="pt-12 pb-8 px-6 w-full max-w-md flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-wide transition-colors">Hello, love.</h1>
          <p className="text-gray-500 dark:text-gray-400">How are you?</p>
        </div>
        <div className="bg-white dark:bg-midnight-card px-3 py-2 rounded-2xl shadow-sm flex items-center gap-2 border border-orange-100 dark:border-orange-900/30">
          <div className="bg-orange-100 dark:bg-orange-900/20 p-1.5 rounded-full text-orange-500"><Flame size={16} fill="currentColor" /></div>
          <div><span className="block text-sm font-bold text-gray-700 dark:text-white leading-none">{streak}</span><span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Days</span></div>
        </div>
      </div>

      {/* Sticky Note */}
      <AnimatePresence>
        {stickyNote && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-[90%] max-w-md bg-yellow-100 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-xl shadow-sm mb-6 relative group">
            <div className="flex items-start gap-3">
              <Paperclip size={20} className="text-yellow-600 dark:text-yellow-500 mt-1 shrink-0" />
              <div><p className="text-gray-800 dark:text-white font-handwriting text-lg leading-tight">"{stickyNote.message}"</p><p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 font-bold uppercase tracking-wider">- {stickyNote.sender}</p></div>
            </div>
            <button onClick={clearSticky} className="absolute top-2 right-2 p-1 text-yellow-600/50 hover:text-yellow-600 transition-colors"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white dark:bg-midnight-card w-[90%] max-w-md rounded-[2.5rem] shadow-xl p-8 transition-colors duration-300">
        <h2 className="text-center text-gray-400 dark:text-gray-500 font-bold tracking-widest text-xs uppercase mb-6">Select your mood</h2>
        
        <div className="grid grid-cols-3 gap-4 mb-8">
          {moods.map((mood) => (
            <motion.button key={mood.label} whileTap={{ scale: 0.9 }} onClick={() => handleMoodSelect(mood)} className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all ${selectedMood?.label === mood.label ? 'ring-4 ring-pink-200 dark:ring-pink-700 scale-105 shadow-md bg-pink-50 dark:bg-pink-900/20' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
              <div className={`text-4xl mb-2 p-3 rounded-full ${mood.color} transition-colors`}>{mood.emoji}</div>
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{mood.label}</span>
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {selectedMood && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="bg-gray-50 dark:bg-black/20 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-white/5">
                 <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase">Add Details</h3>
                 <div className="flex flex-wrap gap-2 mb-4">
                   {possibleTags.map(tag => (
                     <button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1 text-xs rounded-full border transition-colors ${tags.includes(tag) ? 'bg-pink-400 text-white border-pink-400' : 'bg-white dark:bg-transparent text-gray-500 border-gray-200 dark:border-gray-600'}`}>{tag}</button>
                   ))}
                 </div>
                 <textarea placeholder="Add a note..." value={note} onChange={(e) => setNote(e.target.value)} className="w-full bg-white dark:bg-white/5 rounded-xl p-3 text-sm text-gray-700 dark:text-white outline-none border border-gray-200 dark:border-gray-600 focus:border-pink-300 transition-colors mb-4" rows="3" />

                 {previewUrl ? (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
                      <img src={previewUrl} className="w-full h-full object-cover" alt="preview" />
                      <button onClick={removePhoto} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"><X size={16} /></button>
                    </div>
                 ) : (
                   <button onClick={() => fileInputRef.current.click()} className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center gap-2 text-gray-500 hover:text-pink-500 hover:border-pink-300 transition-colors">
                     <Camera size={18} /> Attach Photo
                   </button>
                 )}
                 <input type="file" ref={fileInputRef} onChange={handlePhotoSelect} accept="image/*" className="hidden" />
              </div>
              <button onClick={save} disabled={uploading} className="w-full py-4 rounded-xl bg-pink-400 hover:bg-pink-500 text-white font-bold shadow-lg shadow-pink-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                {uploading ? "Uploading..." : <>Save Entry <Heart size={18} fill="currentColor" /></>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-sm bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md rounded-full shadow-lg border border-white/50 dark:border-white/10 px-6 py-4 flex justify-between items-center z-40 transition-colors duration-300">
        <NavIcon icon={<Home size={20} />} active onClick={() => onNavigate('home')} />
        <NavIcon icon={<Calendar size={20} />} onClick={() => onNavigate('calendar')} />
        <NavIcon icon={<BarChart2 size={20} />} onClick={() => onNavigate('insights')} />
        <NavIcon icon={<History size={20} />} onClick={() => onNavigate('history')} />
        <NavIcon icon={<Gift size={20} />} onClick={() => onNavigate('surprise')} />
      </div>

    </div>
  );
}

function NavIcon({ icon, active, onClick }) {
  return (
    <button onClick={onClick} className={`p-2 rounded-full transition-colors ${active ? 'text-gray-800 bg-pink-100 dark:bg-pink-900/50 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}>
      {icon}
    </button>
  );
}