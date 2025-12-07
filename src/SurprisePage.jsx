import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, History, Calendar, BarChart2, Gift, Lock, Clock } from 'lucide-react';

export default function SurprisePage({ onNavigate }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [isUnlocked, setIsUnlocked] = useState(false);

  function calculateTimeLeft() {
    const now = new Date();
    const currentYear = now.getFullYear();
    let targetDate = new Date(currentYear, 0, 19, 0, 0, 0); 

    if (now > targetDate) {
      targetDate = new Date(currentYear + 1, 0, 19, 0, 0, 0);
    }

    const difference = targetDate - now;
    const isToday = now.getMonth() === 0 && now.getDate() === 19;

    if (isToday) return null;

    return {
      total: difference,
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60)
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      
      if (!remaining) {
        setIsUnlocked(true);
        clearInterval(timer);
      } else {
        setTimeLeft(remaining);
        setIsUnlocked(false);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#EBD4F4] dark:bg-midnight-bg pb-24 font-sans selection:bg-pink-200 flex flex-col items-center relative overflow-hidden transition-colors duration-300">
      
      {isUnlocked && (
        <>
          <div className="absolute top-10 left-10 text-4xl animate-bounce">🎈</div>
          <div className="absolute top-20 right-20 text-4xl animate-bounce delay-700">🎉</div>
          <div className="absolute bottom-40 left-1/2 text-4xl animate-pulse">🎂</div>
          {[...Array(15)].map((_, i) => (
             <motion.div
               key={i}
               className="absolute text-pink-400"
               initial={{ y: '100vh', opacity: 0, x: Math.random() * 100 }}
               animate={{ y: '-10vh', opacity: [0, 1, 0] }}
               transition={{ duration: Math.random() * 5 + 3, repeat: Infinity, delay: Math.random() * 2 }}
               style={{ left: `${Math.random() * 100}%` }}
             >
               ❤️
             </motion.div>
          ))}
        </>
      )}

      <div className="pt-16 pb-8 text-center z-10">
        <h1 className="text-3xl font-medium text-gray-800 dark:text-white tracking-wide font-mono transition-colors">
          Surprise!
        </h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md px-6 z-10">
        
        <AnimatePresence mode='wait'>
          {isUnlocked ? (
            <motion.div
              key="unlocked"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="bg-white/90 dark:bg-midnight-card/90 backdrop-blur-sm rounded-[2rem] p-8 text-center shadow-xl border-4 border-pink-200 dark:border-pink-800"
            >
              <motion.div 
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-8xl mb-4"
              >
                🎁
              </motion.div>
              
              <h2 className="text-2xl font-bold text-gray-700 dark:text-white mb-4">Happy Birthday, Love! 💖</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                You made it to your special day! 
                <br/>
                You are the most amazing person in my life. I hope this app helps you track all your beautiful emotions. 
                <br/><br/>
                I love you! 👨‍💻❤️
              </p>
              
              <button className="bg-pink-400 text-white px-6 py-2 rounded-full font-bold shadow-md hover:bg-pink-500 transition-colors">
                Claim Hug 🫂
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="locked"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center w-full"
            >
              <div className="relative mb-8 mx-auto w-40 h-40 flex items-center justify-center bg-white dark:bg-midnight-card rounded-full shadow-inner ring-4 ring-pink-100 dark:ring-pink-900/20">
                <Lock size={64} className="text-pink-200 dark:text-pink-800" />
                <motion.div 
                  className="absolute -top-2 -right-2 text-4xl"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  ⏳
                </motion.div>
              </div>

              <h2 className="text-xl font-bold text-gray-600 dark:text-white mb-2">Patience, love...</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-8">
                This surprise unlocks on <strong>January 19th</strong>!
              </p>

              <div className="grid grid-cols-4 gap-3 max-w-xs mx-auto">
                <TimeUnit value={timeLeft.days || 0} label="Days" />
                <TimeUnit value={timeLeft.hours || 0} label="Hrs" />
                <TimeUnit value={timeLeft.minutes || 0} label="Mins" />
                <TimeUnit value={timeLeft.seconds || 0} label="Secs" />
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-sm bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md rounded-full shadow-lg border border-white/50 dark:border-white/10 px-6 py-4 flex justify-between items-center z-50 transition-colors duration-300">
        <NavIcon icon={<Home size={20} />} onClick={() => onNavigate('home')} />
        <NavIcon icon={<History size={20} />} onClick={() => onNavigate('history')} />
        <NavIcon icon={<Calendar size={20} />} onClick={() => onNavigate('calendar')} />
        <NavIcon icon={<BarChart2 size={20} />} onClick={() => onNavigate('insights')} />
        <NavIcon icon={<Gift size={20} />} active onClick={() => onNavigate('surprise')} />
      </div>

    </div>
  );
}

function TimeUnit({ value, label }) {
  return (
    <div className="bg-white dark:bg-midnight-card rounded-2xl p-3 shadow-sm flex flex-col items-center border border-pink-50 dark:border-white/5">
      <span className="text-xl font-bold text-pink-500 font-mono">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-1">
        {label}
      </span>
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