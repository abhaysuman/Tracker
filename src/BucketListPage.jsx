import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, Check, Trash2, Calendar, User } from 'lucide-react';
import { db, auth } from './firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDoc, orderBy } from 'firebase/firestore';

export default function BucketListPage({ onNavigate }) {
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [view, setView] = useState('friends'); // 'friends' or 'list'

  // 1. Load Friends
  useEffect(() => {
    if (!auth.currentUser) return;
    const fetchFriends = async () => {
      const docSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (docSnap.exists()) setFriends(docSnap.data().friends || []);
    };
    fetchFriends();
  }, []);

  // 2. Load Shared List (Real-time)
  useEffect(() => {
    if (!selectedFriend || !auth.currentUser) return;
    
    // Create a unique ID for the pair (alphabetical order ensures both see same list)
    const pairId = [auth.currentUser.uid, selectedFriend.uid].sort().join("_");
    const listRef = collection(db, "bucket_lists", pairId, "items");
    const q = query(listRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [selectedFriend]);

  const addItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim() || !selectedFriend) return;
    
    const pairId = [auth.currentUser.uid, selectedFriend.uid].sort().join("_");
    await addDoc(collection(db, "bucket_lists", pairId, "items"), {
      text: newItem,
      completed: false,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser.uid
    });
    setNewItem("");
  };

  const toggleItem = async (item) => {
    const pairId = [auth.currentUser.uid, selectedFriend.uid].sort().join("_");
    await updateDoc(doc(db, "bucket_lists", pairId, "items", item.id), {
      completed: !item.completed
    });
  };

  const deleteItem = async (itemId) => {
    if(!window.confirm("Remove this item?")) return;
    const pairId = [auth.currentUser.uid, selectedFriend.uid].sort().join("_");
    await deleteDoc(doc(db, "bucket_lists", pairId, "items", itemId));
  };

  return (
    <div className="min-h-screen bg-[#EBD4F4] dark:bg-midnight-bg pb-24 font-sans flex flex-col items-center transition-colors duration-300">
      
      {/* Header */}
      <div className="pt-8 px-6 pb-6 w-full flex items-center justify-between sticky top-0 z-10 bg-[#EBD4F4]/90 dark:bg-midnight-bg/90 backdrop-blur-sm">
        <button onClick={() => view === 'list' ? setView('friends') : onNavigate('home')} className="p-3 bg-white dark:bg-midnight-card rounded-full text-gray-600 dark:text-gray-200 shadow-sm hover:scale-105 transition-all">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-700 dark:text-white">
          {view === 'list' ? `List with ${selectedFriend?.name}` : "Shared Bucket List"}
        </h1>
        <div className="w-12"></div>
      </div>

      <div className="w-full max-w-md px-4 mt-4">
        
        <AnimatePresence mode="wait">
          {/* VIEW 1: SELECT FRIEND */}
          {view === 'friends' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h3 className="text-gray-500 font-bold text-sm mb-4 uppercase tracking-wider ml-2">Select a Partner</h3>
              <div className="space-y-3">
                {friends.length === 0 && <p className="text-center text-gray-400 mt-10">Add friends to start a list!</p>}
                {friends.map(friend => (
                  <div 
                    key={friend.uid} 
                    onClick={() => { setSelectedFriend(friend); setView('list'); }}
                    className="bg-white dark:bg-midnight-card p-4 rounded-2xl shadow-sm flex items-center gap-4 cursor-pointer hover:scale-[1.02] transition-transform"
                  >
                    <div className="w-12 h-12 rounded-full bg-pink-100 overflow-hidden">
                       {friend.photoURL ? <img src={friend.photoURL} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><User size={20} className="text-pink-400"/></div>}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800 dark:text-white">{friend.name}</h4>
                      <p className="text-xs text-gray-400">Tap to view shared list</p>
                    </div>
                    <ChevronLeft size={20} className="rotate-180 text-gray-300" />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* VIEW 2: THE LIST */}
          {view === 'list' && selectedFriend && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              
              {/* Input */}
              <form onSubmit={addItem} className="flex gap-2 mb-6">
                <input 
                  value={newItem} 
                  onChange={(e) => setNewItem(e.target.value)} 
                  placeholder="Add a goal, place, or movie..." 
                  className="flex-1 bg-white dark:bg-midnight-card p-4 rounded-2xl shadow-sm outline-none text-gray-700 dark:text-white placeholder-gray-400"
                  autoFocus
                />
                <button type="submit" className="bg-pink-500 text-white p-4 rounded-2xl shadow-lg shadow-pink-500/30 hover:scale-105 transition-transform">
                  <Plus size={24} />
                </button>
              </form>

              {/* Items */}
              <div className="space-y-3">
                {items.length === 0 && <p className="text-center text-gray-400 italic mt-8">Your list is empty. Dream big!</p>}
                
                {items.map(item => (
                  <motion.div 
                    layout
                    key={item.id} 
                    className={`p-4 rounded-2xl flex items-center gap-3 transition-all ${item.completed ? 'bg-gray-100 dark:bg-white/5 opacity-60' : 'bg-white dark:bg-midnight-card shadow-sm'}`}
                  >
                    <button 
                      onClick={() => toggleItem(item)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${item.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}
                    >
                      {item.completed && <Check size={14} strokeWidth={3} />}
                    </button>
                    
                    <span className={`flex-1 font-medium ${item.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-white'}`}>
                      {item.text}
                    </span>

                    <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </motion.div>
                ))}
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}