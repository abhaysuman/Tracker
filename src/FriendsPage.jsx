import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, History, Calendar, BarChart2, Gift, Copy, UserPlus, X, Check, ChevronLeft } from 'lucide-react';

export default function FriendsPage({ onNavigate }) {
  const MY_CODE = "LOVE-8821"; 
  const [friendInput, setFriendInput] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [friends, setFriends] = useState([
    { id: 1, name: "My Love", code: "JULI-1029", avatar: "👩" },
    { id: 2, name: "Bestie", code: "ALEX-4491", avatar: "🦊" }
  ]);

  const handleCopy = () => {
    navigator.clipboard.writeText(MY_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFriend = () => {
    if (friendInput.trim() === "") return;
    const newFriend = {
      id: Date.now(),
      name: "New Friend",
      code: friendInput.toUpperCase(),
      avatar: "🐻"
    };
    setFriends([...friends, newFriend]);
    setFriendInput("");
    alert(`Friend ${newFriend.code} added!`);
  };

  const removeFriend = (id) => {
    if(window.confirm("Remove this friend?")) {
      setFriends(friends.filter(f => f.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-[#EBD4F4] dark:bg-midnight-bg pb-24 font-sans selection:bg-pink-200 flex flex-col items-center transition-colors duration-300">
      
      {/* Header with Back Button since top-right is empty now */}
      <div className="pt-8 px-6 pb-6 w-full flex items-center justify-between sticky top-0 z-10 bg-[#EBD4F4]/90 dark:bg-midnight-bg/90 backdrop-blur-sm">
        <button 
          onClick={() => onNavigate('home')}
          className="p-3 bg-white dark:bg-midnight-card rounded-full text-gray-600 dark:text-gray-200 shadow-sm hover:scale-105 transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-700 dark:text-white">My Circle 💖</h1>
        <div className="w-12"></div> {/* Spacer */}
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
               {MY_CODE}
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
              placeholder="Enter ID (e.g. ALEX-123)"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-200 uppercase placeholder:normal-case"
            />
            <button 
              onClick={handleAddFriend}
              className="bg-pink-400 hover:bg-pink-500 text-white p-3 rounded-xl shadow-md transition-colors"
            >
              <UserPlus size={24} />
            </button>
          </div>
        </motion.div>

        {/* CARD 3: FRIEND LIST */}
        <div className="space-y-3">
          <h3 className="text-gray-500 dark:text-gray-400 font-bold text-sm ml-2">Your Friends ({friends.length}/5)</h3>
          
          <AnimatePresence>
            {friends.map((friend) => (
              <motion.div 
                key={friend.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-midnight-card p-4 rounded-2xl shadow-sm flex items-center justify-between transition-colors duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/20 rounded-full flex items-center justify-center text-xl">
                    {friend.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-700 dark:text-white">{friend.name}</h4>
                    <span className="text-xs text-gray-400 font-mono bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded-md">
                      {friend.code}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={() => removeFriend(friend.id)}
                  className="p-2 text-gray-300 hover:text-red-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </div>

      {/* --- STANDARD BOTTOM NAVIGATION (5 Icons) --- */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-sm bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md rounded-full shadow-lg border border-white/50 dark:border-white/10 px-6 py-4 flex justify-between items-center z-50 transition-colors duration-300">
        <NavIcon icon={<Home size={20} />} onClick={() => onNavigate('home')} />
        <NavIcon icon={<History size={20} />} onClick={() => onNavigate('history')} />
        <NavIcon icon={<Calendar size={20} />} onClick={() => onNavigate('calendar')} />
        <NavIcon icon={<BarChart2 size={20} />} onClick={() => onNavigate('insights')} />
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