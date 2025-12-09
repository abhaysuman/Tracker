import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Frown, Meh, Smile } from 'lucide-react';

export default function CalendarPage({ onNavigate, savedMoods }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 sm:h-14"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayMoods = savedMoods[dateKey] || [];
      const primaryMood = dayMoods.length > 0 ? dayMoods[dayMoods.length - 1] : null;

      days.push(
        <motion.div 
          key={day} 
          whileHover={{ scale: 1.1 }}
          className={`h-10 sm:h-14 rounded-xl flex flex-col items-center justify-center relative cursor-pointer border ${primaryMood ? 'border-pink-200 bg-pink-50 dark:bg-pink-900/20 dark:border-pink-800' : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/5'}`}
        >
          <span className={`text-xs font-bold ${primaryMood ? 'text-pink-500' : 'text-gray-400'}`}>{day}</span>
          {primaryMood && <span className="text-lg leading-none mt-1">{primaryMood.emoji}</span>}
          {dayMoods.length > 1 && (
            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
          )}
        </motion.div>
      );
    }
    return days;
  };

  return (
    <div className="min-h-full pb-10 font-sans p-6 bg-white dark:bg-[#313338] transition-colors duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Mood Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Your emotional journey</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => changeMonth(-1)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full hover:bg-pink-100 dark:hover:bg-pink-900/30 text-gray-600 dark:text-gray-300 transition-colors"><ChevronLeft size={20} /></button>
          <button onClick={() => changeMonth(1)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full hover:bg-pink-100 dark:hover:bg-pink-900/30 text-gray-600 dark:text-gray-300 transition-colors"><ChevronRight size={20} /></button>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="bg-gray-50 dark:bg-[#2b2d31] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-white/5">
        <h2 className="text-center font-bold text-lg text-gray-700 dark:text-white mb-6">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        
        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {['S','M','T','W','T','F','S'].map(d => (
            <div key={d} className="text-xs font-bold text-gray-400 uppercase">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl text-center">
          <Smile className="w-6 h-6 mx-auto text-green-500 mb-1" />
          <span className="text-xs font-bold text-green-600 dark:text-green-400">Good Days</span>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-2xl text-center">
          <Meh className="w-6 h-6 mx-auto text-yellow-500 mb-1" />
          <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">Mixed</span>
        </div>
        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl text-center">
          <Frown className="w-6 h-6 mx-auto text-red-500 mb-1" />
          <span className="text-xs font-bold text-red-600 dark:text-red-400">Rough</span>
        </div>
      </div>

    </div>
  );
}