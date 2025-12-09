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
import BucketListPage from './BucketListPage';
import Toast from './Toast';
import NotificationsModal from './NotificationsModal';
import UserProfileModal from './UserProfileModal';
import CallInterface from './CallInterface'; // <--- USING NEW CALL INTERFACE
import GlobalDialog from './GlobalDialog';
import ProfileModal from './ProfileModal'; 
import SideBarMessenger from './SideBarMessenger'; 
import { Phone, Video as VideoIcon, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, query, orderBy, limit, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// THEME CONFIG
const THEMES = {
  pink:   { primary: '#ec4899', light: '#fbcfe8', dark: '#be185d' },
  blue:   { primary: '#3b82f6', light: '#bfdbfe', dark: '#1d4ed8' },
  purple: { primary: '#a855f7', light: '#e9d5ff', dark: '#7e22ce' },
  green:  { primary: '#22c55e', light: '#bbf7d0', dark: '#15803d' },
  orange: { primary: '#f97316', light: '#fed7aa', dark: '#c2410c' },
};

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [moodHistory, setMoodHistory] = useState({});
  const [userData, setUserData] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatTarget, setChatTarget] = useState(null);       
  const [viewProfileUid, setViewProfileUid] = useState(null); 
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [activeCallId, setActiveCallId] = useState(null); 
  const [callRole, setCallRole] = useState(null);         
  const [incomingCall, setIncomingCall] = useState(null); 

  const ringtoneRef = useRef(new Audio('/ringtone.mp3')); 

  const generateFriendCode = (name) => {
    const prefix = (name || "USER").substring(0, 4).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000); 
    return `${prefix}-${randomNum}`;
  };

  const openDialog = (title, message, onConfirm, isDanger = false, confirmText = "Confirm") => {
    setDialogConfig({ title, message, onConfirm, isDanger, confirmText });
    setDialogOpen(true);
  };

  useEffect(() => { if ('Notification' in window && Notification.permission !== 'granted') Notification.requestPermission(); }, []);

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const updateStatus = async () => { try { await updateDoc(userRef, { lastActive: serverTimestamp() }); } catch (e) {} };
    updateStatus();
    const interval = setInterval(updateStatus, 120000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (userData?.theme && THEMES[userData.theme]) {
        const t = THEMES[userData.theme];
        const styleId = 'dynamic-theme-style';
        let styleTag = document.getElementById(styleId);
        if (!styleTag) { styleTag = document.createElement('style'); styleTag.id = styleId; document.head.appendChild(styleTag); }
        styleTag.innerHTML = `:root { --theme-primary: ${t.primary}; --theme-light: ${t.light}; --theme-dark: ${t.dark}; } .bg-pink-500, .bg-pink-400 { background-color: var(--theme-primary) !important; } .text-pink-500, .text-pink-600, .text-pink-400 { color: var(--theme-primary) !important; } .border-pink-500, .border-pink-200 { border-color: var(--theme-primary) !important; } .bg-pink-100, .bg-pink-50 { background-color: var(--theme-light) !important; } .from-pink-400 { --tw-gradient-from: var(--theme-primary) !important; } .to-purple-400 { --tw-gradient-to: var(--theme-dark) !important; }`;
    }
  }, [userData?.theme]);

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
          if (!data.friendCode) await setDoc(userDocRef, { friendCode: generateFriendCode(user.displayName), displayName: user.displayName, email: user.email, photoURL: user.photoURL, friends: [] }, { merge: true });
        } else {
          await setDoc(userDocRef, { history: {}, friendCode: generateFriendCode(user.displayName), displayName: user.displayName, email: user.email, photoURL: user.photoURL, friends: [], isSetupComplete: false });
        }
        setLoading(false);
      });
      return () => unsubscribeSnapshot();
    }
  }, [user]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) { setLoading(false); setCurrentPage('landing'); setUserData(null); setMoodHistory({}); }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    ringtoneRef.current.loop = true;
    const q = query(collection(db, "users", user.uid, "notifications"), orderBy("timestamp", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data.type === 'call_invite') {
            const callTime = data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now();
            if (Date.now() - callTime < 60000) { 
              ringtoneRef.current.play().catch(e => console.log(e));
              setIncomingCall({ id: change.doc.id, ...data });
              if (Notification.permission === 'granted' && document.hidden) new Notification(`Incoming Video Call from ${data.senderName}!`, { icon: '/icon.png' });
            } else { deleteDoc(doc(db, "users", user.uid, "notifications", change.doc.id)); }
          } else { showToast(`New: ${data.senderName} ${data.message}`); }
        }
      });
    });
    return () => { unsubscribe(); ringtoneRef.current.pause(); ringtoneRef.current.currentTime = 0; };
  }, [user]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const showToast = (msg) => { setToastMessage(null); setTimeout(() => setToastMessage(msg), 10); };
  const handleLogout = async () => { openDialog("Log Out", "Are you sure you want to log out?", async () => { await signOut(auth); setCurrentPage('landing'); showToast("Logged out successfully"); }, true, "Log Out"); };
  const handleSaveMood = async (moodData) => { if (!user) return; const today = new Date(); const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`; const newEntry = { ...moodData, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }; const updatedHistory = { ...moodHistory }; const existingMoods = updatedHistory[dateKey] || []; updatedHistory[dateKey] = [...existingMoods, newEntry]; setMoodHistory(updatedHistory); showToast("Mood Saved! ☁️"); await setDoc(doc(db, "users", user.uid), { history: updatedHistory }, { merge: true }); };
  const handleDeleteMood = async (dateKey, indexToDelete) => { openDialog("Delete Memory", "Are you sure? This cannot be undone.", async () => { if (!user) return; const updatedHistory = { ...moodHistory }; const updatedDayList = updatedHistory[dateKey].filter((_, index) => index !== indexToDelete); if (updatedDayList.length === 0) delete updatedHistory[dateKey]; else updatedHistory[dateKey] = updatedDayList; setMoodHistory(updatedHistory); showToast("Memory deleted."); await setDoc(doc(db, "users", user.uid), { history: updatedHistory }, { merge: true }); }, true, "Delete"); };
  const stopRinging = async () => { ringtoneRef.current.pause(); ringtoneRef.current.currentTime = 0; if (incomingCall?.id) deleteDoc(doc(db, "users", user.uid, "notifications", incomingCall.id)); setIncomingCall(null); };
  const answerCall = () => { if (!incomingCall) return; const roomId = incomingCall.roomId; stopRinging(); setActiveCallId(roomId); setCallRole('callee'); };
  const rejectCall = () => { stopRinging(); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#1e1f22]">Loading...</div>;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
      
      {currentPage === 'landing' && <LandingPage onLoginSuccess={() => {}} />}
      {currentPage === 'setup' && <SetupPage user={user} userData={userData} onComplete={() => setCurrentPage('home')} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />}

      {/* SIDEBAR WRAPPER (MAIN LAYOUT) */}
      {user && currentPage !== 'landing' && currentPage !== 'setup' && (
        <SideBarMessenger 
          user={user} 
          userData={userData} 
          friends={userData?.friends || []} 
          activeChat={chatTarget} 
          setActiveChat={setChatTarget}
          onStartCall={(roomId) => { setActiveCallId(roomId); setCallRole('caller'); }} 
          onJoinCall={(roomId) => { setActiveCallId(roomId); setCallRole('callee'); }} 
          openDialog={openDialog}
          onNavigate={setCurrentPage} 
          onOpenSettings={() => setCurrentPage('settings')}
          onOpenProfile={() => setIsProfileOpen(true)}
          onLogout={handleLogout}
        >
            {currentPage === 'home' && <HomePage onNavigate={setCurrentPage} onSaveMood={handleSaveMood} />}
            {currentPage === 'calendar' && <CalendarPage onNavigate={setCurrentPage} savedMoods={moodHistory} />}
            {currentPage === 'insights' && <InsightsPage onNavigate={setCurrentPage} savedMoods={moodHistory} />}
            {currentPage === 'history' && <HistoryPage onNavigate={setCurrentPage} savedMoods={moodHistory} onDeleteMood={handleDeleteMood} />}
            {currentPage === 'surprise' && <SurprisePage onNavigate={setCurrentPage} />}
            {currentPage === 'bucketlist' && <BucketListPage onNavigate={setCurrentPage} />}
            {currentPage === 'settings' && <SettingsPage onNavigate={setCurrentPage} isDarkMode={isDarkMode} toggleTheme={toggleTheme} onLogout={handleLogout} user={user} userData={userData} openDialog={openDialog} />}
            {currentPage === 'friends' && <FriendsPage onNavigate={setCurrentPage} currentUser={user} userData={userData} showToast={showToast} onViewProfile={(uid) => setViewProfileUid(uid)} openDialog={openDialog} />}
        </SideBarMessenger>
      )}

      <NotificationsModal isOpen={showNotifs} onClose={() => setShowNotifs(false)} user={user} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} userData={userData} />
      <UserProfileModal isOpen={!!viewProfileUid} onClose={() => setViewProfileUid(null)} targetUid={viewProfileUid} onMessageClick={(friendData) => { setChatTarget(friendData); setViewProfileUid(null); }} />
      
      {/* CALL INTERFACE (OVERLAY) */}
      {activeCallId && <CallInterface callId={activeCallId} role={callRole} user={user} activeChat={chatTarget || incomingCall} onClose={() => { setActiveCallId(null); setCallRole(null); window.location.reload(); }} />}
      
      <AnimatePresence>{incomingCall && <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[300] bg-white dark:bg-midnight-card px-6 py-4 rounded-full shadow-2xl border-2 border-pink-500 flex items-center gap-6"><div className="flex items-center gap-3"><div className="p-3 bg-pink-100 rounded-full animate-pulse text-pink-600"><Phone size={24} className="shake-animation" /></div><div><h3 className="font-bold text-gray-800 dark:text-white text-lg">{incomingCall.senderName}</h3><p className="text-pink-500 text-xs font-bold uppercase tracking-wider">Incoming Video Call...</p></div></div><div className="flex gap-2"><button onClick={rejectCall} className="p-3 bg-red-100 text-red-500 rounded-full hover:bg-red-200 transition-colors"><X size={20} /></button><button onClick={answerCall} className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-lg transition-transform hover:scale-110"><VideoIcon size={20} fill="currentColor" /></button></div></motion.div>}</AnimatePresence>
      <GlobalDialog isOpen={dialogOpen} config={dialogConfig} onClose={() => setDialogOpen(false)} />
      <AnimatePresence>{toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}</AnimatePresence>
    </div>
  );
}

export default App;