import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlobalDialog({ isOpen, config, onClose }) {
  // config = { title, message, onConfirm, confirmText, isDanger }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 backdrop-blur-[2px] p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-sm text-center"
          >
            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2">
              {config?.title || "Are you sure?"}
            </h3>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              {config?.message}
            </p>
            
            <div className="flex gap-3 justify-center">
              <button 
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm transition-transform active:scale-95 hover:bg-gray-200"
              >
                Cancel
              </button>
              
              <button 
                onClick={() => { config.onConfirm(); onClose(); }}
                className={`flex-1 px-4 py-3 rounded-xl text-white font-bold text-sm shadow-lg transition-transform active:scale-95 hover:opacity-90 ${config?.isDanger ? 'bg-red-500 shadow-red-500/30' : 'bg-pink-500 shadow-pink-500/30'}`}
              >
                {config?.confirmText || "Confirm"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}