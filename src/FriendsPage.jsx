import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, History, Calendar, BarChart2, Gift, Copy, UserPlus, X, Check, ChevronLeft } from 'lucide-react';
// FIREBASE
import { db } from './firebase';
import { collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, doc } from 'firebase/firestore';

export default function FriendsPage({ onNavigate, currentUser, userData, showToast }) {
  
  // Use REAL data from App.jsx, or fallback while loading
  const myCode = userData?.friendCode || "Loading...";
  const myFriends = userData?.friends || []; // List of friends from DB

  const [friendInput, setFriendInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- REAL FRIEND ADDING LOGIC ---
  const handleAddFriend = async () => {
    if (friendInput.trim() === "") return;
    if (friendInput.toUpperCase() === myCode) {
      showToast("You can't add yourself! 😅");
      return;
    }

    setLoading(true);
    try {
      // 1. Search for user with this code
      const q = query(collection(db, "users"), where("friendCode", "==", friendInput.toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        showToast("User not found. Check the code!");
        setLoading(false);
        return;
      }

      // 2. Found them! Get their data
      const newFriendDoc = querySnapshot.docs[0];
      const newFriendData = newFriendDoc.data();
      
      // Check if already friends
      const alreadyAdded = myFriends.some(f => f.uid === newFriendDoc.id);
      if (alreadyAdded) {
        showToast("Already in your circle! ❤️");
        setLoading(false);
        return;
      }

      // 3. Update MY document in Firebase to add this friend
      const myDocRef = doc(db, "users", currentUser.uid);
      
      const newFriendObject = {
        uid: newFriendDoc.id,
        name: newFriendData.displayName || "Unknown",
        code: newFriendData.friendCode,
        avatar: newFriendData.photoURL || "👤"
      };

      await updateDoc(myDocRef, {
        friends: arrayUnion(newFriendObject)
      });

      showToast(`Added ${newFriendObject.name}! 🎉`);
      setFriendInput("");

    } catch (error) {
      console.error(error);
      showToast("Error adding friend.");
    }
    setLoading(false);
  };

  const removeFriend = async (friendObj) => {
    if(window.confirm(`Remove ${friendObj.name}?`)) {
      const myDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(myDocRef, {
        friends: arrayRemove(friendObj)
      });
      showToast("Friend removed.");
    }
  };

  return (
    <div className="min-h-screen bg-[#EBD4F4] dark:bg-midnight-bg pb-24 font-sans selection:bg-pink-200 flex flex-col items-center transition-colors duration-300">
      
      {/* Header */}
      <div className="pt-8 px-6 pb-6 w-full flex items-center justify-between sticky top-0 z-10 bg-[#EBD4F4]/90 dark:bg-midnight-bg/90 backdrop-blur-sm">
        <button 
          onClick={() => onNavigate('home')}
          className="p-3 bg-white dark:bg-midnight-card rounded-full text-gray-600 dark:text-gray-200 shadow-sm hover:scale-105 transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-700 dark:text-white">My Circle 💖</h1>
        <div className="w-12"></div>
      </div>

      <div className="w-full max-w-md px-4 space-y-6 mt-4">
        
        {/* CARD 1: MY CODE */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="bg-white dark:bg-midnight-card rounded-[2rem] p-6 shadow-sm text-center border-2 border-dashed border-pink-200 dark:border-pink-800/30 transition-colors duration-300"
        >
          <h3 className="text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-wider mb-2">Share your Unique ID</h3>
          
          <div className="flex items-center justify-center gap-3 bg-pink-50 dark:bg-black/20 rounded-xl p-4 mb-4">
             <span className="text-2xl font-mono font-bold text-gray-700 dark:text-white tracking-widest">
               {myCode}
             </span>
          </div>

          <button 
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 font-bold hover:bg-pink-200 dark:hover:bg-pink-900/60 transition-colors"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? "Copied!" : "Copy Code"}
          </button>
        </motion.div>

        {/* CARD 2: ADD FRIEND */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="bg-white dark:bg-midnight-card rounded-[2rem] p-6 shadow-sm transition-colors duration-300"
        >
          <h3 className="text-gray-600 dark:text-white font-bold mb-4">Add a Friend</h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={friendInput}
              onChange={(e) => setFriendInput(e.target.value)}
              placeholder="Enter ID (e.g. ABHA-9281)"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-200 uppercase placeholder:normal-case"
            />
            <button 
              onClick={handleAddFriend}
              disabled={loading}
              className="bg-pink-400 hover:bg-pink-500 text-white p-3 rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              {loading ? "..." : <UserPlus size={24} />}
            </button>
          </div>
        </motion.div>

        {/* CARD 3: FRIEND LIST */}
        <div className="space-y-3">
          <h3 className="text-gray-500 dark:text-gray-400 font-bold text-sm ml-2">Your Friends ({myFriends.length}/5)</h3>
          
          <AnimatePresence>
            {myFriends.map((friend) => (
              <motion.div 
                key={friend.uid}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-midnight-card p-4 rounded-2xl shadow-sm flex items-center justify-between transition-colors duration-300"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar: Use Google Photo or Initial */}
                  {friend.avatar && friend.avatar.length > 2 ? (
                     <img src={friend.avatar} alt="avatar" className="w-12 h-12 rounded-full border-2 border-pink-100 dark:border-pink-900" />
                  ) : (
                    <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/20 rounded-full flex items-center justify-center text-xl">
                      {friend.name[0]}
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-bold text-gray-700 dark:text-white">{friend.name}</h4>
                    <span className="text-xs text-gray-400 font-mono bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded-md">
                      {friend.code}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={() => removeFriend(friend)}
                  className="p-2 text-gray-300 hover:text-red-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {myFriends.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-4">No friends added yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}