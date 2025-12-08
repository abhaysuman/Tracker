import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChevronRight, ChevronLeft, MessageCircle, Zap, Heart } from 'lucide-react';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';

export default function FriendActivityTab({ friends = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedItems, setFeedItems] = useState([]); // Mixed list of moods & hugs
  const [loading, setLoading] = useState(false);

  const sendHug = async (friendUid, friendName) => {
    try {
      await addDoc(collection(db, "users", friendUid, "notifications"), {
        type: 'hug',
        message: 'sent you a virtual hug! 🫂',
        senderUid: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || "Someone",
        timestamp: serverTimestamp(),
        read: false
      });
      alert(`Hug sent to ${friendName}! ❤️`);
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      let mixedFeed = [];

      // 1. GET FRIEND MOODS
      for (const friend of friends) {
        try {
          const friendDocRef = doc(db, "users", friend.uid);
          const friendSnap = await getDoc(friendDocRef);
          
          if (friendSnap.exists()) {
            const data = friendSnap.data();
            if (data.isPrivate) continue;

            const history = data.history || {};
            const dates = Object.keys(history).sort((a, b) => new Date(b) - new Date(a));
            
            if (dates.length > 0) {
              const latestDay = history[dates[0]];
              const latestMood = latestDay[latestDay.length - 1];
              
              mixedFeed.push({
                type: 'mood',
                id: `mood-${friend.uid}`,
                uid: friend.uid,
                name: data.displayName || friend.name,
                avatar: data.photoURL || friend.avatar,
                status: data.status || "",
                mood: latestMood.emoji,
                label: latestMood.label,
                note: latestMood.note,
                timeStr: latestMood.timestamp, // "10:30 AM"
                // Create a comparable date object (approximate for sorting)
                sortDate: new Date(`${dates[0]} ${latestMood.timestamp}`).getTime() || 0
              });
            }
          }
        } catch (e) { console.error(e); }
      }

      // 2. GET HUG NOTIFICATIONS (Sent to ME)
      if (auth.currentUser) {
        try {
          const q = query(
            collection(db, "users", auth.currentUser.uid, "notifications"),
            orderBy("timestamp", "desc"),
            limit(10)
          );
          const notifsSnap = await getDocs(q);
          
          notifsSnap.forEach(doc => {
            const data = doc.data();
            if (data.type === 'hug') {
              mixedFeed.push({
                type: 'hug',
                id: doc.id,
                name: data.senderName,
                avatar: null, // Could fetch, but keeping simple
                message: "sent you a hug!",
                timeStr: "Recently",
                sortDate: data.timestamp?.toMillis() || Date.now()
              });
            }
          });
        } catch (e) { console.error("Error fetching notifications", e); }
      }

      // 3. SORT BY DATE (Newest first)
      mixedFeed.sort((a, b) => b.sortDate - a.sortDate);
      setFeedItems(mixedFeed);
      setLoading(false);
    };

    if (isOpen) fetchFeed();
  }, [isOpen, friends]);

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        initial={{ x: -100 }} animate={{ x: isOpen ? -100 : 0 }}
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
        initial={{ x: "-100%" }} animate={{ x: isOpen ? 0 : "-100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed left-0 top-0 bottom-0 w-80 bg-[#FDF7FD] dark:bg-midnight-bg z-50 shadow-2xl border-r border-pink-100 dark:border-white/10 p-6 flex flex-col"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-700 dark:text-white flex items-center gap-2">
            Activity Feed
          </h2>
          <button onClick={() => setIsOpen(false)} className="p-2 bg-white dark:bg-white/10 rounded-full shadow-sm">
            <ChevronLeft size={20} className="text-gray-500 dark:text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
          {loading ? <div className="text-center text-gray-400 mt-10">Updating...</div> : feedItems.length === 0 ? <div className="text-center mt-10 opacity-60"><div className="text-4xl mb-2">😴</div><p className="text-sm text-gray-500">No activity yet.</p></div> : (
            feedItems.map((item) => (
              <motion.div key={item.id} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`p-4 rounded-2xl shadow-sm border relative ${item.type === 'hug' ? 'bg-pink-50 dark:bg-pink-900/10 border-pink-200' : 'bg-white dark:bg-midnight-card border-gray-50 dark:border-white/5'}`}>
                
                {/* --- HUG CARD --- */}
                {item.type === 'hug' ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-200 flex items-center justify-center text-pink-600">
                      <Heart size={20} fill="currentColor" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-700 dark:text-white">{item.name}</p>
                      <p className="text-xs text-pink-500">Sent you a big hug! 🫂</p>
                    </div>
                  </div>
                ) : (
                  /* --- MOOD CARD --- */
                  <div className="flex items-start gap-3">
                    <button 
                      onClick={() => sendHug(item.uid, item.name)}
                      className="absolute top-4 right-4 text-pink-300 hover:text-pink-500 hover:scale-110 transition-all p-2 bg-pink-50 dark:bg-pink-900/20 rounded-full"
                    >
                      <Heart size={16} fill="currentColor" />
                    </button>

                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                      {item.avatar ? <img src={item.avatar} className="w-full h-full object-cover" /> : item.name[0]}
                    </div>
                    <div className="flex-1 min-w-0 pr-8">
                      <h4 className="font-bold text-gray-700 dark:text-white text-sm truncate">{item.name}</h4>
                      {item.status && <p className="text-[10px] text-pink-500 font-medium flex items-center gap-1"><Zap size={8} /> {item.status}</p>}
                      
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-2xl">{item.mood}</span>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{item.label}</span>
                      </div>
                      {item.note && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black/20 p-2 rounded-lg italic relative">
                          <MessageCircle size={10} className="absolute -top-1 -right-1 text-pink-300" />"{item.note}"
                        </div>
                      )}
                      <span className="text-[10px] text-gray-300 block mt-2 text-right">{item.timeStr}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </>
  );
}