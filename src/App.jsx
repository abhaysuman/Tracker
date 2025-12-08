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
import VideoCall from './VideoCall'; // The Native WebRTC Component
import { Settings, Users, Bell, Phone, Video as VideoIcon, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// FIREBASE
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';

function App() {
  // --- NAVIGATION & DATA ---
  const [currentPage, setCurrentPage] = useState('landing');
  const [moodHistory, setMoodHistory] = useState({});
  const [userData, setUserData] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- UI STATE ---
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // --- GLOBAL MODALS ---
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatTarget, setChatTarget] = useState(null);       // Open Messenger for this friend
  const [viewProfileUid, setViewProfileUid] = useState(null); // Open Profile for this UID

  // --- VIDEO CALL STATE ---
  const [activeCallId, setActiveCallId] = useState(null); // If set, VideoCall component renders
  const [callRole, setCallRole] = useState(null);         // 'caller' or 'callee'
  const [incomingCall, setIncomingCall] = useState(null); // Data for the "Ringing" popup

  // --- REFS ---
  const previousCount = useRef(0);
  const ringtoneRef = useRef(new Audio('/ringtone.mp3')); // Ensure ringtone.mp3 is in /public

  // HELPER: Generate Friend Code
  const generateFriendCode = (name) => {
    const prefix = (name || "USER").substring(0, 4).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000); 
    return `${prefix}-${randomNum}`;
  };

  // 1. BROWSER PERMISSIONS
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  // 2. GLOBAL NOTIFICATION LISTENER (Handles Hugs & Ringing)
  useEffect(() => {
    if (!user) return;
    
    // Configure ringtone
    ringtoneRef.current.loop = true;

    const q = query(collection(db, "users", user.uid, "notifications"), orderBy("timestamp", "desc"), limit(10));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const count = snapshot.size;
      setUnreadCount(count);

      // IF NEW NOTIFICATION ARRIVES
      if (count > previousCount.current && count > 0) {
        const latest = snapshot.docs[0].data();
        
        // A. IS IT A CALL?
        if (latest.type === 'call_invite') {
          // 1. Play Sound (Catch error if user hasn't interacted yet)
          ringtoneRef.current.play().catch(e => console.log("Audio play failed (interaction needed):", e));
          
          // 2. Show Incoming Call Modal
          setIncomingCall({
            id: snapshot.docs[0].id, 
            ...latest
          });

          // 3. System Notification
          if (Notification.permission === 'granted' && document.hidden) {
            new Notification(`Incoming Video Call from ${latest.senderName}!`, { icon: '/icon.png' });
          }
        } 
        // B. STANDARD NOTIFICATION
        else {
          showToast(`New: ${latest.senderName} ${latest.message}`);
        }
      }
      previousCount.current = count;
    });

    return () => {
      unsubscribe();
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    };
  }, [user]);

  // 3. AUTH LISTENER
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

  // 4. USER DATA LISTENER
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
            await setDoc(userDocRef, { friendCode: newCode, displayName: user.displayName, email: user.email, photoURL: user.photoURL, friends: [] }, { merge: true });
          }
        } else {
          const newCode = generateFriendCode(user.displayName);
          await setDoc(userDocRef, { history: {}, friendCode: newCode, displayName: user.displayName, email: user.email, photoURL: user.photoURL, friends: [], isSetupComplete: false });
        }
        setLoading(false);
      });
      return () => unsubscribeSnapshot();
    }
  }, [user]);

  // 5. THEME
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const showToast = (msg) => { setToastMessage(null); setTimeout(() => setToastMessage(msg), 10); };

  // --- ACTIONS ---

  const handleLogout = async () => { await signOut(auth); setCurrentPage('landing'); showToast("Logged out successfully"); };

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
    if (window.confirm("Delete this memory?")) {
      const updatedHistory = { ...moodHistory };
      const updatedDayList = updatedHistory[dateKey].filter((_, index) => index !== indexToDelete);
      if (updatedDayList.length === 0) delete updatedHistory[dateKey];
      else updatedHistory[dateKey] = updatedDayList;
      setMoodHistory(updatedHistory);
      showToast("Memory deleted.");
      await setDoc(doc(db, "users", user.uid), { history: updatedHistory }, { merge: true });
    }
  };

  // --- CALL ACTIONS ---

  const answerCall = () => {
    if (!incomingCall) return;
    ringtoneRef.current.pause();
    ringtoneRef.current.currentTime = 0;
    setActiveCallId(incomingCall.roomId);
    setCallRole('callee');
    setIncomingCall(null);
  };

  const rejectCall = () => {
    ringtoneRef.current.pause();
    ringtoneRef.current.currentTime = 0;
    setIncomingCall(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#EBD4F4] dark:bg-midnight-bg text-gray-500 font-bold">Loading...</div>;

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
        <SettingsPage onNavigate={setCurrentPage} isDarkMode={isDarkMode} toggleTheme={toggleTheme} onLogout={handleLogout} user={user} userData={userData} />
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

      {user && currentPage !== 'landing' && currentPage !== 'setup' && (
        <FriendActivityTab friends={userData?.friends || []} />
      )}

      <NotificationsModal isOpen={showNotifs} onClose={() => setShowNotifs(false)} user={user} />

      {/* MESSENGER (Bottom Right) */}
      {user && (
        <Messenger 
          isOpen={true} 
          activeChatFriend={chatTarget} 
          onClose={() => setChatTarget(null)}
          user={user}
          friends={userData?.friends || []}
          // Start Call = I am caller
          onStartCall={(roomId) => { 
            setActiveCallId(roomId); 
            setCallRole('caller'); 
          }}
          // Join Call = I am callee
          onJoinCall={(roomId) => { 
            setActiveCallId(roomId); 
            setCallRole('callee'); 
          }}
        />
      )}

      {/* PROFILE MODAL */}
      <UserProfileModal 
        isOpen={!!viewProfileUid} 
        onClose={() => setViewProfileUid(null)} 
        targetUid={viewProfileUid}
        onMessageClick={(friendData) => { setChatTarget(friendData); setViewProfileUid(null); }}
      />

      {/* VIDEO CALL OVERLAY */}
      {activeCallId && (
        <VideoCall 
          roomId={activeCallId} 
          role={callRole} 
          onClose={() => { setActiveCallId(null); setCallRole(null); window.location.reload(); }} 
        />
      )}

      {/* INCOMING CALL POPUP */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[300] bg-white dark:bg-midnight-card px-6 py-4 rounded-full shadow-2xl border-2 border-pink-500 flex items-center gap-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-pink-100 rounded-full animate-pulse text-pink-600">
                <Phone size={24} className="shake-animation" /> 
              </div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white text-lg">{incomingCall.senderName}</h3>
                <p className="text-pink-500 text-xs font-bold uppercase tracking-wider">Incoming Video Call...</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={rejectCall} className="p-3 bg-red-100 text-red-500 rounded-full hover:bg-red-200 transition-colors" title="Decline"><X size={20} /></button>
              <button onClick={answerCall} className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-lg transition-transform hover:scale-110" title="Answer"><VideoIcon size={20} fill="currentColor" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      </AnimatePresence>

      {/* FLOATING BUTTONS */}
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
              {unreadCount > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-midnight-card">{unreadCount}</span>}
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