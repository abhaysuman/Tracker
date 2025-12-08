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
import NotificationsModal from './NotificationsModal';
import Messenger from './Messenger'; // <--- NEW
import UserProfileModal from './UserProfileModal'; // <--- NEW
import { Settings, Users, Bell } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
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

  // --- NEW STATES FOR MESSENGER & PROFILE ---
  const [chatTarget, setChatTarget] = useState(null); // Who we are chatting with
  const [viewProfileUid, setViewProfileUid] = useState(null); // Who's profile we are looking at

  // Notifications
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const previousCount = useRef(0);

  // ... (Keep existing generateFriendCode, useEffects for auth/notifications same as before) ...
  // [I am abbreviating the repetitive logic for brevity, assume the useEffects are here as before]
  
  const generateFriendCode = (name) => {
    const prefix = (name || "USER").substring(0, 4).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000); 
    return `${prefix}-${randomNum}`;
  };

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "notifications"), orderBy("timestamp", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const count = snapshot.size;
      setUnreadCount(count);
      if (count > previousCount.current && count > 0) {
        const latest = snapshot.docs[0].data();
        if (Notification.permission === 'granted' && document.hidden) {
          new Notification("New Love Update! ❤️", { body: `${latest.senderName || 'Someone'} ${latest.message}`, icon: '/icon.png' });
        }
        showToast(`New: ${latest.senderName} ${latest.message}`);
      }
      previousCount.current = count;
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) { setLoading(false); setCurrentPage('landing'); }
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
        } else {
           // Create new user doc...
           // (Logic same as previous steps)
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
  const handleLogout = async () => { await signOut(auth); setCurrentPage('landing'); showToast("Logged out"); };
  const handleSaveMood = async (moodData) => { /* Same as before */ }; // Logic omitted for brevity, keep your existing logic!
  const handleDeleteMood = async (d, i) => { /* Same as before */ }; 

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#EBD4F4] dark:bg-midnight-bg">Loading...</div>;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
      
      {currentPage === 'landing' && <LandingPage onLoginSuccess={() => {}} />}
      
      {currentPage === 'setup' && (
        <SetupPage user={user} userData={userData} onComplete={() => setCurrentPage('home')} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      )}

      {/* Pass onOpenProfile to pages that need it */}
      {currentPage === 'home' && <HomePage onNavigate={setCurrentPage} onSaveMood={handleSaveMood} />}
      {currentPage === 'calendar' && <CalendarPage onNavigate={setCurrentPage} savedMoods={moodHistory} />}
      {currentPage === 'insights' && <InsightsPage onNavigate={setCurrentPage} savedMoods={moodHistory} />}
      {currentPage === 'history' && <HistoryPage onNavigate={setCurrentPage} savedMoods={moodHistory} onDeleteMood={handleDeleteMood} />}
      {currentPage === 'surprise' && <SurprisePage onNavigate={setCurrentPage} />}
      
      {currentPage === 'settings' && (
        <SettingsPage onNavigate={setCurrentPage} isDarkMode={isDarkMode} toggleTheme={toggleTheme} onLogout={handleLogout} user={user} userData={userData} />
      )}
      
      {currentPage === 'friends' && (
        <FriendsPage 
          onNavigate={setCurrentPage} 
          currentUser={user} 
          userData={userData} 
          showToast={showToast} 
          onViewProfile={(uid) => setViewProfileUid(uid)} // <--- Pass this
        />
      )}

      {user && currentPage !== 'landing' && currentPage !== 'setup' && (
        <FriendActivityTab friends={userData?.friends || []} />
      )}

      <NotificationsModal isOpen={showNotifs} onClose={() => setShowNotifs(false)} user={user} />

      {/* --- NEW GLOBAL COMPONENTS --- */}
      
      {/* 1. Messenger Widget (Bottom Right) */}
      {user && (
        <Messenger 
          isOpen={true} 
          activeChatFriend={chatTarget} // Opens chat if set
          onClose={() => setChatTarget(null)}
          user={user}
        />
      )}

      {/* 2. Profile Viewer Modal */}
      <UserProfileModal 
        isOpen={!!viewProfileUid} 
        onClose={() => setViewProfileUid(null)} 
        targetUid={viewProfileUid}
        onMessageClick={(friendData) => {
          setChatTarget(friendData); // Trigger Messenger
          setViewProfileUid(null);   // Close Profile
        }}
      />

      <AnimatePresence>
        {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      </AnimatePresence>

      {/* Floating Buttons */}
      {currentPage !== 'landing' && currentPage !== 'setup' && (
        <>
          {currentPage !== 'settings' && (
            <button onClick={() => setCurrentPage('settings')} className="fixed bottom-6 left-6 z-50 p-3 bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md text-gray-400 dark:text-gray-200 rounded-full shadow-lg border border-white/50 dark:border-white/10 hover:text-pink-400 transition-all hover:scale-110 active:scale-95">
              <Settings size={24} />
            </button>
          )}

          <div className="fixed top-6 right-6 z-50 flex gap-3">
            <button onClick={() => setShowNotifs(true)} className="relative p-3 bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md text-gray-400 dark:text-gray-200 rounded-full shadow-lg border border-white/50 dark:border-white/10 hover:text-pink-400 transition-all hover:scale-110 active:scale-95">
              <Bell size={24} />
              {unreadCount > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">{unreadCount}</span>}
            </button>

            {currentPage !== 'friends' && (
              <button onClick={() => setCurrentPage('friends')} className="p-3 bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md text-gray-400 dark:text-gray-200 rounded-full shadow-lg border border-white/50 dark:border-white/10 hover:text-pink-400 transition-all hover:scale-110 active:scale-95">
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