import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

export default function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // Disappear after 3 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      // FIX: We include 'x: "-50%"' in every state to ensure it stays centered
      // while animating the Y position.
      initial={{ opacity: 0, y: 20, x: "-50%" }} 
      animate={{ opacity: 1, y: 0, x: "-50%" }}
      exit={{ opacity: 0, y: 20, x: "-50%" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed bottom-28 left-1/2 z-[100] whitespace-nowrap"
    >
      <div className="bg-gray-800/90 dark:bg-white/90 backdrop-blur-md text-white dark:text-gray-800 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/10">
        <div className="bg-green-500 rounded-full p-1 shadow-sm">
          <Check size={12} className="text-white" strokeWidth={3} />
        </div>
        <span className="font-medium text-sm pr-2">{message}</span>
      </div>
    </motion.div>
  );
}