import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LandingPage({ onLoginSuccess }) {
  const [modalType, setModalType] = useState(null); 

  const handleClose = (e) => {
    if (e.target.id === "backdrop") {
      setModalType(null);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#EBD4F4] dark:bg-midnight-bg font-sans selection:bg-pink-200 transition-colors duration-300">
      
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="flex flex-col items-center justify-center min-h-screen p-6 relative z-0">
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
            Login
          </button>
          <button 
            onClick={() => setModalType('signup')} 
            className="btn-secondary text-gray-600 border-gray-400/30 hover:bg-white/40 dark:text-gray-300 dark:border-white/10 dark:hover:bg-white/10"
          >
            Sign-up
          </button>
        </div>
      </div>

      <AnimatePresence>
        {modalType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            id="backdrop"
            onClick={handleClose}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[2px] p-4"
          >
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-sm bg-white dark:bg-midnight-card rounded-[2rem] shadow-2xl p-8 relative mt-[-40px] transition-colors duration-300"
            >
              
              <div className="text-center mt-2">
                <h2 className="text-2xl font-bold text-gray-700 dark:text-white mb-8">
                  {modalType === 'login' ? 'Welcome back!' : 'Join us, love!'}
                </h2>

                <form className="flex flex-col gap-4">
                  {modalType === 'signup' && (
                    <input type="text" placeholder="Name" className="input-field dark:bg-black/20 dark:text-white dark:placeholder-gray-500 dark:border-white/10" />
                  )}
                  <input type="text" placeholder="Username" className="input-field dark:bg-black/20 dark:text-white dark:placeholder-gray-500 dark:border-white/10" />
                  <input type="password" placeholder="Password" className="input-field dark:bg-black/20 dark:text-white dark:placeholder-gray-500 dark:border-white/10" />
                  
                  <button 
                    type="button" 
                    onClick={onLoginSuccess}
                    className="btn-primary mt-4 shadow-pink-300/50 active:scale-95 transition-transform duration-100"
                  >
                    {modalType === 'login' ? 'Login' : 'Create Account'}
                  </button>
                </form>
              </div>

            </motion.div>

            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 10 }}
               transition={{ duration: 0.2, delay: 0 }}
               className="flex flex-col gap-3 mt-6 w-full max-w-xs"
            >
              <button 
                onClick={() => setModalType(modalType === 'login' ? 'signup' : 'login')}
                className="w-full py-3 rounded-full bg-white/40 dark:bg-black/40 text-gray-700 dark:text-white font-semibold backdrop-blur-md hover:bg-white/60 dark:hover:bg-black/60 transition-all border border-white/50 dark:border-white/10 shadow-sm active:scale-95"
              >
                {modalType === 'login' ? 'Switch to Sign-up' : 'Switch to Login'}
              </button>
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}