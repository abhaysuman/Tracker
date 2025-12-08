import React, { useState, useEffect } from 'react';
import LandingPage from './LandingPage';
import HomePage from './HomePage';
import CalendarPage from './CalendarPage';
import InsightsPage from './InsightsPage';
import HistoryPage from './HistoryPage';
import SurprisePage from './SurprisePage';
import SettingsPage from './SettingsPage';
import FriendsPage from './FriendsPage';
import SetupPage from './SetupPage'; // <--- Import Setup
import Toast from './Toast';
import FriendActivityTab from './FriendActivityTab'; // <--- Import this
import { Settings, Users } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

// FIREBASE
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [moodHistory, setMoodHistory] = useState({});
  const [userData, setUserData] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const generateFriendCode = (name) => {
    const prefix = (name || "USER").substring(0, 4).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000); 
    return `${prefix}-${randomNum}`;
  };

  // --- 1. AUTH LISTENER ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setCurrentPage('landing');
      }
    });
    return () => unsubscribe();
  }, []);

  // --- 2. DATABASE LISTENER ---
  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      
      const unsubscribeSnapshot = onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMoodHistory(data.history || {});
          setUserData(data);

          // --- ROUTING LOGIC ---
          // If setup is NOT complete, force them to Setup Page
          if (!data.isSetupComplete) {
            setCurrentPage('setup');
          } else if (currentPage === 'landing' || currentPage === 'setup') {
            // Only redirect to home if they were on landing or setup
            setCurrentPage('home');
          }

          // Generate Code if missing (Safety net)
          if (!data.friendCode) {
            const newCode = generateFriendCode(user.displayName);
            await setDoc(userDocRef, { 
              friendCode: newCode, 
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              friends: [] 
            }, { merge: true });
          }
        } else {
          // CREATE NEW USER DOC (Default isSetupComplete: false)
          const newCode = generateFriendCode(user.displayName);
          await setDoc(userDocRef, {
            history: {},
            friendCode: newCode,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            friends: [],
            isSetupComplete: false // <--- Important!
          });
        }
        setLoading(false);
      }, (error) => {
        console.error("Database Error:", error);
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    } else {
      setMoodHistory({});
      setUserData(null);
    }
  }, [user]);

  // Dark Mode Logic
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const showToast = (msg) => setToastMessage(msg);

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentPage('landing');
    showToast("Logged out successfully");
  };

  const handleSaveMood = async (moodData) => {
    if (!user) return;
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const newEntry = { ...moodData, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };

    const updatedHistory = { ...moodHistory };
    const existingMoods = updatedHistory[dateKey] || [];
    updatedHistory[dateKey] = [...existingMoods, newEntry];

    setMoodHistory(updatedHistory);
    showToast("Mood Saved! ☁️");

    await setDoc(doc(db, "users", user.uid), { history: updatedHistory }, { merge: true });
  };

  const handleDeleteMood = async (dateKey, indexToDelete) => {
    if (!user) return;
    if (window.confirm("Are you sure you want to delete this memory?")) {
      const updatedHistory = { ...moodHistory };
      const updatedDayList = updatedHistory[dateKey].filter((_, index) => index !== indexToDelete);

      if (updatedDayList.length === 0) delete updatedHistory[dateKey];
      else updatedHistory[dateKey] = updatedDayList;

      setMoodHistory(updatedHistory);
      showToast("Memory deleted.");
      await setDoc(doc(db, "users", user.uid), { history: updatedHistory }, { merge: true });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#EBD4F4] dark:bg-midnight-bg text-gray-500 dark:text-gray-300">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400 mb-4"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
      
      {currentPage === 'landing' && <LandingPage onLoginSuccess={() => {}} />}
      
      {/* --- SETUP PAGE --- */}
      {currentPage === 'setup' && (
        <SetupPage 
          user={user} 
          userData={userData} 
          onComplete={() => setCurrentPage('home')}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
        />
      )}

      {currentPage === 'home' && <HomePage onNavigate={setCurrentPage} onSaveMood={handleSaveMood} />}
      {currentPage === 'calendar' && <CalendarPage onNavigate={setCurrentPage} savedMoods={moodHistory} />}
      {currentPage === 'insights' && <InsightsPage onNavigate={setCurrentPage} savedMoods={moodHistory} />}
      {currentPage === 'history' && <HistoryPage onNavigate={setCurrentPage} savedMoods={moodHistory} onDeleteMood={handleDeleteMood} />}
      {currentPage === 'surprise' && <SurprisePage onNavigate={setCurrentPage} />}
      {currentPage === 'settings' && <SettingsPage onNavigate={setCurrentPage} isDarkMode={isDarkMode} toggleTheme={toggleTheme} onLogout={handleLogout} />}
      
      {currentPage === 'friends' && (
        <FriendsPage 
          onNavigate={setCurrentPage} 
          currentUser={user}
          userData={userData}
          showToast={showToast}
        />
      )}

      <AnimatePresence>
        {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      </AnimatePresence>

      {/* Global Buttons (Hidden on Landing AND Setup) */}
      {currentPage !== 'landing' && currentPage !== 'setup' && currentPage !== 'settings' && (
        <button onClick={() => setCurrentPage('settings')} className="fixed bottom-6 left-6 z-50 p-3 bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md text-gray-400 dark:text-gray-200 rounded-full shadow-lg border border-white/50 dark:border-white/10 hover:text-pink-400 transition-all hover:scale-110 active:scale-95">
          <Settings size={24} />
        </button>
      )}

      {currentPage !== 'landing' && currentPage !== 'setup' && currentPage !== 'friends' && (
        <button onClick={() => setCurrentPage('friends')} className="fixed top-6 right-6 z-50 p-3 bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md text-gray-400 dark:text-gray-200 rounded-full shadow-lg border border-white/50 dark:border-white/10 hover:text-pink-400 transition-all hover:scale-110 active:scale-95">
          <Users size={24} />
        </button>
      )}

      {/* --- SIDE TAB FOR FRIEND ACTIVITY --- */}
      {/* Only show if logged in and not on landing/setup */}
      {user && currentPage !== 'landing' && currentPage !== 'setup' && (
        <FriendActivityTab friends={userData?.friends || []} />
      )}

      {/* Global Buttons */}
      {currentPage !== 'landing' && currentPage !== 'setup' && currentPage !== 'settings' && (
        <button onClick={() => setCurrentPage('settings')} className="fixed bottom-6 left-6 z-50 p-3 bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md text-gray-400 dark:text-gray-200 rounded-full shadow-lg border border-white/50 dark:border-white/10 hover:text-pink-400 transition-all hover:scale-110 active:scale-95">
          <Settings size={24} />
        </button>
      )}

      {currentPage !== 'landing' && currentPage !== 'setup' && currentPage !== 'friends' && (
        <button onClick={() => setCurrentPage('friends')} className="fixed top-6 right-6 z-50 p-3 bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md text-gray-400 dark:text-gray-200 rounded-full shadow-lg border border-white/50 dark:border-white/10 hover:text-pink-400 transition-all hover:scale-110 active:scale-95">
          <Users size={24} />
        </button>
      )}

    </div>
  );
}

export default App;