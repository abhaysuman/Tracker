import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Home, History, Calendar as CalIcon, BarChart2, Gift } from 'lucide-react';

export default function CalendarPage({ onNavigate, savedMoods }) {
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [selectedDay, setSelectedDay] = useState(null);

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="min-h-screen bg-[#EBD4F4] dark:bg-midnight-bg pb-24 font-sans selection:bg-pink-200 flex flex-col items-center transition-colors duration-300">
      
      <div className="pt-12 pb-8 text-center">
        <h1 className="text-3xl font-medium text-gray-800 dark:text-white tracking-wide font-mono transition-colors">
          Mood Calendar
        </h1>
      </div>

      <div className="bg-[#FFF5F5] dark:bg-midnight-card rounded-[2rem] p-6 shadow-sm w-[90%] max-w-md transition-colors duration-300">
        
        {/* Month Navigation */}
        <div className="flex justify-between items-center mb-6 px-4">
          <button onClick={prevMonth} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-gray-600 dark:text-gray-300">
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-medium text-gray-700 dark:text-white w-40 text-center">
            {monthNames[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-gray-600 dark:text-gray-300">
            <ChevronRight size={24} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-xs font-semibold text-gray-500 dark:text-gray-400">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-3">
          {days.map((day, index) => {
            if (day === null) return <div key={`empty-${index}`}></div>;

            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayMoods = savedMoods[dateKey]; 
            const latestMood = dayMoods && dayMoods.length > 0 ? dayMoods[dayMoods.length - 1] : null;

            return (
              <motion.button
                key={day}
                whileTap={{ scale: 0.9 }}
                onClick={() => latestMood && setSelectedDay({ day, moods: dayMoods })}
                className={`
                  aspect-square rounded-2xl flex flex-col items-center justify-center relative shadow-sm transition-all
                  ${latestMood 
                    ? 'bg-pink-100 ring-2 ring-pink-200 dark:bg-pink-900/50 dark:ring-pink-500' 
                    : 'bg-white hover:bg-gray-50 dark:bg-white/5 dark:hover:bg-white/10'}
                `}
              >
                <span className={`text-xs ${latestMood ? 'text-pink-800 font-bold dark:text-pink-200' : 'text-gray-400 dark:text-gray-500'}`}>
                  {day}
                </span>
                {latestMood && <span className="text-xl mt-1">{latestMood.emoji}</span>}
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedDay && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px] p-4"
            onClick={() => setSelectedDay(null)}
          >
            <motion.div
              initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
              className="bg-white dark:bg-midnight-card rounded-[2rem] p-6 w-72 shadow-2xl relative flex flex-col items-center max-h-[60vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setSelectedDay(null)} className="absolute top-4 right-4 text-gray-400 dark:text-gray-500">
                <X size={24} />
              </button>
              
              <h3 className="text-gray-500 dark:text-gray-300 font-bold mb-6 mt-2">
                {monthNames[month]} {selectedDay.day}
              </h3>

              <div className="w-full space-y-3">
                {selectedDay.moods.map((mood, idx) => (
                  <div key={idx} className="flex items-center gap-4 bg-pink-50 dark:bg-pink-900/20 p-3 rounded-2xl">
                    <span className="text-4xl filter drop-shadow-sm">{mood.emoji}</span>
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-gray-700 dark:text-white">{mood.label}</span>
                      <span className="text-xs text-gray-400">Log #{idx + 1}</span>
                    </div>
                  </div>
                ))}
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      

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