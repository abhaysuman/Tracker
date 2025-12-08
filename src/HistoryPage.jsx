import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Trash2, Camera, MapPin } from 'lucide-react'; // Added icons

export default function HistoryPage({ onNavigate, savedMoods, onDeleteMood }) {
  
  const dates = Object.keys(savedMoods).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div className="min-h-screen bg-[#EBD4F4] dark:bg-midnight-bg pb-24 font-sans selection:bg-pink-200 flex flex-col items-center transition-colors duration-300">
      
      {/* Header */}
      <div className="pt-8 px-6 pb-6 w-full flex items-center justify-between sticky top-0 z-10 bg-[#EBD4F4]/90 dark:bg-midnight-bg/90 backdrop-blur-sm">
        <button onClick={() => onNavigate('home')} className="p-3 bg-white dark:bg-midnight-card rounded-full text-gray-600 dark:text-gray-200 shadow-sm hover:scale-105 transition-all">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-700 dark:text-white">Your Journey</h1>
        <div className="w-12"></div>
      </div>

      <div className="w-full max-w-md px-6 space-y-6">
        <AnimatePresence>
          {dates.length === 0 ? (
            <div className="text-center text-gray-400 mt-20">
              <p>No memories yet.</p>
            </div>
          ) : (
            dates.map((date) => (
              <div key={date}>
                <h3 className="text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-wider mb-3 ml-2">
                  {new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                
                <div className="space-y-3">
                  {savedMoods[date].map((entry, index) => (
                    <motion.div 
                      key={`${date}-${index}`}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ x: -100, opacity: 0 }}
                      className="bg-white dark:bg-midnight-card p-5 rounded-[2rem] shadow-sm relative group overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{entry.emoji}</span>
                          <div>
                            <span className="font-bold text-gray-700 dark:text-white block">{entry.label}</span>
                            <span className="text-xs text-gray-400">{entry.timestamp}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => onDeleteMood(date, index)}
                          className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      {/* TAGS */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {entry.tags?.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-white/5 rounded-lg text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* NOTE */}
                      {entry.note && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm bg-pink-50 dark:bg-pink-900/10 p-3 rounded-xl italic mb-3">
                          "{entry.note}"
                        </p>
                      )}

                      {/* --- PHOTO MEMORY --- */}
                      {entry.photo && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-gray-100 dark:border-white/10">
                          <img 
                            src={entry.photo} 
                            alt="Memory" 
                            className="w-full h-auto object-cover max-h-60"
                            loading="lazy"
                          />
                        </div>
                      )}

                    </motion.div>
                  ))}
                </div>
              </div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}