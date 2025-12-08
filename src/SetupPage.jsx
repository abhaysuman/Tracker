import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, Check, ArrowRight, Moon, Sun } from 'lucide-react';
import { doc, updateDoc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export default function SetupPage({ user, userData, onComplete, isDarkMode, toggleTheme }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(userData?.displayName || user?.displayName || "");
  const [friendCodeInput, setFriendCodeInput] = useState("");
  const [loading, setLoading] = useState(false);

  // --- STEP 1: SAVE PROFILE ---
  const handleProfileSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { displayName: name });
      setStep(2);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // --- STEP 2: ADD FRIEND (OPTIONAL) ---
  const handleAddFriend = async () => {
    if (!friendCodeInput.trim()) return;
    setLoading(true);
    
    try {
      // Search for friend
      const q = query(collection(db, "users"), where("friendCode", "==", friendCodeInput.toUpperCase().trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("Friend not found! Check the code.");
        setLoading(false);
        return;
      }

      const newFriendDoc = querySnapshot.docs[0];
      const newFriendData = newFriendDoc.data();

      // Add to my list
      const myDocRef = doc(db, "users", user.uid);
      await updateDoc(myDocRef, {
        friends: arrayUnion({
          uid: newFriendDoc.id,
          name: newFriendData.displayName || "Unknown",
          code: newFriendData.friendCode,
          avatar: newFriendData.photoURL || "👤"
        })
      });

      alert(`Connected with ${newFriendData.displayName}!`);
      setFriendCodeInput(""); // Clear input
      
    } catch (e) {
      console.error(e);
      alert("Error adding friend.");
    }
    setLoading(false);
  };

  // --- FINISH SETUP ---
  const handleFinish = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      // MARK SETUP AS COMPLETE!
      await updateDoc(userRef, { isSetupComplete: true });
      onComplete(); // Triggers redirect to Home in App.jsx
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#EBD4F4] dark:bg-midnight-bg flex items-center justify-center p-6 font-sans transition-colors duration-300">
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-white dark:bg-midnight-card rounded-[2.5rem] shadow-2xl overflow-hidden relative transition-colors duration-300"
      >
        {/* Progress Bar */}
        <div className="h-2 bg-gray-100 dark:bg-white/5 w-full">
          <motion.div 
            className="h-full bg-pink-400"
            initial={{ width: "33%" }}
            animate={{ width: step === 1 ? "33%" : step === 2 ? "66%" : "100%" }}
          />
        </div>

        <div className="p-8">
          
          <AnimatePresence mode='wait'>
            {/* --- STEP 1: PROFILE --- */}
            {step === 1 && (
              <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-pink-500">
                  <User size={32} />
                </div>
                <h2 className="text-2xl font-bold text-center text-gray-700 dark:text-white mb-2">Let's set you up!</h2>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-8 text-sm">How should we call you?</p>

                <input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field mb-6 dark:bg-black/20 dark:text-white dark:border-white/10"
                  placeholder="Your Name"
                />

                <div className="flex items-center justify-between bg-gray-50 dark:bg-white/5 p-4 rounded-2xl mb-8">
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-300">App Theme</span>
                  <button onClick={toggleTheme} className="p-2 bg-white dark:bg-white/10 rounded-full shadow-sm">
                    {isDarkMode ? <Moon size={18} className="text-purple-300" /> : <Sun size={18} className="text-orange-300" />}
                  </button>
                </div>

                <button onClick={handleProfileSave} disabled={loading} className="btn-primary flex items-center justify-center gap-2">
                  Next Step <ArrowRight size={18} />
                </button>
              </motion.div>
            )}

            {/* --- STEP 2: CONNECT FRIEND --- */}
            {step === 2 && (
              <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-purple-500">
                  <Users size={32} />
                </div>
                <h2 className="text-2xl font-bold text-center text-gray-700 dark:text-white mb-2">Connect Partner</h2>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-6 text-sm">
                  Share your code or enter theirs.
                </p>

                <div className="bg-pink-50 dark:bg-pink-900/10 p-4 rounded-2xl text-center mb-6 border border-pink-100 dark:border-pink-800/30">
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">Your Friend Code</p>
                  <p className="text-2xl font-mono font-bold text-gray-700 dark:text-white tracking-widest">{userData?.friendCode}</p>
                </div>

                <div className="flex gap-2 mb-8">
                  <input 
                    value={friendCodeInput}
                    onChange={(e) => setFriendCodeInput(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 dark:text-white outline-none focus:ring-2 focus:ring-pink-300 uppercase"
                    placeholder="Enter Partner's Code"
                  />
                  <button onClick={handleAddFriend} disabled={loading} className="bg-pink-400 text-white p-3 rounded-xl shadow-md hover:bg-pink-500">
                    <Check size={24} />
                  </button>
                </div>

                <button onClick={() => setStep(3)} className="w-full py-3 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
                  Skip for now
                </button>
              </motion.div>
            )}

            {/* --- STEP 3: ALL SET --- */}
            {step === 3 && (
              <motion.div key="step3" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                  <Check size={40} strokeWidth={4} />
                </div>
                <h2 className="text-2xl font-bold text-center text-gray-700 dark:text-white mb-4">All Set! 🎉</h2>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
                  Your profile is ready. Start tracking your beautiful moments.
                </p>

                <button onClick={handleFinish} disabled={loading} className="btn-primary shadow-lg shadow-pink-200 dark:shadow-none">
                  Go to Home
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>
    </div>
  );
}