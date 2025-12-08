import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, UserPlus, X, Check, Search, Zap, User, Trash2, Paperclip } from 'lucide-react';
import { db } from './firebase';
import { collection, query, where, getDocs, updateDoc, arrayUnion, doc, addDoc, onSnapshot, getDoc, deleteDoc } from 'firebase/firestore';

// NEW PROP: onViewProfile added here
export default function FriendsPage({ onNavigate, currentUser, userData, showToast, onViewProfile }) {
  
  const myCode = userData?.friendCode || "Loading...";
  const [friendInput, setFriendInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [friendsData, setFriendsData] = useState([]); 

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "users", currentUser.uid, "requests"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    const fetchFriendsLive = async () => {
      if (!userData?.friends || userData.friends.length === 0) {
        setFriendsData([]);
        return;
      }
      const liveData = [];
      for (const friend of userData.friends) {
        try {
          const docSnap = await getDoc(doc(db, "users", friend.uid));
          if (docSnap.exists()) {
            liveData.push({ uid: friend.uid, ...docSnap.data() });
          }
        } catch (e) { console.error(e); }
      }
      setFriendsData(liveData);
    };
    fetchFriendsLive();
  }, [userData]); 

  const handleCopy = () => {
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendRequest = async () => {
    if (!friendInput.trim()) return;
    if (friendInput.toUpperCase() === myCode) { showToast("You can't add yourself!"); return; }
    setLoading(true);
    try {
      const q = query(collection(db, "users"), where("friendCode", "==", friendInput.toUpperCase().trim()));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) { showToast("User not found."); setLoading(false); return; }
      const targetUserDoc = querySnapshot.docs[0];
      if (userData?.friends?.some(f => f.uid === targetUserDoc.id)) { showToast("Already friends!"); setLoading(false); return; }
      await addDoc(collection(db, "users", targetUserDoc.id, "requests"), {
        senderUid: currentUser.uid,
        senderName: userData.displayName || "Unknown",
        senderCode: userData.friendCode,
        senderPhoto: userData.photoURL || null,
        timestamp: new Date()
      });
      showToast("Request Sent!");
      setFriendInput("");
    } catch (error) { console.error(error); showToast("Error sending request."); }
    setLoading(false);
  };

  const handleAccept = async (req) => {
    try {
      await updateDoc(doc(db, "users", currentUser.uid), { friends: arrayUnion({ uid: req.senderUid, name: req.senderName }) });
      await updateDoc(doc(db, "users", req.senderUid), { friends: arrayUnion({ uid: currentUser.uid, name: userData.displayName }) });
      await deleteDoc(doc(db, "users", currentUser.uid, "requests", req.id));
      showToast(`Connected with ${req.senderName}!`);
    } catch (e) { console.error(e); }
  };

  const handleDecline = async (id) => {
    await deleteDoc(doc(db, "users", currentUser.uid, "requests", id));
    showToast("Request declined.");
  };

  const handleRemoveFriend = async (e, friendUid, friendName) => {
    e.stopPropagation(); // Stop clicking the card from opening profile
    if (window.confirm(`Remove ${friendName}?`)) {
      try {
        const newFriends = userData.friends.filter(f => f.uid !== friendUid);
        await updateDoc(doc(db, "users", currentUser.uid), { friends: newFriends });
        showToast(`${friendName} removed.`);
      } catch (e) { console.error(e); }
    }
  };

  const handleSendSticky = async (e, friendUid, friendName) => {
    e.stopPropagation(); // Stop clicking the card from opening profile
    const note = prompt(`Write a short note for ${friendName}'s Home Screen:`);
    if (!note) return;
    try {
      await updateDoc(doc(db, "users", friendUid), {
        stickyNote: {
          message: note,
          sender: userData.displayName || "A friend",
          timestamp: new Date().toISOString()
        }
      });
      showToast("Note Pinned! 📌");
    } catch (e) {
      console.error(e);
      showToast("Failed to pin note.");
    }
  };

  return (
    <div className="min-h-screen bg-[#EBD4F4] dark:bg-midnight-bg pb-24 font-sans selection:bg-pink-200 flex flex-col items-center transition-colors duration-300">
      
      <div className="pt-8 px-6 pb-6 w-full flex items-center justify-between sticky top-0 z-10 bg-[#EBD4F4]/90 dark:bg-midnight-bg/90 backdrop-blur-sm">
        <button onClick={() => onNavigate('home')} className="p-3 bg-white dark:bg-midnight-card rounded-full text-gray-600 dark:text-gray-200 shadow-sm hover:scale-105 transition-all">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-700 dark:text-white">My Circle 💖</h1>
        <div className="w-12"></div>
      </div>

      <div className="w-full max-w-md px-4 space-y-6 mt-4">
        
        {requests.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-pink-100 dark:bg-pink-900/20 rounded-[2rem] p-6 border-2 border-pink-200 dark:border-pink-800">
            <h3 className="text-pink-600 dark:text-pink-300 font-bold mb-4 flex items-center gap-2"><UserPlus size={18}/> Pending Requests</h3>
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req.id} className="bg-white dark:bg-midnight-card p-3 rounded-xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                       {req.senderPhoto ? <img src={req.senderPhoto} className="w-full h-full object-cover"/> : <User size={16}/>}
                    </div>
                    <div>
                      <p className="font-bold text-gray-700 dark:text-white text-sm">{req.senderName}</p>
                      <p className="text-xs text-gray-400">{req.senderCode}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleDecline(req.id)} className="p-2 bg-gray-100 dark:bg-white/10 text-gray-500 rounded-full hover:bg-gray-200"><X size={16}/></button>
                    <button onClick={() => handleAccept(req)} className="p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 shadow-md"><Check size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="bg-white dark:bg-midnight-card rounded-[2rem] p-6 shadow-sm text-center border-2 border-dashed border-pink-200 dark:border-pink-800/30">
          <h3 className="text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-wider mb-2">Your Unique ID</h3>
          <div className="flex items-center justify-center gap-3 bg-pink-50 dark:bg-black/20 rounded-xl p-4 mb-4">
             <span className="text-2xl font-mono font-bold text-gray-700 dark:text-white tracking-widest">{myCode}</span>
          </div>
          <button onClick={handleCopy} className="flex items-center justify-center gap-2 w-full py-2 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 font-bold hover:bg-pink-200">
            {copied ? "Copied!" : "Copy Code"}
          </button>
        </div>

        <div className="bg-white dark:bg-midnight-card rounded-[2rem] p-6 shadow-sm">
          <h3 className="text-gray-600 dark:text-white font-bold mb-4">Find a Friend</h3>
          <div className="flex gap-2">
            <input value={friendInput} onChange={(e) => setFriendInput(e.target.value)} placeholder="Enter ID (e.g. ABHA-9281)" className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 dark:text-white outline-none uppercase" />
            <button onClick={handleSendRequest} disabled={loading} className="bg-pink-400 hover:bg-pink-500 text-white p-3 rounded-xl shadow-md">
              {loading ? "..." : <Search size={24} />}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-gray-500 dark:text-gray-400 font-bold text-sm ml-2">Your Circle ({friendsData.length})</h3>
          <AnimatePresence>
            {friendsData.map((friend) => (
              <motion.div 
                key={friend.uid}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                onClick={() => onViewProfile(friend.uid)} // <--- CLICK TO OPEN PROFILE
                className="bg-white dark:bg-midnight-card p-4 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/20 overflow-hidden border-2 border-white dark:border-white/10">
                    {friend.photoURL ? <img src={friend.photoURL} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xl">{friend.displayName?.[0]}</div>}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-700 dark:text-white">{friend.displayName}</h4>
                    {friend.status ? <p className="text-xs text-pink-500 font-medium flex items-center gap-1"><Zap size={10} fill="currentColor"/> {friend.status}</p> : <p className="text-xs text-gray-400 italic">No status set</p>}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button onClick={(e) => handleSendSticky(e, friend.uid, friend.displayName)} className="p-2 text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 rounded-full transition-colors" title="Send Sticky Note">
                    <Paperclip size={18} />
                  </button>
                  <button onClick={(e) => handleRemoveFriend(e, friend.uid, friend.displayName)} className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-full transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {friendsData.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No friends yet. Share your code!</p>}
        </div>

      </div>
    </div>
  );
}