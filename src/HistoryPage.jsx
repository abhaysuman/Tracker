import React from 'react';
import { motion } from 'framer-motion';
import { Home, History, Calendar, BarChart2, Gift, Trash2, Clock } from 'lucide-react';

export default function HistoryPage({ onNavigate, savedMoods, onDeleteMood }) {
  
  const sortedDates = Object.keys(savedMoods).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div className="min-h-screen bg-[#EBD4F4] dark:bg-midnight-bg pb-24 font-sans selection:bg-pink-200 flex flex-col items-center transition-colors duration-300">
      
      <div className="pt-10 pb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-700 dark:text-white transition-colors">Mood Journal 📖</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">A timeline of your feelings</p>
      </div>

      {sortedDates.length === 0 ? (
        <div className="mt-20 flex flex-col items-center opacity-50 text-gray-600 dark:text-gray-400">
          <div className="text-6xl mb-4">☁️</div>
          <p className="font-medium">No entries yet.</p>
          <p className="text-sm">Start tracking your mood!</p>
        </div>
      ) : (
        <div className="w-full max-w-md px-4 space-y-8">
          
          {sortedDates.map((date) => (
            <div key={date}>
              <div className="sticky top-0 bg-[#EBD4F4]/90 dark:bg-midnight-bg/90 backdrop-blur-sm z-10 py-2 mb-2 px-2 transition-colors duration-300">
                 <h3 className="text-gray-500 dark:text-gray-400 font-bold text-sm tracking-wider uppercase">
                   {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                 </h3>
              </div>

              <div className="space-y-4">
                {savedMoods[date].map((entry, index) => (
                  <motion.div
                    key={`${date}-${index}`}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white dark:bg-midnight-card rounded-[2rem] p-5 shadow-sm relative overflow-hidden group transition-colors duration-300"
                  >
                    
                    <button 
                      onClick={() => onDeleteMood(date, index)}
                      className="absolute top-4 right-4 p-2 bg-red-50 text-red-300 dark:bg-red-900/20 dark:text-red-400 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-red-100 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>

                    <div className="flex items-start gap-4">
                      <div className="bg-pink-50 dark:bg-pink-900/20 rounded-2xl p-3 text-4xl shadow-inner min-w-[80px] text-center">
                        {entry.emoji}
                      </div>

                      <div className="flex-1 pt-1">
                        <div className="flex items-center gap-2 mb-1">
                           <h4 className="font-bold text-gray-700 dark:text-white text-lg">{entry.label}</h4>
                           <span className="text-xs text-gray-400 flex items-center gap-1 bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded-full">
                             <Clock size={10} /> {entry.timestamp || "Daily Log"}
                           </span>
                        </div>

                        {entry.note && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 italic bg-gray-50 dark:bg-black/20 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                            "{entry.note}"
                          </p>
                        )}

                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {entry.tags.map(tag => (
                              <span key={tag} className="text-[10px] font-bold px-3 py-1 bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-200 rounded-full">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                  </motion.div>
                ))}
              </div>
            </div>
          ))}

        </div>
      )}

      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-sm bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md rounded-full shadow-lg border border-white/50 dark:border-white/10 px-6 py-4 flex justify-between items-center z-50 transition-colors duration-300">
        <NavIcon icon={<Home size={20} />} onClick={() => onNavigate('home')} />
        <NavIcon icon={<History size={20} />} active onClick={() => onNavigate('history')} />
        <NavIcon icon={<Calendar size={20} />} onClick={() => onNavigate('calendar')} />
        <NavIcon icon={<BarChart2 size={20} />} onClick={() => onNavigate('insights')} />
        <NavIcon icon={<Gift size={20} />} onClick={() => onNavigate('surprise')} />
      </div>

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