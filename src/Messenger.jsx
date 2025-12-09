import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ChevronDown, Minimize2, ChevronLeft, Plus, Video, Send, Mic, Trash2, Edit2, MoreVertical, Paperclip, Image as ImageIcon, CheckCheck, User, Moon, Sun, MinusCircle, Circle } from 'lucide-react';
import { collection, query, where, orderBy, addDoc, onSnapshot, serverTimestamp, doc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, writeBatch, getDocs, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import Waveform from './Waveform'; 
import ProfileModal from './ProfileModal'; // <--- NEW IMPORT

// STATUS CONFIG
const STATUS_OPTIONS = [
  { id: 'online', label: 'Online', color: 'bg-green-500', icon: <div className="w-3 h-3 rounded-full bg-green-500" /> },
  { id: 'idle', label: 'Idle', color: 'bg-yellow-500', icon: <Moon size={12} className="text-yellow-500 fill-yellow-500" /> },
  { id: 'dnd', label: 'Do Not Disturb', color: 'bg-red-500', icon: <MinusCircle size={12} className="text-red-500 fill-red-500" /> },
  { id: 'invisible', label: 'Invisible', color: 'bg-gray-400', icon: <Circle size={12} className="text-gray-400 border-[3px] border-gray-400 rounded-full" /> },
];

export default function Messenger({ isOpen, onClose, activeChatFriend, user, userData, friends = [], onStartCall, onJoinCall, openDialog }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeChat, setActiveChat] = useState(null); 
  const [showNewChat, setShowNewChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [recentChats, setRecentChats] = useState([]);
  
  // STATUS & PROFILE UI
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [myStatus, setMyStatus] = useState(userData?.presence || 'online');

  // ... (Other states remain the same)
  const [isFriendOnline, setIsFriendOnline] = useState(false);
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState("");
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStream, setRecordingStream] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const scrollRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const CLOUD_NAME = "qbqrzy56"; 
  const UPLOAD_PRESET = "gf_mood_app"; 
  const API_KEY = "282875156328147"; 

  // SYNC LOCAL STATUS STATE
  useEffect(() => {
    if (userData?.presence) setMyStatus(userData.presence);
  }, [userData]);

  // HANDLE STATUS CHANGE
  const handleStatusChange = async (statusId) => {
    setMyStatus(statusId);
    setShowStatusMenu(false);
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), { presence: statusId });
  };

  useEffect(() => { if (activeChatFriend) { setIsExpanded(true); setActiveChat(activeChatFriend); setShowNewChat(false); } }, [activeChatFriend]);

  // 1. RECENT CHATS & FRIEND STATUS LOGIC
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "chats"), where("participants", "array-contains", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => {
        const data = doc.data();
        const otherUser = data.users.find(u => u.uid !== user.uid);
        // We'll need to fetch real-time status of otherUser here or in a separate listener
        // For efficiency in this snippet, we rely on the chat listener mainly for messages
        return { id: doc.id, ...data, otherUser };
      });
      chats.sort((a, b) => (b.lastUpdated?.toMillis() || 0) - (a.lastUpdated?.toMillis() || 0));
      setRecentChats(chats);
    });
    return () => unsubscribe();
  }, [user]);

  // 2. ACTIVE CHAT LISTENERS
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

    const unsubscribeUser = onSnapshot(doc(db, "users", activeChat.uid), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const presence = data.presence || 'online';
            const lastActive = data.lastActive?.toMillis ? data.lastActive.toMillis() : 0;
            const isActiveNow = Date.now() - lastActive < 300000; // 5 mins
            
            // Logic: Show online only if (presence is NOT invisible) AND (lastActive was recent OR presence is explictly set to something active)
            // But usually, presence 'invisible' overrides everything.
            if (presence === 'invisible') setIsFriendOnline(false);
            else if (presence === 'online' && isActiveNow) setIsFriendOnline(true);
            else if (presence === 'idle' || presence === 'dnd') setIsFriendOnline(true); // Show status icon
            else setIsFriendOnline(false); // Offline
        }
    });

    return () => { unsubscribeMsgs(); unsubscribeUser(); };
  }, [activeChat, user]);

  // ... (Keep ALL existing helper functions: handleImageSelect, requestDeleteMessage, requestClearChat, startEditing, saveEdit, sendToFirebase, sendMessage, startRecording, stopAndSendAudio, cancelRecording, startVideoCall, startNewChat)
  // [OMITTED FOR BREVITY - PASTE THEM BACK HERE FROM PREVIOUS STEP]
  
  // --- RE-PASTING HELPER FUNCTIONS TO ENSURE FILE IS COMPLETE ---
  const handleInputChange = async (e) => {
    setInputText(e.target.value);
    if (!activeChat) return;
    const chatId = [user.uid, activeChat.uid].sort().join("_");
    await setDoc(doc(db, "chats", chatId), { typing: { [user.uid]: true } }, { merge: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(async () => { await setDoc(doc(db, "chats", chatId), { typing: { [user.uid]: false } }, { merge: true }); }, 2000);
  };
  const handleImageSelect = async (e) => { const file = e.target.files[0]; if (!file) return; setIsUploading(true); const formData = new FormData(); formData.append('file', file); formData.append('upload_preset', UPLOAD_PRESET); formData.append('api_key', API_KEY); try { const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData }); const data = await res.json(); if (data.secure_url) await sendToFirebase(data.secure_url, 'image'); } catch (err) { console.error(err); alert("Image upload failed"); } setIsUploading(false); };
  const requestDeleteMessage = (msgId) => { openDialog("Delete Message", "Delete for everyone?", async () => { const chatId = [user.uid, activeChat.uid].sort().join("_"); await deleteDoc(doc(db, "chats", chatId, "messages", msgId)); }, true, "Delete"); };
  const requestClearChat = () => { setShowChatMenu(false); openDialog("Clear Chat", "Delete entire history?", async () => { const chatId = [user.uid, activeChat.uid].sort().join("_"); const q = query(collection(db, "chats", chatId, "messages")); const snapshot = await getDocs(q); const batch = writeBatch(db); snapshot.docs.forEach((doc) => batch.delete(doc.ref)); batch.update(doc(db, "chats", chatId), { lastMessage: "" }); await batch.commit(); }, true, "Clear"); };
  const startEditing = (msg) => { setEditingMsgId(msg.id); setEditText(msg.text); };
  const saveEdit = async () => { const chatId = [user.uid, activeChat.uid].sort().join("_"); await updateDoc(doc(db, "chats", chatId, "messages", editingMsgId), { text: editText, isEdited: true }); setEditingMsgId(null); setEditText(""); };
  const sendToFirebase = async (content, type) => { const chatId = [user.uid, activeChat.uid].sort().join("_"); const chatRef = doc(db, "chats", chatId); let previewText = content; if (type === 'call') previewText = '🎥 Video Call'; if (type === 'audio') previewText = '🎤 Voice Message'; if (type === 'image') previewText = '📷 Photo'; await setDoc(chatRef, { participants: [user.uid, activeChat.uid], users: [ { uid: user.uid, name: user.displayName, avatar: user.photoURL }, { uid: activeChat.uid, name: activeChat.name || activeChat.displayName, avatar: activeChat.avatar || activeChat.photoURL } ], lastMessage: previewText, lastUpdated: serverTimestamp(), typing: { [user.uid]: false } }, { merge: true }); await addDoc(collection(db, "chats", chatId, "messages"), { text: content, type: type, senderId: user.uid, createdAt: serverTimestamp(), read: false }); };
  const sendMessage = async (e) => { e.preventDefault(); if (!inputText.trim() || !activeChat) return; await sendToFirebase(inputText, 'text'); setInputText(""); };
  const startRecording = async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const mediaRecorder = new MediaRecorder(stream); mediaRecorderRef.current = mediaRecorder; audioChunksRef.current = []; mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); }; mediaRecorder.start(); setRecordingStream(stream); setIsRecording(true); setRecordingTime(0); timerRef.current = setInterval(() => { setRecordingTime(prev => prev + 1); }, 1000); } catch (e) { console.error(e); alert("Mic error."); } };
  const stopAndSendAudio = () => { if (!mediaRecorderRef.current) return; setIsUploading(true); clearInterval(timerRef.current); setRecordingStream(null); mediaRecorderRef.current.onstop = async () => { const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); if (mediaRecorderRef.current.stream) mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); const formData = new FormData(); formData.append('file', audioBlob); formData.append('upload_preset', UPLOAD_PRESET); formData.append('api_key', API_KEY); try { const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: formData }); const data = await res.json(); if (data.secure_url) await sendToFirebase(data.secure_url, 'audio'); } catch (e) { console.error(e); } setIsRecording(false); setIsUploading(false); }; mediaRecorderRef.current.stop(); };
  const cancelRecording = () => { if (mediaRecorderRef.current) { if (mediaRecorderRef.current.stream) mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); mediaRecorderRef.current = null; } clearInterval(timerRef.current); setIsRecording(false); setRecordingStream(null); };
  const formatTime = (s) => { const m = Math.floor(s / 60); const sc = s % 60; return `${m}:${sc < 10 ? '0' : ''}${sc}`; };
  const startVideoCall = async () => { if (!activeChat) return; const roomId = `call_${user.uid}_${Date.now()}`; if (onStartCall) onStartCall(roomId); await sendToFirebase(roomId, 'call'); try { await addDoc(collection(db, "users", activeChat.uid, "notifications"), { type: 'call_invite', message: 'is calling! 🎥', roomId: roomId, senderUid: user.uid, senderName: user.displayName, timestamp: serverTimestamp(), read: false }); } catch (e) {} };
  const startNewChat = (friend) => { setActiveChat(friend); setShowNewChat(false); };

  if (!user) return null;

  return (
    <div className="fixed bottom-0 right-4 z-[100] flex flex-col items-end pointer-events-none">
      <div className="pointer-events-auto">
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ y: 400, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 400, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="w-80 h-96 bg-white dark:bg-midnight-card rounded-t-2xl shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col overflow-hidden">
              
              {/* HEADER (UPDATED WITH AVATAR & STATUS) */}
              <div className="bg-pink-500 p-3 flex justify-between items-center text-white shadow-md z-10 relative">
                {activeChat ? (
                  <div className="flex items-center gap-2 max-w-[60%]">
                    <button onClick={() => { setActiveChat(null); setShowChatMenu(false); }} className="hover:bg-white/20 p-1 rounded-full"><ChevronLeft size={20} /></button>
                    <div className="w-7 h-7 rounded-full bg-white/20 overflow-hidden border border-white/50 shrink-0"><img src={activeChat.avatar || activeChat.photoURL} className="w-full h-full object-cover" /></div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-bold text-sm truncate">{activeChat.name || activeChat.displayName}</span>
                        <span className="text-[10px] opacity-90 font-medium flex items-center gap-1">
                            {isFriendTyping ? "Typing..." : isFriendOnline ? <><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/> Online</> : ""}
                        </span>
                    </div>
                  </div>
                ) : showNewChat ? (
                  <div className="flex items-center gap-2"><button onClick={() => setShowNewChat(false)} className="hover:bg-white/20 p-1 rounded-full"><ChevronLeft size={20} /></button><span className="font-bold text-sm">New Message</span></div>
                ) : (
                  // --- MESSENGER HOME HEADER (WITH AVATAR & STATUS MENU) ---
                  <div className="flex items-center gap-2">
                      <div className="relative cursor-pointer" onClick={() => setShowStatusMenu(!showStatusMenu)}>
                          <div className="w-8 h-8 rounded-full border-2 border-white/30 overflow-hidden bg-pink-600">
                              <img src={userData?.photoURL || user.photoURL} className="w-full h-full object-cover" />
                          </div>
                          {/* STATUS DOT */}
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-pink-500 ${STATUS_OPTIONS.find(s => s.id === myStatus)?.color || 'bg-green-500'}`}></div>
                      </div>
                      <span className="font-bold text-lg tracking-tight">Messages</span>
                  </div>
                )}
                
                {/* RIGHT ACTIONS */}
                <div className="flex gap-1 items-center relative">
                  {activeChat ? (
                    <>
                      <button onClick={startVideoCall} className="p-1.5 hover:bg-white/20 rounded-full" title="Video Call"><Video size={20} /></button>
                      <button onClick={() => setShowChatMenu(!showChatMenu)} className="p-1.5 hover:bg-white/20 rounded-full"><MoreVertical size={20} /></button>
                      {showChatMenu && <div className="absolute top-10 right-0 bg-white dark:bg-gray-800 text-gray-700 dark:text-white rounded-xl shadow-xl py-2 w-40 z-50 text-sm font-medium border border-gray-100 dark:border-gray-700"><button onClick={requestClearChat} className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 flex items-center gap-2"><Trash2 size={16} /> Clear Chat</button></div>}
                    </>
                  ) : (
                    <>
                      {!showNewChat && <button onClick={() => setShowNewChat(true)} className="p-1.5 hover:bg-white/20 rounded-full"><Plus size={20} /></button>}
                      <button onClick={() => setIsExpanded(false)} className="p-1.5 hover:bg-white/20 rounded-full"><Minimize2 size={18} /></button>
                    </>
                  )}
                </div>

                {/* --- STATUS DROPDOWN MENU --- */}
                <AnimatePresence>
                    {showStatusMenu && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-12 left-2 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 text-gray-700 dark:text-gray-200"
                        >
                            {/* Profile Header */}
                            <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                                    <img src={userData?.photoURL || user.photoURL} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate">{userData?.displayName || user.displayName}</p>
                                    <p className="text-xs text-gray-400 truncate">{userData?.statusMessage || "Set a status"}</p>
                                </div>
                            </div>

                            {/* Status Options */}
                            <div className="p-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-1">Set Status</p>
                                {STATUS_OPTIONS.map(s => (
                                    <button 
                                        key={s.id} 
                                        onClick={() => handleStatusChange(s.id)}
                                        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
                                    >
                                        {s.icon} 
                                        <span className={myStatus === s.id ? "font-bold" : ""}>{s.label}</span>
                                        {myStatus === s.id && <CheckCheck size={14} className="ml-auto text-pink-500" />}
                                    </button>
                                ))}
                            </div>

                            {/* Edit Profile Button */}
                            <div className="p-2 border-t border-gray-100 dark:border-gray-800">
                                <button onClick={() => { setShowProfileModal(true); setShowStatusMenu(false); }} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm text-pink-500 font-bold">
                                    <Edit2 size={14} /> Edit Profile
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

              </div>

              {/* MESSENGER CONTENT (Recycled) */}
              <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-black/20">
                {/* ... (Existing List Logic) ... */}
                {!activeChat && !showNewChat && <div className="p-2 space-y-1">{recentChats.map(chat => <div key={chat.id} onClick={() => setActiveChat(chat.otherUser)} className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors"><div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-white dark:border-white/10 shadow-sm"><img src={chat.otherUser.avatar} className="w-full h-full object-cover" /></div><div className="flex-1 min-w-0"><h4 className="font-bold text-gray-800 dark:text-white text-sm">{chat.otherUser.name}</h4><p className="text-xs text-gray-500 truncate dark:text-gray-400">{chat.lastMessage}</p></div></div>)}</div>}
                
                {/* ... (Existing Friends Logic) ... */}
                {!activeChat && showNewChat && <div className="p-2 space-y-1">{friends.map(friend => <div key={friend.uid} onClick={() => startNewChat(friend)} className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors"><div className="w-10 h-10 rounded-full bg-pink-100 overflow-hidden border border-white dark:border-white/10">{friend.photoURL ? <img src={friend.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">😊</div>}</div><h4 className="font-bold text-gray-800 dark:text-white text-sm">{friend.name || friend.displayName}</h4></div>)}</div>}
                
                {/* ... (Existing Chat Messages Logic) ... */}
                {activeChat && (
                  <div className="p-3 space-y-3 min-h-full flex flex-col justify-end pb-2">
                    {messages.map((msg, i) => {
                      const isMe = msg.senderId === user.uid;
                      const isCall = msg.type === 'call';
                      const isAudio = msg.type === 'audio';
                      const isImage = msg.type === 'image';
                      const isEditingThis = editingMsgId === msg.id;

                      return (
                        <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative`}>
                          {isEditingThis ? (
                            <div className="flex items-center gap-2 w-full max-w-[85%]"><input value={editText} onChange={(e) => setEditText(e.target.value)} className="flex-1 bg-white border border-pink-300 rounded-full px-3 py-1 text-sm outline-none" autoFocus /><button onClick={saveEdit} className="p-1 bg-green-500 text-white rounded-full"><CheckCheck size={14} /></button></div>
                          ) : (
                            <div className="relative max-w-[85%]">
                                {isMe && !isCall && !isAudio && !isImage && (<div className="absolute -top-6 right-0 hidden group-hover:flex gap-1 bg-white dark:bg-gray-800 shadow-md rounded-lg p-1 z-10 border border-gray-100 dark:border-gray-700"><button onClick={() => startEditing(msg)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500"><Edit2 size={12} /></button><button onClick={() => requestDeleteMessage(msg.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-400"><Trash2 size={12} /></button></div>)}
                                
                                {isCall ? (
                                    <div className={`p-3 rounded-2xl text-sm ${isMe ? 'bg-pink-100 border border-pink-200' : 'bg-white border border-gray-100 shadow-sm'}`}><div className="flex items-center gap-2 mb-2"><div className="p-2 bg-pink-500 rounded-full text-white"><Video size={16} /></div><span className="font-bold text-gray-700">Video Call</span></div><button onClick={() => { if (isMe) onStartCall && onStartCall(msg.text); else onJoinCall && onJoinCall(msg.text); }} className="block w-full text-center py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl transition-colors text-xs">{isMe ? "Return to Call" : "Join Call"}</button></div>
                                ) : isAudio ? (
                                    <div className="w-64"><Waveform audioUrl={msg.text} isMe={isMe} /></div>
                                ) : isImage ? (
                                    <div className={`p-1 rounded-2xl ${isMe ? 'bg-pink-500 rounded-tr-none' : 'bg-white dark:bg-white/10 rounded-tl-none'}`}><img src={msg.text} className="rounded-xl w-48 h-auto object-cover" /></div>
                                ) : (
                                    <div className={`px-3 py-2 text-sm ${isMe ? 'bg-pink-500 text-white rounded-2xl rounded-tr-none' : 'bg-white dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-none shadow-sm'}`}>{msg.text}{msg.isEdited && <span className="text-[10px] opacity-60 ml-1 block text-right">(edited)</span>}</div>
                                )}
                                {isMe && <div className="text-[10px] text-right mt-1 opacity-50 flex justify-end">{msg.read ? <CheckCheck size={12} className="text-blue-500" /> : <CheckCheck size={12} />}</div>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={scrollRef}></div>
                  </div>
                )}
              </div>

              {/* INPUT AREA (Recycled) */}
              {activeChat && (
                <div className="p-2 bg-white dark:bg-midnight-card border-t border-gray-100 dark:border-white/5 shrink-0">
                  <AnimatePresence mode="wait">
                    {isRecording ? (
                        <motion.div key="recording-bar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex items-center gap-2 p-1 bg-gray-500 rounded-full h-12 px-2">
                            <button onClick={cancelRecording} className="p-2 bg-white text-gray-500 rounded-full hover:bg-gray-200 transition-colors shadow-sm"><Trash2 size={18} /></button>
                            <div className="flex-1 flex items-center gap-3 px-2 overflow-hidden h-full"><div className="flex-1 h-8 flex items-center"><Waveform isRecording={true} stream={recordingStream} /></div><span className="text-xs font-mono font-bold text-white tabular-nums">{formatTime(recordingTime)}</span></div>
                            <button onClick={stopAndSendAudio} disabled={isUploading} className="p-2 bg-white text-pink-500 rounded-full shadow-sm hover:scale-105 transition-transform disabled:opacity-50">{isUploading ? <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div> : <Send size={18} fill="currentColor" />}</button>
                        </motion.div>
                    ) : (
                        <motion.form key="text-bar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={sendMessage} className="flex gap-2 items-center">
                            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
                            <button type="button" onClick={() => fileInputRef.current.click()} className="p-2.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300 hover:bg-pink-100 hover:text-pink-500 transition-colors"><ImageIcon size={20} /></button>
                            <input value={inputText} onChange={handleInputChange} placeholder="Type a message..." className="flex-1 bg-gray-100 dark:bg-black/20 rounded-full px-4 py-2.5 text-sm outline-none dark:text-white transition-all focus:ring-2 focus:ring-pink-100 dark:focus:ring-white/10" autoFocus />
                            <button type="button" onClick={startRecording} className="p-2.5 rounded-full transition-all bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300 hover:bg-pink-100 hover:text-pink-500"><Mic size={20} /></button>
                            {inputText.trim() && <button type="submit" className="p-2.5 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors shadow-md"><Send size={18} /></button>}
                        </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* MESSENGER TOGGLE (WITH AVATAR & STATUS) */}
        {!isExpanded && (
          <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => setIsExpanded(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-80 bg-white dark:bg-midnight-card text-gray-700 dark:text-white p-3 rounded-t-xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] flex items-center justify-between border border-b-0 border-gray-100 dark:border-white/10 cursor-pointer">
            <div className="flex items-center gap-2">
                <div className="relative">
                    <div className="w-8 h-8 rounded-full border border-gray-200 overflow-hidden"><img src={userData?.photoURL || user.photoURL} className="w-full h-full object-cover" /></div>
                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-midnight-card ${STATUS_OPTIONS.find(s => s.id === myStatus)?.color || 'bg-green-500'}`}></div>
                </div>
                <span className="font-bold text-sm">Messaging</span>
            </div>
            <ChevronDown size={16} className="rotate-180 text-gray-400" />
          </motion.button>
        )}

        {/* --- PROFILE MODAL --- */}
        <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} user={user} userData={userData} />

      </div>
    </div>
  );
}