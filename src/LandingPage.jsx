import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, googleProvider } from './firebase'; 
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth'; // <--- Import these

export default function LandingPage({ onLoginSuccess }) {
  const [modalType, setModalType] = useState(null);
  const [error, setError] = useState(null);

  // Check if we are returning from a Google Redirect
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          onLoginSuccess(); // User just came back from Google!
        }
      } catch (err) {
        console.error("Redirect Login Error:", err);
        setError("Failed to login via redirect.");
      }
    };
    checkRedirect();
  }, [onLoginSuccess]);

  const handleClose = (e) => {
    if (e.target.id === "backdrop") setModalType(null);
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      // Try Popup first (Better for PC)
      await signInWithPopup(auth, googleProvider);
      onLoginSuccess(); 
    } catch (err) {
      // If Popup fails (or is closed), try Redirect (Better for Mobile)
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/popup-blocked') {
        console.warn("Popup failed, switching to redirect...");
        signInWithRedirect(auth, googleProvider);
      } else {
        console.error("Login Error:", err);
        setError("Login failed. Please try again.");
      }
    }
  };

  // ... (Rest of your component stays exactly the same)
  return (
    // ... Copy the rest of the return statement from the previous code
    <div className="min-h-screen relative overflow-hidden bg-[#EBD4F4] dark:bg-midnight-bg font-sans selection:bg-pink-200 flex flex-col items-center justify-center transition-colors duration-300">
      
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="flex flex-col items-center justify-center p-6 relative z-0">
        <h1 className="text-3xl font-bold tracking-wide text-gray-700 dark:text-white mb-8 transition-colors">
          Welcome back, love.
        </h1>

        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          className="mb-10"
        >
          <svg width="150" height="150" viewBox="0 0 24 24" fill="url(#heartGradient)" className="drop-shadow-2xl">
            <defs>
              <linearGradient id="heartGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FF9A9E" />
                <stop offset="100%" stopColor="#FECFEF" />
              </linearGradient>
            </defs>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </motion.div>

        <p className="text-xl text-gray-600 dark:text-gray-300 font-medium mb-8 transition-colors">How are you feeling today?</p>

        <div className="flex flex-col gap-4 w-64">
          <button 
            onClick={() => setModalType('login')} 
            className="btn-primary"
          >
            Start
          </button>
        </div>
      </div>

      <AnimatePresence>
        {modalType && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            id="backdrop" onClick={handleClose}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[2px] p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0, y: 50 }}
              className="w-full max-w-sm bg-white dark:bg-midnight-card rounded-[2rem] shadow-2xl p-8 text-center transition-colors duration-300"
            >
              <h2 className="text-2xl font-bold text-gray-700 dark:text-white mb-6">Let's get started!</h2>
              
              {/* ERROR MESSAGE DISPLAY */}
              {error && (
                <div className="bg-red-50 text-red-400 text-sm p-3 rounded-xl mb-4 border border-red-100">
                  {error}
                </div>
              )}

              <button 
                onClick={handleGoogleLogin}
                className="w-full py-3 rounded-full bg-white border-2 border-gray-100 dark:border-white/10 dark:bg-black/20 text-gray-600 dark:text-white font-bold flex items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-black/30 transition-colors"
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="G" />
                Continue with Google
              </button>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}