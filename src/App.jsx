import React, { useState, useEffect } from 'react';
import LandingPage from './LandingPage';
import HomePage from './HomePage';
import CalendarPage from './CalendarPage';
import InsightsPage from './InsightsPage';
import HistoryPage from './HistoryPage';
import SurprisePage from './SurprisePage';
import SettingsPage from './SettingsPage';
import FriendsPage from './FriendsPage';
import Toast from './Toast'; // <--- Import Toast
import { Settings, Users } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [moodHistory, setMoodHistory] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // TOAST STATE
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Helper to show toast
  const showToast = (msg) => {
    setToastMessage(msg);
  };

  const handleSaveMood = (moodData) => {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const newEntry = { ...moodData, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };

    setMoodHistory(prev => {
      const existingMoods = prev[dateKey] || [];
      return { ...prev, [dateKey]: [...existingMoods, newEntry] };
    });
    
    // REPLACE ALERT WITH TOAST
    showToast("Mood Saved Successfully! ✨");
  };

  const handleDeleteMood = (dateKey, indexToDelete) => {
    if (window.confirm("Are you sure you want to delete this memory?")) {
      setMoodHistory(prev => {
        const updatedDayList = prev[dateKey].filter((_, index) => index !== indexToDelete);
        if (updatedDayList.length === 0) {
          const newState = { ...prev };
          delete newState[dateKey];
          return newState;
        }
        return { ...prev, [dateKey]: updatedDayList };
      });
      showToast("Memory deleted.");
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
      
      {currentPage === 'landing' && <LandingPage onLoginSuccess={() => setCurrentPage('home')} />}
      {currentPage === 'home' && <HomePage onNavigate={setCurrentPage} onSaveMood={handleSaveMood} />}
      {currentPage === 'calendar' && <CalendarPage onNavigate={setCurrentPage} savedMoods={moodHistory} />}
      {currentPage === 'insights' && <InsightsPage onNavigate={setCurrentPage} savedMoods={moodHistory} />}
      {currentPage === 'history' && <HistoryPage onNavigate={setCurrentPage} savedMoods={moodHistory} onDeleteMood={handleDeleteMood} />}
      {currentPage === 'surprise' && <SurprisePage onNavigate={setCurrentPage} />}
      {currentPage === 'settings' && <SettingsPage onNavigate={setCurrentPage} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />}
      {currentPage === 'friends' && <FriendsPage onNavigate={setCurrentPage} />}

      {/* --- TOAST COMPONENT --- */}
      <AnimatePresence>
        {toastMessage && (
          <Toast 
            message={toastMessage} 
            onClose={() => setToastMessage(null)} 
          />
        )}
      </AnimatePresence>

      {/* Global Buttons */}
      {currentPage !== 'landing' && currentPage !== 'settings' && (
        <button
          onClick={() => setCurrentPage('settings')}
          className="fixed bottom-6 left-6 z-50 p-3 bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md text-gray-400 dark:text-gray-200 rounded-full shadow-lg border border-white/50 dark:border-white/10 hover:text-pink-400 transition-all hover:scale-110 active:scale-95"
        >
          <Settings size={24} />
        </button>
      )}

      {currentPage !== 'landing' && currentPage !== 'friends' && (
        <button
          onClick={() => setCurrentPage('friends')}
          className="fixed top-6 right-6 z-50 p-3 bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md text-gray-400 dark:text-gray-200 rounded-full shadow-lg border border-white/50 dark:border-white/10 hover:text-pink-400 transition-all hover:scale-110 active:scale-95"
        >
          <Users size={24} />
        </button>
      )}

    </div>
  );
}

export default App;