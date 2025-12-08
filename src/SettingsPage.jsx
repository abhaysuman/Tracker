import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Bell, Lock, User, LogOut, Moon, Sun, Heart } from 'lucide-react';

export default function SettingsPage({ onNavigate, isDarkMode, toggleTheme, onLogout }) { // <--- ADD onLogout
  
  const SettingSection = ({ title, children }) => (
    <div className="bg-white dark:bg-midnight-card rounded-[2rem] p-6 shadow-sm mb-4 transition-colors duration-300">
      <h3 className="text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-wider mb-4">{title}</h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );

  const SettingRow = ({ icon: Icon, label, action }) => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 text-gray-700 dark:text-gray-200">
        <div className="p-2 bg-pink-50 dark:bg-pink-900/30 text-pink-400 rounded-full">
          <Icon size={18} />
        </div>
        <span className="font-medium text-sm">{label}</span>
      </div>
      {action}
    </div>
  );

  const Toggle = ({ active, onClick }) => (
    <div 
      onClick={onClick}
      className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors duration-300 ${active ? 'bg-pink-400' : 'bg-pink-200 dark:bg-gray-600'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${active ? 'right-1' : 'left-1'}`} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#EBD4F4] dark:bg-midnight-bg pb-10 font-sans selection:bg-pink-200 transition-colors duration-300 relative">
      
      {/* Header */}
      <div className="pt-8 px-6 pb-6 flex items-center justify-between sticky top-0 z-10 bg-[#EBD4F4]/90 dark:bg-midnight-bg/90 backdrop-blur-sm transition-colors duration-300">
        <button 
          onClick={() => onNavigate('home')}
          className="p-3 bg-white dark:bg-midnight-card rounded-full text-gray-600 dark:text-gray-200 shadow-sm hover:scale-105 transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-700 dark:text-white">Settings</h1>
        <div className="w-12"></div>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }}
        className="px-6 max-w-md mx-auto"
      >
        {/* PROFILE CARD */}
        <div className="bg-white dark:bg-midnight-card rounded-[2rem] p-6 shadow-sm mb-6 flex items-center gap-4 transition-colors duration-300">
          <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/20 rounded-full flex items-center justify-center text-2xl border-4 border-pink-50 dark:border-pink-900/10">
            👩‍❤️‍👨
          </div>
          <div>
            <h2 className="font-bold text-gray-700 dark:text-white text-lg">My Profile</h2>
            <p className="text-gray-400 dark:text-gray-400 text-sm">lovelygirlfriend@email.com</p>
          </div>
        </div>

        <SettingSection title="Preferences">
          <SettingRow icon={Bell} label="Notifications" action={<Toggle />} />
          <SettingRow 
            icon={isDarkMode ? Sun : Moon} 
            label="Dark Mode" 
            action={<Toggle active={isDarkMode} onClick={toggleTheme} />} 
          />
          <SettingRow icon={Heart} label="Daily Reminders" action={<Toggle />} />
        </SettingSection>

        <SettingSection title="Privacy & Security">
          <SettingRow icon={Lock} label="Privacy Mode" action={<Toggle />} />
          <SettingRow icon={User} label="Friend List" action={<span className="text-xs text-gray-400">5 Friends</span>} />
        </SettingSection>

        <button 
          onClick={onLogout}
          className="w-full bg-white dark:bg-midnight-card rounded-2xl p-4 text-red-400 font-bold flex items-center justify-center gap-2 shadow-sm mt-4 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors duration-300"
        >
          <LogOut size={18} />
          Log Out
        </button>

        <p className="text-center text-gray-400 dark:text-gray-600 text-xs mt-8">
          GF Mood Tracker v1.1 <br/> Made with ❤️
        </p>

      </motion.div>
    </div>
  );
}