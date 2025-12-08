import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, Bell, CheckCheck, UserPlus, Check } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, doc, deleteDoc, writeBatch, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

export default function NotificationsModal({ isOpen, onClose, user }) {
  const [items, setItems] = useState([]); // Combined list of Notifs + Requests

  useEffect(() => {
    if (!user) return;

    // 1. LISTEN TO NOTIFICATIONS (Hugs)
    const notifQuery = query(collection(db, "users", user.uid, "notifications"), orderBy("timestamp", "desc"), limit(20));
    const unsubNotifs = onSnapshot(notifQuery, (snap) => {
      const notifs = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(), 
        isRequest: false // Flag to distinguish
      }));
      mergeAndSet(notifs, 'notifs');
    });

    // 2. LISTEN TO FRIEND REQUESTS
    const reqQuery = query(collection(db, "users", user.uid, "requests"));
    const unsubReqs = onSnapshot(reqQuery, (snap) => {
      const requests = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(), 
        isRequest: true, // Flag to distinguish
        message: "sent you a friend request!"
      }));
      mergeAndSet(requests, 'requests');
    });

    // Helper to merge two live lists
    let currentNotifs = [];
    let currentReqs = [];
    
    const mergeAndSet = (newData, type) => {
      if (type === 'notifs') currentNotifs = newData;
      if (type === 'requests') currentReqs = newData;
      
      // Combine and sort by timestamp (newest first)
      const combined = [...currentReqs, ...currentNotifs].sort((a, b) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : Date.now();
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : Date.now();
        return tB - tA;
      });
      setItems(combined);
    };

    return () => { unsubNotifs(); unsubReqs(); };
  }, [user]);

  // --- ACTIONS ---

  const clearNotification = async (id, isRequest) => {
    try { 
      const collectionName = isRequest ? "requests" : "notifications";
      await deleteDoc(doc(db, "users", user.uid, collectionName, id)); 
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    if (items.length === 0) return;
    try {
      const batch = writeBatch(db);
      // Delete all notifications (Keep requests though! don't delete requests via 'clear all')
      const notifsOnly = items.filter(i => !i.isRequest);
      
      notifsOnly.forEach(item => {
        const ref = doc(db, "users", user.uid, "notifications", item.id);
        batch.delete(ref);
      });
      
      await batch.commit();
    } catch (e) { console.error(e); }
  };

  const handleAcceptRequest = async (req) => {
    try {
      // 1. Add to MY friends
      await updateDoc(doc(db, "users", user.uid), {
        friends: arrayUnion({ uid: req.senderUid, name: req.senderName })
      });
      // 2. Add to THEIR friends
      await updateDoc(doc(db, "users", req.senderUid), {
        friends: arrayUnion({ uid: user.uid, name: user.displayName })
      });
      // 3. Delete Request
      await deleteDoc(doc(db, "users", user.uid, "requests", req.id));
      
      // 4. (Optional) Send them a "Hug" back automatically as a notification
      // await addDoc(...) 
    } catch (e) { console.error("Error accepting", e); }
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

        {items.some(i => !i.isRequest) && (
          <button 
            onClick={markAllRead}
            className="mb-4 text-xs font-bold text-pink-500 flex items-center gap-1 hover:text-pink-600 self-end"
          >
            <CheckCheck size={14} /> Clear Notifications
          </button>
        )}
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide">
          {items.length === 0 ? (
            <div className="text-center text-gray-400 py-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-3">
                 <Bell size={24} className="opacity-20" />
              </div>
              <p>No new updates.</p>
            </div>
          ) : (
            items.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl flex items-start gap-3 relative group border transition-colors ${item.isRequest ? 'bg-pink-50 dark:bg-pink-900/20 border-pink-100' : 'bg-gray-50 dark:bg-black/20 border-transparent'}`}
              >
                {/* ICON */}
                <div className={`p-2 rounded-full shrink-0 ${item.isRequest ? 'bg-pink-200 text-pink-600' : item.type === 'hug' ? 'bg-pink-100 text-pink-500' : 'bg-blue-100 text-blue-500'}`}>
                  {item.isRequest ? <UserPlus size={16} /> : item.type === 'hug' ? <Heart size={16} fill="currentColor" /> : <MessageCircle size={16} />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-200 leading-tight">
                    <span className="font-bold">{item.senderName}</span> {item.message}
                  </p>
                  
                  {/* REQUEST ACTIONS */}
                  {item.isRequest && (
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={() => handleAcceptRequest(item)}
                        className="flex-1 bg-pink-500 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-pink-600 flex items-center justify-center gap-1"
                      >
                        <Check size={12} /> Accept
                      </button>
                      <button 
                        onClick={() => clearNotification(item.id, true)}
                        className="px-3 bg-white dark:bg-white/10 text-gray-500 text-xs font-bold py-1.5 rounded-lg border hover:bg-gray-50"
                      >
                        Ignore
                      </button>
                    </div>
                  )}

                  {!item.isRequest && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                    </p>
                  )}
                </div>

                {/* DELETE BUTTON (Hidden for requests, they use Ignore button) */}
                {!item.isRequest && (
                  <button 
                    onClick={() => clearNotification(item.id, false)}
                    className="absolute top-2 right-2 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                )}
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </>
  );
}