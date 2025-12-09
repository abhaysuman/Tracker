import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, ChevronLeft, Plus, Video, Send, Mic, Trash2, MoreVertical, Image as ImageIcon, CheckCheck, Search, X, Home, Calendar, BarChart2, Gift, CheckSquare, Phone, Users } from 'lucide-react';
import { collection, query, where, orderBy, addDoc, onSnapshot, serverTimestamp, doc, setDoc, updateDoc, deleteDoc, writeBatch, getDocs, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import Waveform from './Waveform';
import UserWidget from './UserWidget';
import { motion, AnimatePresence } from 'framer-motion';

export default function SideBarMessenger({ user, userData, friends = [], activeChat, setActiveChat, onStartCall, onJoinCall, openDialog, onOpenSettings, onOpenProfile, onLogout, onNavigate, currentPage, children }) {
  // --- UI STATES ---
  const [showSidebar, setShowSidebar] = useState(false); // Controls Friend List Visibility
  const [searchTerm, setSearchTerm] = useState("");

  // --- DATA ---
  const [recentChats, setRecentChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");

  // --- STATUS ---
  const [isFriendOnline, setIsFriendOnline] = useState(false);
  const [isFriendTyping, setIsFriendTyping] = useState(false);

  // --- ACTIONS ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStream, setRecordingStream] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);

  // --- REFS ---
  const scrollRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // --- CONFIG ---
  const CLOUD_NAME = "qbqrzy56";
  const UPLOAD_PRESET = "gf_mood_app";
  const API_KEY = "282875156328147";

  // 1. FETCH RECENT CHATS
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "chats"), where("participants", "array-contains", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => {
        const data = doc.data();
        const otherUser = data.users.find(u => u.uid !== user.uid);
        return { id: doc.id, ...data, otherUser };
      });
      chats.sort((a, b) => {
        const isAStarred = userData?.starredFriends?.includes(a.otherUser.uid);
        const isBStarred = userData?.starredFriends?.includes(b.otherUser.uid);
        if (isAStarred && !isBStarred) return -1;
        if (!isAStarred && isBStarred) return 1;
        return (b.lastUpdated?.toMillis() || 0) - (a.lastUpdated?.toMillis() || 0);
      });
      setRecentChats(chats);
    });
    return () => unsubscribe();
  }, [user, userData]);

  // 2. FETCH MESSAGES & STATUS
  useEffect(() => {
    if (!activeChat || !user) return;
    const chatId = [user.uid, activeChat.uid].sort().join("_");

    const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
    const unsubscribeMsgs = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      snapshot.docs.forEach(async (docSnap) => {
        const msg = docSnap.data();
        if (msg.senderId !== user.uid && !msg.read) await updateDoc(doc(db, "chats", chatId, "messages", docSnap.id), { read: true });
      });
    });

    const unsubscribeChat = onSnapshot(doc(db, "chats", chatId), (docSnap) => setIsFriendTyping(docSnap.data()?.typing?.[activeChat.uid]));
    const unsubscribeUser = onSnapshot(doc(db, "users", activeChat.uid), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const presence = data.presence || 'online';
            const isActiveNow = Date.now() - (data.lastActive?.toMillis() || 0) < 300000;
            setIsFriendOnline(presence !== 'invisible' && (presence !== 'online' || isActiveNow));
        }
    });
    return () => { unsubscribeMsgs(); unsubscribeChat(); unsubscribeUser(); };
  }, [activeChat, user]);

  // --- ACTIONS ---
  const handleInputChange = async (e) => {
    setInputText(e.target.value);
    if(!activeChat) return;
    const chatId = [user.uid, activeChat.uid].sort().join("_");
    await setDoc(doc(db, "chats", chatId), { typing: { [user.uid]: true } }, { merge: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(async () => { await setDoc(doc(db, "chats", chatId), { typing: { [user.uid]: false } }, { merge: true }); }, 2000);
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('api_key', API_KEY);
    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.secure_url) await sendToFirebase(data.secure_url, 'image');
    } catch (err) { console.error(err); }
    setIsUploading(false);
  };

  const sendToFirebase = async (content, type) => {
    const chatId = [user.uid, activeChat.uid].sort().join("_");
    const chatRef = doc(db, "chats", chatId);
    let previewText = content;
    if (type === 'call') previewText = '🎥 Video Call';
    if (type === 'voice_call') previewText = '📞 Voice Call';
    if (type === 'audio') previewText = '🎤 Voice Message';
    if (type === 'image') previewText = '📷 Photo';
    await setDoc(chatRef, {
        participants: [user.uid, activeChat.uid],
        users: [ { uid: user.uid, name: user.displayName, avatar: user.photoURL }, { uid: activeChat.uid, name: activeChat.name || activeChat.displayName, avatar: activeChat.avatar || activeChat.photoURL } ],
        lastMessage: previewText,
        lastUpdated: serverTimestamp(),
        typing: { [user.uid]: false }
    }, { merge: true });
    await addDoc(collection(db, "chats", chatId, "messages"), { text: content, type: type, senderId: user.uid, createdAt: serverTimestamp(), read: false });
  };

  const sendMessage = async (e) => { e.preventDefault(); if (!inputText.trim() || !activeChat) return; await sendToFirebase(inputText, 'text'); setInputText(""); };

  const startRecording = async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const mediaRecorder = new MediaRecorder(stream); mediaRecorderRef.current = mediaRecorder; mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); }; mediaRecorder.start(); setRecordingStream(stream); setIsRecording(true); setRecordingTime(0); timerRef.current = setInterval(() => { setRecordingTime(prev => prev + 1); }, 1000); } catch (e) { alert("Mic error."); } };

  const stopAndSendAudio = () => {
    if (!mediaRecorderRef.current) return;
    setIsUploading(true);
    clearInterval(timerRef.current);
    setRecordingStream(null);
    mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (mediaRecorderRef.current.stream) mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        const formData = new FormData();
        formData.append('file', audioBlob);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('api_key', API_KEY);
        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.secure_url) await sendToFirebase(data.secure_url, 'audio');
        } catch (e) {}
        setIsRecording(false);
        setIsUploading(false);
    };
    mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => { if (mediaRecorderRef.current) { if (mediaRecorderRef.current.stream) mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); mediaRecorderRef.current = null; } clearInterval(timerRef.current); setIsRecording(false); setRecordingStream(null); };
  const formatTime = (s) => { const m = Math.floor(s / 60); const sc = s % 60; return `${m}:${sc < 10 ? '0' : ''}${sc}`; };

  const handleStartVideoCall = async () => {
    if (!activeChat) return;
    const roomId = `call_${user.uid}_${Date.now()}`;
    if (onStartCall) onStartCall(roomId, 'video');
    await sendToFirebase(roomId, 'call');
    try { await addDoc(collection(db, "users", activeChat.uid, "notifications"), { type: 'call_invite', callType: 'video', message: 'is calling you! 🎥', roomId: roomId, senderUid: user.uid, senderName: user.displayName, timestamp: serverTimestamp(), read: false }); } catch (e) {}
  };

  const handleStartVoiceCall = async () => {
    if (!activeChat) return;
    const roomId = `call_${user.uid}_${Date.now()}`;
    if (onStartCall) onStartCall(roomId, 'voice');
    await sendToFirebase(roomId, 'voice_call');
    try { await addDoc(collection(db, "users", activeChat.uid, "notifications"), { type: 'call_invite', callType: 'voice', message: 'is calling you! 📞', roomId: roomId, senderUid: user.uid, senderName: user.displayName, timestamp: serverTimestamp(), read: false }); } catch (e) {}
  };

  const requestClearChat = () => { setShowChatMenu(false); openDialog("Clear Chat", "Delete entire history?", async () => { const chatId = [user.uid, activeChat.uid].sort().join("_"); const q = query(collection(db, "chats", chatId, "messages")); const snapshot = await getDocs(q); const batch = writeBatch(db); snapshot.docs.forEach((doc) => batch.delete(doc.ref)); batch.update(doc(db, "chats", chatId), { lastMessage: "" }); await batch.commit(); }, true, "Clear"); };

  // --- RENDER ---
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1e1f22] font-sans">

      {/* 1. LEFT RAIL */}
      <div className="w-[72px] bg-white dark:bg-[#1e1f22] flex flex-col items-center py-4 gap-2 border-r border-gray-200 dark:border-[#1e1f22] shrink-0 z-50 shadow-sm">
        <NavIcon icon={<Home size={28} />} label="Home" onClick={() => { setActiveChat(null); onNavigate('home'); }} isActive={currentPage === 'home'} />
        <NavIcon icon={<MessageCircle size={28} />} label="Messages" isActive={showSidebar} onClick={() => { setShowSidebar(!showSidebar); }} />

        {/* FRIENDS TAB (3rd Position) */}
        <NavIcon
            icon={<Users size={28} />}
            label="Friends"
            onClick={() => { setActiveChat(null); onNavigate('friends'); }}
            isActive={currentPage === 'friends'}
        />

        <div className="w-8 h-[2px] bg-gray-200 dark:bg-[#35363C] rounded-full mx-auto my-1"></div>
        <NavIcon icon={<Calendar size={24} />} label="Calendar" onClick={() => onNavigate('calendar')} />
        <NavIcon icon={<CheckSquare size={24} />} label="Bucket List" onClick={() => onNavigate('bucketlist')} />
        <NavIcon icon={<Gift size={24} />} label="Surprise" onClick={() => onNavigate('surprise')} />
        <NavIcon icon={<BarChart2 size={24} />} label="Insights" onClick={() => onNavigate('insights')} />
      </div>

      {/* 2. SIDEBAR PANEL */}
      <AnimatePresence mode="popLayout">
        {showSidebar && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 260, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="flex flex-col border-r border-gray-200 dark:border-[#1f2023] shrink-0 z-40 relative bg-[var(--theme-light)]/10 dark:bg-[#2b2d31]">
                <div className="h-12 border-b border-gray-200 dark:border-[#1f2023] flex items-center px-4 shadow-sm shrink-0">
                    <button className="w-full text-left bg-white dark:bg-[#1e1f22] text-gray-500 dark:text-[#949BA4] text-xs px-2 py-1.5 rounded flex items-center shadow-sm"><Search size={14} className="mr-2" /> Find conversation</button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
                    <div className="px-2 pt-2 pb-1 text-[10px] font-bold text-gray-400 dark:text-[#949BA4] uppercase tracking-wider">Direct Messages</div>
                    {recentChats.map(chat => (
                        <div key={chat.id} onClick={() => setActiveChat(chat.otherUser)} className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer group transition-colors ${activeChat?.uid === chat.otherUser.uid ? 'bg-[var(--theme-primary)] text-white' : 'text-gray-600 dark:text-[#949BA4] hover:bg-black/5 dark:hover:bg-[#35373C]'}`}>
                            <div className="relative"><div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-500 overflow-hidden border border-white/10"><img src={chat.otherUser.avatar} className="w-full h-full object-cover" /></div></div>
                            <div className="flex-1 min-w-0"><h4 className="font-bold text-sm truncate">{chat.otherUser.name}</h4><p className={`text-[11px] truncate h-3 ${activeChat?.uid === chat.otherUser.uid ? 'text-white/80' : 'text-gray-400'}`}>{chat.lastMessage}</p></div>
                        </div>
                    ))}
                </div>
                <div className="mt-auto bg-white/50 dark:bg-[#232428] backdrop-blur-md border-t border-gray-200 dark:border-[#1f2023]"><UserWidget user={user} userData={userData} onOpenSettings={onOpenSettings} onOpenProfile={onOpenProfile} onLogout={onLogout} /></div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* 3. MAIN AREA */}
      <div className="flex-1 bg-white dark:bg-[#313338] flex flex-col min-w-0 relative h-full">
        {activeChat ? (
            <>
                <div className="h-12 border-b border-gray-100 dark:border-[#26272D] flex items-center justify-between px-4 shadow-sm bg-white dark:bg-[#313338] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="relative"><div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-500"><img src={activeChat.avatar || activeChat.photoURL} className="w-full h-full object-cover" /></div>{isFriendOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#313338]"></div>}</div>
                        <div><h3 className="font-bold text-gray-800 dark:text-white text-sm">{activeChat.name}</h3><p className="text-[10px] text-gray-500 font-bold">{isFriendTyping ? <span className="text-[var(--theme-primary)] animate-pulse">Typing...</span> : isFriendOnline ? "Online" : "Offline"}</p></div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                        <button onClick={handleStartVoiceCall} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors" title="Voice Call"><Phone size={20}/></button>
                        <button onClick={handleStartVideoCall} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors" title="Video Call"><Video size={20}/></button>
                        <button onClick={() => setActiveChat(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50 dark:bg-[#313338]">
                    {messages.map((msg, i) => {
                        const isMe = msg.senderId === user.uid;
                        return (
                            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group hover:bg-black/5 dark:hover:bg-[#2e3035]/30 -mx-4 px-4 py-1`}>
                                {!isMe && <div className="w-8 h-8 rounded-full overflow-hidden mr-3 mt-1 bg-gray-300 dark:bg-gray-600"><img src={activeChat.avatar} className="w-full h-full object-cover" /></div>}
                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                                    {msg.type === 'image' ? <img src={msg.text} className="rounded-xl max-w-sm mb-1 border-2 border-[var(--theme-primary)]" /> :
                                     msg.type === 'audio' ? <div className="bg-white dark:bg-[#2B2D31] p-2 rounded-xl shadow-sm"><Waveform audioUrl={msg.text} isMe={isMe} /></div> :
                                     msg.type === 'call' ? <div className="bg-white dark:bg-[#2B2D31] p-3 rounded-xl border border-[var(--theme-primary)]/50 flex items-center gap-2"><Video size={16} className="text-[var(--theme-primary)]"/> <span className="text-gray-800 dark:text-white text-sm font-bold">Video Call</span><button onClick={() => onJoinCall(msg.text)} className="text-xs text-[var(--theme-primary)] font-bold hover:underline">Join</button></div> :
                                     msg.type === 'voice_call' ? <div className="bg-white dark:bg-[#2B2D31] p-3 rounded-xl border border-green-500/50 flex items-center gap-2"><Phone size={16} className="text-green-500"/> <span className="text-gray-800 dark:text-white text-sm font-bold">Voice Call</span><button onClick={() => onJoinCall(msg.text)} className="text-xs text-green-500 font-bold hover:underline">Join</button></div> :
                                     <div className={`text-[15px] leading-relaxed ${isMe ? 'text-gray-800 dark:text-gray-100' : 'text-gray-800 dark:text-gray-100'}`}>{msg.text}</div>}
                                </div>
                            </div>
                        )
                    })}
                    <div ref={scrollRef}></div>
                </div>

                <div className="px-4 pb-6 bg-white dark:bg-[#313338] shrink-0">
                    <div className="bg-gray-100 dark:bg-[#383A40] rounded-2xl px-3 py-2 flex items-center gap-3 transition-all focus-within:ring-2 focus-within:ring-[var(--theme-primary)]/50">
                        <button onClick={() => fileInputRef.current.click()} className="text-gray-400 hover:text-[var(--theme-primary)] p-1.5"><Plus size={20} /></button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                        {isRecording ? (
                            <div className="flex-1 flex items-center gap-3 text-red-500 font-bold animate-pulse"><Mic size={18} /> Recording... {formatTime(recordingTime)}<button onClick={stopAndSendAudio} className="ml-auto text-xs bg-red-500 text-white px-3 py-1 rounded-full">Send</button><button onClick={cancelRecording} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button></div>
                        ) : (
                            <input value={inputText} onChange={handleInputChange} onKeyDown={(e) => e.key === 'Enter' && sendMessage(e)} placeholder={`Message @${activeChat.name}`} className="bg-transparent flex-1 outline-none text-gray-800 dark:text-[#DBDEE1] placeholder-gray-400" autoFocus />
                        )}
                        <div className="flex items-center gap-2 text-gray-400">
                            <button onClick={startRecording} className="hover:text-[var(--theme-primary)] transition-colors"><Mic size={20} /></button>
                            {inputText && <button onClick={sendMessage} className="text-[var(--theme-primary)] hover:scale-110 transition-transform"><Send size={20} /></button>}
                        </div>
                    </div>
                </div>
            </>
        ) : (
            <div className="flex-1 overflow-y-auto bg-[#EBD4F4] dark:bg-[#313338] relative h-full">
                {children}
            </div>
        )}
      </div>
    </div>
  );
}

function NavIcon({ icon, label, onClick, isActive }) {
    return (
        <div className="group relative flex items-center justify-center w-[48px] h-[48px] cursor-pointer mb-2" onClick={onClick}>
            {isActive && <div className="absolute left-0 w-1 h-5 bg-[var(--theme-primary)] rounded-r-full transition-all duration-200"></div>}
            <div className={`w-[48px] h-[48px] rounded-[24px] group-hover:rounded-[16px] flex items-center justify-center transition-all duration-200 shadow-sm ${isActive ? 'bg-[var(--theme-primary)] text-white rounded-[16px]' : 'bg-gray-100 dark:bg-[#313338] text-[var(--theme-primary)] group-hover:bg-[var(--theme-primary)] group-hover:text-white'}`}>
                {icon}
            </div>
            <div className="absolute left-16 bg-black text-white text-xs font-bold px-3 py-1.5 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {label}
            </div>
        </div>
    )
}