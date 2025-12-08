import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, Bell } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function NotificationsModal({ isOpen, onClose, user }) {
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    if (!user || !isOpen) return;

    // Listen to the 'notifications' sub-collection for this user
    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("timestamp", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [user, isOpen]);

  const clearNotification = async (id) => {
    try {
      await deleteDoc(doc(db, "users", user.uid, "notifications", id));
    } catch (e) { console.error(e); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-midnight-card w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative z-10 max-h-[80vh] flex flex-col"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-700 dark:text-white flex items-center gap-2">
            <Bell size={20} className="text-pink-500" /> Notifications
          </h3>
          <button onClick={onClose} className="p-1 bg-gray-100 dark:bg-white/10 rounded-full">
            <X size={20} className="text-gray-500 dark:text-gray-300" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {notifs.length === 0 ? (
            <div className="text-center text-gray-400 py-10">
              <p>No new notifications 💤</p>
            </div>
          ) : (
            notifs.map((n) => (
              <motion.div 
                key={n.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-pink-50 dark:bg-pink-900/10 p-3 rounded-xl flex items-start gap-3 relative group"
              >
                <div className={`p-2 rounded-full ${n.type === 'hug' ? 'bg-pink-200 text-pink-600' : 'bg-blue-100 text-blue-500'}`}>
                  {n.type === 'hug' ? <Heart size={16} fill="currentColor" /> : <MessageCircle size={16} />}
                </div>
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                    <span className="font-bold">{n.senderName}</span> {n.message}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {n.timestamp?.toDate ? n.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                  </p>
                </div>
                <button 
                  onClick={() => clearNotification(n.id)}
                  className="absolute top-2 right-2 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}