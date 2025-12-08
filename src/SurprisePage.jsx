import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, ChevronLeft, Send, Sparkles, X } from 'lucide-react';
import { db, auth } from './firebase';
import { collection, addDoc, query, onSnapshot, orderBy, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

export default function SurprisePage({ onNavigate }) {
  const [mode, setMode] = useState('list'); // 'list', 'create', 'view'
  const [surprises, setSurprises] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [selectedSurprise, setSelectedSurprise] = useState(null);
  
  // Scratch Card State
  const [scratched, setScratched] = useState(0);

  // Load Surprises
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, "users", auth.currentUser.uid, "surprises"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSurprises(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleSendSurprise = async () => {
    if (!newNote.trim()) return;
    // For demo, we save it to CURRENT user so you can see it. 
    // In real app, you'd save to FRIEND's collection.
    await addDoc(collection(db, "users", auth.currentUser.uid, "surprises"), {
      message: newNote,
      sender: auth.currentUser.displayName || "Secret Admirer",
      timestamp: serverTimestamp(),
      opened: false
    });
    setNewNote('');
    setMode('list');
  };

  const openSurprise = (s) => {
    setSelectedSurprise(s);
    setScratched(0);
    setMode('view');
  };

  const handleScratch = (e) => {
    if (scratched > 100) return;
    setScratched(prev => prev + 2.5); // Increase scratch progress
  };

  const deleteSurprise = async () => {
    if (selectedSurprise) {
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "surprises", selectedSurprise.id));
      setMode('list');
      setSelectedSurprise(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#EBD4F4] dark:bg-midnight-bg pb-24 font-sans flex flex-col items-center">
      
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
          {mode === 'list' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              
              {/* Create New Button */}
              <button onClick={() => setMode('create')} className="w-full py-4 mb-6 bg-gradient-to-r from-pink-400 to-purple-400 rounded-2xl text-white font-bold shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
                <Sparkles size={20} /> Send a Surprise
              </button>

              <h3 className="text-gray-500 font-bold text-sm mb-3 uppercase tracking-wider ml-2">Your Gift Box</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {surprises.map(s => (
                  <motion.div 
                    key={s.id} 
                    onClick={() => openSurprise(s)}
                    whileHover={{ scale: 1.05 }}
                    className="aspect-square bg-white dark:bg-midnight-card rounded-3xl shadow-sm flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-pink-200 dark:border-white/10"
                  >
                    <Gift size={40} className="text-pink-400 mb-2" />
                    <span className="text-xs font-bold text-gray-400">From {s.sender}</span>
                  </motion.div>
                ))}
                {surprises.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-gray-400 italic">No surprises yet! Send one to yourself to test.</div>
                )}
              </div>
            </motion.div>
          )}

          {mode === 'create' && (
            <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="bg-white dark:bg-midnight-card p-6 rounded-[2rem] shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Write a secret note...</h2>
              <textarea 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Type something sweet..."
                className="w-full h-40 bg-gray-50 dark:bg-black/20 rounded-xl p-4 text-gray-700 dark:text-white outline-none resize-none mb-4"
              />
              <button onClick={handleSendSurprise} className="w-full py-3 bg-pink-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-pink-600 transition-colors">
                <Send size={18} /> Wrap & Send
              </button>
            </motion.div>
          )}

          {mode === 'view' && selectedSurprise && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
              <div className="relative w-full aspect-[4/5] bg-white dark:bg-midnight-card rounded-[2rem] shadow-2xl overflow-hidden flex items-center justify-center text-center p-8">
                
                {/* The Content (Hidden underneath) */}
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
                    className="absolute inset-0 bg-gradient-to-br from-pink-400 to-purple-500 z-10 flex flex-col items-center justify-center cursor-pointer touch-none"
                    onMouseMove={handleScratch}
                    onTouchMove={handleScratch}
                    animate={{ opacity: 1 - (scratched / 100) }}
                  >
                    <Gift size={64} className="text-white mb-4 animate-bounce" />
                    <p className="text-white font-bold text-lg">Rub to Reveal!</p>
                    <p className="text-white/60 text-xs mt-2">({Math.floor(scratched)}%)</p>
                  </motion.div>
                )}
              </div>

              <button onClick={deleteSurprise} className="mt-6 w-full py-3 bg-white dark:bg-white/10 text-red-400 font-bold rounded-xl shadow-sm hover:bg-red-50 transition-colors">
                Delete & Close
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}