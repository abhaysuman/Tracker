import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, ChevronLeft, Send, Sparkles, X, User } from 'lucide-react';
import { db, auth } from './firebase';
import { collection, addDoc, query, onSnapshot, orderBy, deleteDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';

export default function SurprisePage({ onNavigate }) {
  const [mode, setMode] = useState('list'); // 'list', 'create', 'view'
  const [surprises, setSurprises] = useState([]);
  const [myFriends, setMyFriends] = useState([]); // List of friends to choose from
  const [selectedFriend, setSelectedFriend] = useState(null); // Who are we sending to?
  const [newNote, setNewNote] = useState('');
  const [selectedSurprise, setSelectedSurprise] = useState(null);
  
  // Scratch Card State
  const [scratched, setScratched] = useState(0);

  // 1. Load MY Received Surprises (To View)
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, "users", auth.currentUser.uid, "surprises"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSurprises(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 2. Load MY Friends List (To Send)
  useEffect(() => {
    if (!auth.currentUser) return;
    const fetchFriends = async () => {
      const docSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (docSnap.exists()) {
        setMyFriends(docSnap.data().friends || []);
      }
    };
    fetchFriends();
  }, []);

  // 3. Send Logic (Writes to FRIEND'S collection)
  const handleSendSurprise = async () => {
    if (!newNote.trim() || !selectedFriend) return;
    
    try {
      // WRITE TO THE FRIEND'S ID
      await addDoc(collection(db, "users", selectedFriend.uid, "surprises"), {
        message: newNote,
        sender: auth.currentUser.displayName || "Secret Admirer",
        timestamp: serverTimestamp(),
        opened: false
      });
      alert(`Surprise sent to ${selectedFriend.name}! 🎁`);
      setNewNote('');
      setSelectedFriend(null);
      setMode('list');
    } catch (e) {
      console.error("Error sending surprise:", e);
      alert("Failed to send.");
    }
  };

  const openSurprise = (s) => {
    setSelectedSurprise(s);
    setScratched(0);
    setMode('view');
  };

  const handleScratch = (e) => {
    if (scratched > 100) return;
    setScratched(prev => prev + 4); // Faster scratch for better UX
  };

  const deleteSurprise = async () => {
    if (selectedSurprise) {
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "surprises", selectedSurprise.id));
      setMode('list');
      setSelectedSurprise(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#EBD4F4] dark:bg-midnight-bg pb-24 font-sans flex flex-col items-center transition-colors duration-300">
      
      {/* Header */}
      <div className="pt-8 px-6 pb-6 w-full flex items-center justify-between sticky top-0 z-10 bg-[#EBD4F4]/90 dark:bg-midnight-bg/90 backdrop-blur-sm">
        <button onClick={() => mode === 'list' ? onNavigate('home') : setMode('list')} className="p-3 bg-white dark:bg-midnight-card rounded-full text-gray-600 dark:text-gray-200 shadow-sm hover:scale-105 transition-all">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-700 dark:text-white">Surprise Box 🎁</h1>
        <div className="w-12"></div>
      </div>

      <div className="w-full max-w-md px-4 mt-4">
        
        <AnimatePresence mode="wait">
          
          {/* --- VIEW 1: LIST OF GIFTS --- */}
          {mode === 'list' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              
              <button onClick={() => setMode('create')} className="w-full py-4 mb-6 bg-gradient-to-r from-pink-400 to-purple-400 rounded-2xl text-white font-bold shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
                <Sparkles size={20} /> Send a Surprise
              </button>

              <h3 className="text-gray-500 dark:text-gray-400 font-bold text-sm mb-3 uppercase tracking-wider ml-2">My Gift Box</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {surprises.length === 0 ? (
                  <div className="col-span-2 py-10 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 dark:border-white/10 rounded-3xl">
                    <Gift size={48} className="mb-2 opacity-20" />
                    <p className="text-sm">No surprises yet.</p>
                  </div>
                ) : (
                  surprises.map(s => (
                    <motion.div 
                      key={s.id} 
                      onClick={() => openSurprise(s)}
                      whileHover={{ scale: 1.05 }}
                      className="aspect-square bg-white dark:bg-midnight-card rounded-3xl shadow-sm flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-pink-200 dark:border-white/10 group"
                    >
                      <Gift size={40} className="text-pink-400 mb-2 group-hover:animate-bounce" />
                      <span className="text-xs font-bold text-gray-400">From {s.sender}</span>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* --- VIEW 2: CREATE & SELECT FRIEND --- */}
          {mode === 'create' && (
            <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="bg-white dark:bg-midnight-card p-6 rounded-[2rem] shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Send to whom?</h2>
              
              {/* FRIEND SELECTOR */}
              <div className="flex gap-3 overflow-x-auto pb-4 mb-2 scrollbar-hide">
                {myFriends.length === 0 && <p className="text-sm text-gray-400">Add friends first!</p>}
                {myFriends.map(friend => (
                  <button 
                    key={friend.uid}
                    onClick={() => setSelectedFriend(friend)}
                    className={`flex flex-col items-center shrink-0 space-y-1 transition-opacity ${selectedFriend?.uid === friend.uid ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-100'}`}
                  >
                    <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${selectedFriend?.uid === friend.uid ? 'border-pink-500' : 'border-gray-200 dark:border-gray-600'}`}>
                       {friend.photoURL ? <img src={friend.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center"><User size={20}/></div>}
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 truncate max-w-[60px]">{friend.name}</span>
                  </button>
                ))}
              </div>

              {selectedFriend && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                  <div className="border-t border-gray-100 dark:border-white/10 my-4"></div>
                  <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Write a secret note for <span className="text-pink-500">{selectedFriend.name}</span></h3>
                  <textarea 
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Type something sweet..."
                    className="w-full h-32 bg-gray-50 dark:bg-black/20 rounded-xl p-4 text-gray-700 dark:text-white outline-none resize-none mb-4 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-900 transition-all"
                  />
                  <button onClick={handleSendSurprise} className="w-full py-3 bg-pink-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-pink-600 transition-colors shadow-lg shadow-pink-200 dark:shadow-none">
                    <Send size={18} /> Wrap & Send
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* --- VIEW 3: SCRATCH CARD --- */}
          {mode === 'view' && selectedSurprise && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full">
              <div className="relative w-full aspect-[4/5] bg-white dark:bg-midnight-card rounded-[2rem] shadow-2xl overflow-hidden flex items-center justify-center text-center p-8 border-4 border-white dark:border-gray-800">
                
                {/* The Hidden Content */}
                <div>
                  <Sparkles size={40} className="text-yellow-400 mx-auto mb-4 animate-spin-slow" />
                  <p className="text-2xl font-handwriting text-gray-800 dark:text-white leading-relaxed">
                    "{selectedSurprise.message}"
                  </p>
                  <p className="text-sm text-gray-400 mt-6 font-bold uppercase">- {selectedSurprise.sender}</p>
                </div>

                {/* The Scratch Layer */}
                {scratched < 100 && (
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-br from-pink-400 to-purple-500 z-10 flex flex-col items-center justify-center cursor-pointer select-none"
                    onMouseMove={handleScratch}
                    onTouchMove={handleScratch}
                    onClick={handleScratch}
                    animate={{ opacity: 1 - (scratched / 100) }}
                  >
                    <Gift size={64} className="text-white mb-4 animate-bounce" />
                    <p className="text-white font-bold text-lg">Rub to Reveal!</p>
                    <p className="text-white/60 text-xs mt-2">({Math.floor(scratched)}%)</p>
                  </motion.div>
                )}
              </div>

              <button onClick={deleteSurprise} className="mt-6 w-full py-3 bg-white dark:bg-midnight-card text-red-400 font-bold rounded-xl shadow-sm hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                Delete & Close
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}