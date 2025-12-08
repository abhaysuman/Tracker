import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChevronRight, ChevronLeft, MessageCircle, Zap } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function FriendActivityTab({ friends = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUpdates = async () => {
      if (friends.length === 0) return;
      setLoading(true);
      const newUpdates = [];

      for (const friend of friends) {
        try {
          const friendDocRef = doc(db, "users", friend.uid);
          const friendSnap = await getDoc(friendDocRef);
          
          if (friendSnap.exists()) {
            const data = friendSnap.data();
            
            // --- PRIVACY CHECK ---
            if (data.isPrivate) continue; // Skip if private mode is ON

            const history = data.history || {};
            const dates = Object.keys(history).sort((a, b) => new Date(b) - new Date(a));
            
            if (dates.length > 0) {
              const latestDay = history[dates[0]];
              const latestMood = latestDay[latestDay.length - 1];
              
              newUpdates.push({
                uid: friend.uid,
                name: data.displayName || friend.name,
                avatar: data.photoURL || friend.avatar,
                status: data.status || "", // <--- Fetch Status
                mood: latestMood.emoji,
                label: latestMood.label,
                note: latestMood.note,
                time: latestMood.timestamp,
                date: dates[0] 
              });
            }
          }
        } catch (e) { console.error("Error fetching friend:", e); }
      }
      setUpdates(newUpdates.sort((a, b) => b.date.localeCompare(a.date)));
      setLoading(false);
    };

    if (isOpen) fetchUpdates();
  }, [isOpen, friends]);

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        initial={{ x: -100 }}
        animate={{ x: isOpen ? -100 : 0 }}
        className="fixed left-0 top-32 z-40 bg-white dark:bg-midnight-card pr-4 pl-3 py-3 rounded-r-2xl shadow-lg border-y border-r border-pink-100 dark:border-white/10 flex items-center gap-2 group cursor-pointer hover:pr-6 transition-all"
      >
        <div className="relative">
          <Bell size={20} className="text-gray-500 dark:text-gray-300 group-hover:text-pink-500 transition-colors" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
        </div>
        <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
      </motion.button>

      <AnimatePresence>
        {isOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-40" />}
      </AnimatePresence>

      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: isOpen ? 0 : "-100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed left-0 top-0 bottom-0 w-80 bg-[#FDF7FD] dark:bg-midnight-bg z-50 shadow-2xl border-r border-pink-100 dark:border-white/10 p-6 flex flex-col"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-700 dark:text-white flex items-center gap-2">
            Friend Activity <span className="text-xs bg-pink-100 dark:bg-pink-900 text-pink-500 px-2 py-1 rounded-full">{updates.length}</span>
          </h2>
          <button onClick={() => setIsOpen(false)} className="p-2 bg-white dark:bg-white/10 rounded-full shadow-sm">
            <ChevronLeft size={20} className="text-gray-500 dark:text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
          {loading ? <div className="text-center text-gray-400 mt-10">Checking statuses...</div> : updates.length === 0 ? <div className="text-center mt-10 opacity-60"><div className="text-4xl mb-2">😴</div><p className="text-sm text-gray-500">No updates yet.</p></div> : (
            updates.map((update, idx) => (
              <motion.div key={`${update.uid}-${idx}`} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: idx * 0.1 }} className="bg-white dark:bg-midnight-card p-4 rounded-2xl shadow-sm border border-gray-50 dark:border-white/5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                    {update.avatar ? <img src={update.avatar} className="w-full h-full object-cover" /> : update.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-700 dark:text-white text-sm truncate">{update.name}</h4>
                        {/* STATUS DISPLAY */}
                        {update.status && <p className="text-[10px] text-pink-500 font-medium flex items-center gap-1"><Zap size={8} /> {update.status}</p>}
                      </div>
                      <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{update.time}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-2xl">{update.mood}</span>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{update.label}</span>
                    </div>
                    {update.note && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black/20 p-2 rounded-lg italic relative">
                        <MessageCircle size={10} className="absolute -top-1 -right-1 text-pink-300" />"{update.note}"
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </>
  );
}