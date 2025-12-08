import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // <--- FIXED THIS LINE
import { Smile, Frown, Meh, CloudRain, Sun, Zap, Heart, Flame } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

export default function HomePage({ onNavigate, onSaveMood }) {
  const [selectedMood, setSelectedMood] = useState(null);
  const [note, setNote] = useState('');
  const [tags, setTags] = useState([]);
  const [streak, setStreak] = useState(0);

  const moods = [
    { emoji: '😍', label: 'Amazing', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300' },
    { emoji: '🙂', label: 'Happy', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-300' },
    { emoji: '😐', label: 'Neutral', color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' },
    { emoji: '😔', label: 'Sad', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300' },
    { emoji: '😤', label: 'Angry', color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300' },
    { emoji: '😴', label: 'Tired', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300' },
  ];

  const possibleTags = ['Work', 'Family', 'Love', 'Sleep', 'Food', 'Weather', 'Health', 'School'];

  // --- STREAK CALCULATION LOGIC ---
  useEffect(() => {
    const checkStreak = async () => {
      if (!auth.currentUser) return;
      const userRef = doc(db, "users", auth.currentUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        const lastDate = data.lastLoginDate; // String "YYYY-MM-DD"
        const currentStreak = data.streak || 0;
        
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastDate === todayStr) {
          setStreak(currentStreak); // Already logged today
        } else if (lastDate === yesterdayStr) {
          // Logged in yesterday, increment!
          const newStreak = currentStreak + 1;
          setStreak(newStreak);
          await updateDoc(userRef, { streak: newStreak, lastLoginDate: todayStr });
        } else {
          // Streak broken (or first login)
          // Only reset if lastLogin was NOT today
          if (lastDate !== todayStr) {
             setStreak(1);
             await updateDoc(userRef, { streak: 1, lastLoginDate: todayStr });
          } else {
             setStreak(currentStreak);
          }
        }
      }
    };
    checkStreak();
  }, []);

  const handleMoodSelect = (mood) => {
    setSelectedMood(mood);
  };

  const toggleTag = (tag) => {
    if (tags.includes(tag)) setTags(tags.filter(t => t !== tag));
    else setTags([...tags, tag]);
  };

  const save = () => {
    if (!selectedMood) return;
    onSaveMood({
      emoji: selectedMood.emoji,
      label: selectedMood.label,
      note,
      tags
    });
    setSelectedMood(null);
    setNote('');
    setTags([]);
  };

  return (
    <div className="min-h-screen bg-[#EBD4F4] dark:bg-midnight-bg pb-24 font-sans selection:bg-pink-200 flex flex-col items-center transition-colors duration-300">
      
      {/* Header with Streak */}
      <div className="pt-12 pb-8 px-6 w-full max-w-md flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-wide transition-colors">
            Hello, love.
          </h1>
          <p className="text-gray-500 dark:text-gray-400">How are you?</p>
        </div>
        
        {/* Streak Display */}
        <div className="bg-white dark:bg-midnight-card px-3 py-2 rounded-2xl shadow-sm flex items-center gap-2 border border-orange-100 dark:border-orange-900/30">
          <div className="bg-orange-100 dark:bg-orange-900/20 p-1.5 rounded-full text-orange-500">
            <Flame size={16} fill="currentColor" />
          </div>
          <div>
            <span className="block text-sm font-bold text-gray-700 dark:text-white leading-none">{streak}</span>
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Days</span>
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white dark:bg-midnight-card w-[90%] max-w-md rounded-[2.5rem] shadow-xl p-8 transition-colors duration-300"
      >
        <h2 className="text-center text-gray-400 dark:text-gray-500 font-bold tracking-widest text-xs uppercase mb-6">Select your mood</h2>
        
        <div className="grid grid-cols-3 gap-4 mb-8">
          {moods.map((mood) => (
            <motion.button
              key={mood.label}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleMoodSelect(mood)}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all ${selectedMood?.label === mood.label ? 'ring-4 ring-pink-200 dark:ring-pink-700 scale-105 shadow-md bg-pink-50 dark:bg-pink-900/20' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
            >
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
                     <button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1 text-xs rounded-full border transition-colors ${tags.includes(tag) ? 'bg-pink-400 text-white border-pink-400' : 'bg-white dark:bg-transparent text-gray-500 border-gray-200 dark:border-gray-600'}`}>
                       {tag}
                     </button>
                   ))}
                 </div>

                 <textarea 
                   placeholder="Add a note..." 
                   value={note}
                   onChange={(e) => setNote(e.target.value)}
                   className="w-full bg-white dark:bg-white/5 rounded-xl p-3 text-sm text-gray-700 dark:text-white outline-none border border-gray-200 dark:border-gray-600 focus:border-pink-300 transition-colors"
                   rows="3"
                 />
              </div>

              <button onClick={save} className="w-full py-4 rounded-xl bg-pink-400 hover:bg-pink-500 text-white font-bold shadow-lg shadow-pink-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2">
                Save Entry <Heart size={18} fill="currentColor" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-sm bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md rounded-full shadow-lg border border-white/50 dark:border-white/10 px-6 py-4 flex justify-between items-center z-40 transition-colors duration-300">
        <NavIcon icon={<Home size={20} />} onClick={() => onNavigate('home')} />
        <NavIcon icon={<History size={20} />} onClick={() => onNavigate('history')} />
        <NavIcon icon={<Calendar size={20} />} onClick={() => onNavigate('calendar')} />
        <NavIcon icon={<BarChart2 size={20} />} active onClick={() => onNavigate('insights')} />
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