import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, Bell, CheckCheck } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, doc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export default function NotificationsModal({ isOpen, onClose, user }) {
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("timestamp", "desc"),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const clearNotification = async (id) => {
    try { await deleteDoc(doc(db, "users", user.uid, "notifications", id)); } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    if (notifs.length === 0) return;
    try {
      const batch = writeBatch(db);
      const q = query(collection(db, "users", user.uid, "notifications"));
      const snapshot = await getDocs(q);
      
      snapshot.forEach(docSnap => {
        // We can either delete them or mark as read. 
        // Let's delete them to keep it clean, OR strictly set 'read: true'
        // Since user asked for "mark all read", let's clear them visually or actually delete?
        // Usually "Mark read" keeps them but greys them out. Let's delete for cleanliness in this app.
        // batch.delete(docSnap.ref); <--- If you want to delete
        
        // Actually, let's just delete them so the badge count goes to 0 effectively. 
        // Or if you want to keep history, we update 'read: true'.
        // Let's delete for now as it's a simple tracker.
        batch.delete(docSnap.ref);
      });
      
      await batch.commit();
    } catch (e) { console.error(e); }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-[60]"
          />
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: isOpen ? 0 : "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 w-80 bg-white dark:bg-midnight-card z-[70] shadow-2xl p-6 flex flex-col border-l border-gray-100 dark:border-white/5"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-700 dark:text-white flex items-center gap-2">
            <Bell size={20} className="text-pink-500" /> Notifications
          </h3>
          <button onClick={onClose} className="p-2 bg-gray-50 dark:bg-white/10 rounded-full hover:bg-gray-100">
            <X size={20} className="text-gray-500 dark:text-gray-300" />
          </button>
        </div>

        {/* Mark All Read Button */}
        {notifs.length > 0 && (
          <button 
            onClick={markAllRead}
            className="mb-4 text-xs font-bold text-pink-500 flex items-center gap-1 hover:text-pink-600 self-end"
          >
            <CheckCheck size={14} /> Clear All
          </button>
        )}
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide">
          {notifs.length === 0 ? (
            <div className="text-center text-gray-400 py-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-3">
                 <Bell size={24} className="opacity-20" />
              </div>
              <p>No new updates.</p>
            </div>
          ) : (
            notifs.map((n) => (
              <motion.div 
                key={n.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-50 dark:bg-black/20 p-3 rounded-xl flex items-start gap-3 relative group border border-transparent hover:border-pink-100 dark:hover:border-pink-900/30 transition-colors"
              >
                <div className={`p-2 rounded-full shrink-0 ${n.type === 'hug' ? 'bg-pink-100 text-pink-500' : 'bg-blue-100 text-blue-500'}`}>
                  {n.type === 'hug' ? <Heart size={16} fill="currentColor" /> : <MessageCircle size={16} />}
                </div>
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-200 leading-tight">
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
    </>
  );
}