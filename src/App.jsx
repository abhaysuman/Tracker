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
import Messenger from './Messenger';
import UserProfileModal from './UserProfileModal';
import VideoCallModal from './VideoCallModal';
import { Settings, Users, Bell } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

// FIREBASE IMPORTS
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';

function App() {
  // --- NAVIGATION & DATA STATE ---
  const [currentPage, setCurrentPage] = useState('landing');
  const [moodHistory, setMoodHistory] = useState({});
  const [userData, setUserData] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- UI STATE ---
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // --- GLOBAL MODAL STATES ---
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatTarget, setChatTarget] = useState(null);       // Open Messenger for this person
  const [viewProfileUid, setViewProfileUid] = useState(null); // Open Profile for this person
  const [activeCallUrl, setActiveCallUrl] = useState(null);   // Active Video Call URL

  const previousCount = useRef(0);

  // Helper to generate friend code
  const generateFriendCode = (name) => {
    const prefix = (name || "USER").substring(0, 4).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000); 
    return `${prefix}-${randomNum}`;
  };

  // 1. REQUEST BROWSER NOTIFICATION PERMISSION
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  // 2. LISTEN FOR GLOBAL NOTIFICATIONS (Hugs, etc.)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "notifications"), orderBy("timestamp", "desc"), limit(10));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const count = snapshot.size;
      setUnreadCount(count);

      // If count increased, show system alert
      if (count > previousCount.current && count > 0) {
        const latest = snapshot.docs[0].data();
        if (Notification.permission === 'granted' && document.hidden) {
          new Notification("New Love Update! ❤️", {
            body: `${latest.senderName || 'Someone'} ${latest.message}`,
            icon: '/icon.png' 
          });
        }
        showToast(`New: ${latest.senderName} ${latest.message}`);
      }
      previousCount.current = count;
    });

    return () => unsubscribe();
  }, [user]);

  // 3. AUTH & USER DATA LISTENER
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setCurrentPage('landing');
        setUserData(null);
        setMoodHistory({});
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 4. FETCH USER DATA (Real-time)
  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribeSnapshot = onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMoodHistory(data.history || {});
          setUserData(data);

          // Routing Logic
          if (!data.isSetupComplete) setCurrentPage('setup');
          else if (currentPage === 'landing' || currentPage === 'setup') setCurrentPage('home');

          // Ensure Friend Code exists
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
          // Create new user doc if missing
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
    }
  }, [user]);

  // 5. DARK MODE HANDLER
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const showToast = (msg) => { setToastMessage(null); setTimeout(() => setToastMessage(msg), 10); };

  // --- ACTIONS ---

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentPage('landing');
    showToast("Logged out successfully");
  };

  const handleSaveMood = async (moodData) => {
    if (!user) return;
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const newEntry = { 
      ...moodData, 
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#EBD4F4] dark:bg-midnight-bg text-gray-500 font-bold">Loading your world...</div>;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
      
      {/* --- PAGES --- */}
      
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
        <FriendsPage 
          onNavigate={setCurrentPage} 
          currentUser={user} 
          userData={userData} 
          showToast={showToast} 
          onViewProfile={(uid) => setViewProfileUid(uid)}
        />
      )}

      {/* --- GLOBAL WIDGETS --- */}

      {/* 1. Friend Activity Feed (Left Side) */}
      {user && currentPage !== 'landing' && currentPage !== 'setup' && (
        <FriendActivityTab friends={userData?.friends || []} />
      )}

      {/* 2. Notifications Modal (Right Slide-in) */}
      <NotificationsModal isOpen={showNotifs} onClose={() => setShowNotifs(false)} user={user} />

      {/* 3. Messenger (Bottom Right) */}
      {user && (
        <Messenger 
          isOpen={true} 
          activeChatFriend={chatTarget} 
          onClose={() => setChatTarget(null)}
          user={user}
          friends={userData?.friends || []}
          onJoinCall={(url) => setActiveCallUrl(url)}
        />
      )}

      {/* 4. Profile Viewer Modal */}
      <UserProfileModal 
        isOpen={!!viewProfileUid} 
        onClose={() => setViewProfileUid(null)} 
        targetUid={viewProfileUid}
        onMessageClick={(friendData) => {
          setChatTarget(friendData);
          setViewProfileUid(null);
        }}
      />

      {/* 5. Video Call Modal (Overlay) */}
      <VideoCallModal 
        isOpen={!!activeCallUrl} 
        callUrl={activeCallUrl} 
        onClose={() => setActiveCallUrl(null)} 
      />

      {/* 6. Toast Notifications */}
      <AnimatePresence>
        {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      </AnimatePresence>

      {/* --- FLOATING NAVIGATION BUTTONS --- */}
      {currentPage !== 'landing' && currentPage !== 'setup' && (
        <>
          {/* Settings (Bottom Left) */}
          {currentPage !== 'settings' && (
            <button 
              onClick={() => setCurrentPage('settings')} 
              className="fixed bottom-6 left-6 z-50 p-3 bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md text-gray-400 dark:text-gray-200 rounded-full shadow-lg border border-white/50 dark:border-white/10 hover:text-pink-400 transition-all hover:scale-110 active:scale-95"
            >
              <Settings size={24} />
            </button>
          )}

          {/* Top Right Cluster */}
          <div className="fixed top-6 right-6 z-50 flex gap-3">
            
            {/* Notification Bell */}
            <button 
              onClick={() => setShowNotifs(true)} 
              className="relative p-3 bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md text-gray-400 dark:text-gray-200 rounded-full shadow-lg border border-white/50 dark:border-white/10 hover:text-pink-400 transition-all hover:scale-110 active:scale-95"
            >
              <Bell size={24} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-midnight-card">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Friends Page Button */}
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