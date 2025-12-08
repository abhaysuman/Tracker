import React, { useState, useEffect, useRef } from 'react';
import LandingPage from './LandingPage';
import HomePage from './HomePage';
import CalendarPage from './CalendarPage';
import InsightsPage from './InsightsPage';
import HistoryPage from './HistoryPage';
import SurprisePage from './SurprisePage';
import SettingsPage from './SettingsPage';
import FriendsPage from './FriendsPage';
import SetupPage from './SetupPage';
import Toast from './Toast';
import FriendActivityTab from './FriendActivityTab';
import NotificationsModal from './NotificationsModal'; // <--- Import Modal
import { Settings, Users, Bell } from 'lucide-react'; // <--- Import Bell
import { AnimatePresence, motion } from 'framer-motion';

// FIREBASE
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [moodHistory, setMoodHistory] = useState({});
  const [userData, setUserData] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- NOTIFICATION STATE (Moved to Global) ---
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const previousCount = useRef(0);

  const generateFriendCode = (name) => {
    const prefix = (name || "USER").substring(0, 4).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000); 
    return `${prefix}-${randomNum}`;
  };

  // --- 1. REQUEST BROWSER PERMISSION ---
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  // --- 2. GLOBAL NOTIFICATION LISTENER ---
  useEffect(() => {
    if (!user) return;

    // Listen to the user's notifications collection
    const q = query(collection(db, "users", user.uid, "notifications"), orderBy("timestamp", "desc"), limit(10));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const count = snapshot.size;
      setUnreadCount(count);

      // IF new notification arrived (count increased), trigger System Alert
      if (count > previousCount.current && count > 0) {
        const latest = snapshot.docs[0].data();
        
        // Show System Banner (Browser/Phone Native Notification)
        if (Notification.permission === 'granted' && document.hidden) {
          new Notification("New Love Update! ❤️", {
            body: `${latest.senderName || 'Someone'} ${latest.message}`,
            icon: '/icon.png' // Make sure icon.png is in public folder
          });
        }
        // Also show in-app toast
        showToast(`New: ${latest.senderName} ${latest.message}`);
      }
      previousCount.current = count;
    });

    return () => unsubscribe();
  }, [user]);

  // --- AUTH & DATA LOADING ---
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

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribeSnapshot = onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMoodHistory(data.history || {});
          setUserData(data);

          if (!data.isSetupComplete) setCurrentPage('setup');
          else if (currentPage === 'landing' || currentPage === 'setup') setCurrentPage('home');

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
          const newCode = generateFriendCode(user.displayName);
          await setDoc(userDocRef, {
            history: {},
            friendCode: newCode,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            friends: [],
            isSetupComplete: false
          });
        }
        setLoading(false);
      });
      return () => unsubscribeSnapshot();
    } else {
      setMoodHistory({});
      setUserData(null);
    }
  }, [user]);

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#EBD4F4] dark:bg-midnight-bg">Loading...</div>;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
      
      {currentPage === 'landing' && <LandingPage onLoginSuccess={() => {}} />}
      
      {currentPage === 'setup' && (
        <SetupPage user={user} userData={userData} onComplete={() => setCurrentPage('home')} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      )}

      {currentPage === 'home' && <HomePage onNavigate={setCurrentPage} onSaveMood={handleSaveMood} />}
      {currentPage === 'calendar' && <CalendarPage onNavigate={setCurrentPage} savedMoods={moodHistory} />}
      {currentPage === 'insights' && <InsightsPage onNavigate={setCurrentPage} savedMoods={moodHistory} />}
      {currentPage === 'history' && <HistoryPage onNavigate={setCurrentPage} savedMoods={moodHistory} onDeleteMood={handleDeleteMood} />}
      {currentPage === 'surprise' && <SurprisePage onNavigate={setCurrentPage} />}
      
      {currentPage === 'settings' && (
        <SettingsPage 
          onNavigate={setCurrentPage} 
          isDarkMode={isDarkMode} 
          toggleTheme={toggleTheme} 
          onLogout={handleLogout}
          user={user}
          userData={userData}
        />
      )}
      
      {currentPage === 'friends' && (
        <FriendsPage onNavigate={setCurrentPage} currentUser={user} userData={userData} showToast={showToast} />
      )}

      {user && currentPage !== 'landing' && currentPage !== 'setup' && (
        <FriendActivityTab friends={userData?.friends || []} />
      )}

      {/* --- GLOBAL NOTIFICATIONS MODAL --- */}
      <NotificationsModal isOpen={showNotifs} onClose={() => setShowNotifs(false)} user={user} />

      <AnimatePresence>
        {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      </AnimatePresence>

      {/* --- FLOATING BUTTONS (FIXED LOCATION) --- */}
      {currentPage !== 'landing' && currentPage !== 'setup' && (
        <>
          {/* Settings Button (Bottom Left) */}
          {currentPage !== 'settings' && (
            <button onClick={() => setCurrentPage('settings')} className="fixed bottom-6 left-6 z-50 p-3 bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md text-gray-400 dark:text-gray-200 rounded-full shadow-lg border border-white/50 dark:border-white/10 hover:text-pink-400 transition-all hover:scale-110 active:scale-95">
              <Settings size={24} />
            </button>
          )}

          {/* TOP RIGHT CLUSTER: Friends + Notifications */}
          <div className="fixed top-6 right-6 z-50 flex gap-3">
            
            {/* 1. NOTIFICATION BELL (NEW LOCATION) */}
            <button 
              onClick={() => setShowNotifs(true)} 
              className="relative p-3 bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md text-gray-400 dark:text-gray-200 rounded-full shadow-lg border border-white/50 dark:border-white/10 hover:text-pink-400 transition-all hover:scale-110 active:scale-95"
            >
              <Bell size={24} />
              {/* Red Dot Counter */}
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-midnight-card">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* 2. FRIENDS BUTTON */}
            {currentPage !== 'friends' && (
              <button 
                onClick={() => setCurrentPage('friends')} 
                className="p-3 bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md text-gray-400 dark:text-gray-200 rounded-full shadow-lg border border-white/50 dark:border-white/10 hover:text-pink-400 transition-all hover:scale-110 active:scale-95"
              >
                <Users size={24} />
              </button>
            )}
          </div>
        </>
      )}

    </div>
  );
}

export default App;