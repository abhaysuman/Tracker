import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, MapPin, Tag } from 'lucide-react';

export default function HistoryPage({ onNavigate, savedMoods, onDeleteMood }) {
  
  const sortedDates = Object.keys(savedMoods).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div className="min-h-full pb-10 font-sans p-6 bg-white dark:bg-[#313338] transition-colors duration-300">
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">History</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Past memories</p>
      </div>

      <div className="space-y-6">
        {sortedDates.map(dateKey => (
          <div key={dateKey}>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">{new Date(dateKey).toDateString()}</h3>
            <div className="space-y-3">
              {savedMoods[dateKey].map((entry, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 dark:bg-[#2b2d31] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 relative group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{entry.emoji}</span>
                      <span className="font-bold text-gray-700 dark:text-white text-sm">{entry.label}</span>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">{entry.timestamp}</span>
                  </div>
                  
                  {entry.note && <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 leading-relaxed">{entry.note}</p>}
                  
                  {entry.photo && (
                    <div className="mb-3 rounded-lg overflow-hidden h-32 w-full">
                        <img src={entry.photo} className="w-full h-full object-cover" alt="memory" />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {entry.tags?.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-white dark:bg-white/5 rounded-md text-[10px] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 flex items-center gap-1">
                        <Tag size={10} /> {tag}
                      </span>
                    ))}
                  </div>

                  <button 
                    onClick={() => onDeleteMood(dateKey, index)}
                    className="absolute top-4 right-4 p-2 bg-white dark:bg-white/10 text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
        
        {sortedDates.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p>No memories yet.</p>
            <button onClick={() => onNavigate('home')} className="text-pink-500 font-bold text-sm mt-2 hover:underline">Log your first mood</button>
          </div>
        )}
      </div>
    </div>
  );
}