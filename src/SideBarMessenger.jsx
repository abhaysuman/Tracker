import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ChevronLeft, Plus, Video, Send, Mic, Trash2, MoreVertical, Image as ImageIcon, CheckCheck, Search, X } from 'lucide-react';
import { collection, query, where, orderBy, addDoc, onSnapshot, serverTimestamp, doc, setDoc, updateDoc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import Waveform from './Waveform'; 

export default function SideBarMessenger({ user, userData, friends = [], onStartCall, onJoinCall, openDialog }) {
  // UI STATES
  const [isOpen, setIsOpen] = useState(false); 
  const [activeChat, setActiveChat] = useState(null); 
  const [searchTerm, setSearchTerm] = useState("");
  
  // DATA STATES
  const [recentChats, setRecentChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  
  // STATUS STATES
  const [isFriendOnline, setIsFriendOnline] = useState(false);
  const [isFriendTyping, setIsFriendTyping] = useState(false);

  // ACTION STATES
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStream, setRecordingStream] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);

  // REFS
  const scrollRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // CONFIG (WITH API KEY FIX)
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
      chats.sort((a, b) => (b.lastUpdated?.toMillis() || 0) - (a.lastUpdated?.toMillis() || 0));
      setRecentChats(chats);
    });
    return () => unsubscribe();
  }, [user]);

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
        if (msg.senderId !== user.uid && !msg.read) {
           await updateDoc(doc(db, "chats", chatId, "messages", docSnap.id), { read: true });
        }
      });
    });

    // Listen for Typing & Online Status
    const unsubscribeChat = onSnapshot(doc(db, "chats", chatId), (docSnap) => {
        const data = docSnap.data();
        setIsFriendTyping(data?.typing && data.typing[activeChat.uid]);
    });

    const unsubscribeUser = onSnapshot(doc(db, "users", activeChat.uid), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const presence = data.presence || 'online';
            const lastActive = data.lastActive?.toMillis ? data.lastActive.toMillis() : 0;
            const isActiveNow = Date.now() - lastActive < 300000; 
            
            if (presence === 'invisible') setIsFriendOnline(false);
            else if (presence === 'online' && isActiveNow) setIsFriendOnline(true);
            else if (presence === 'idle' || presence === 'dnd') setIsFriendOnline(true); 
            else setIsFriendOnline(false);
        }
    });

    return () => { unsubscribeMsgs(); unsubscribeChat(); unsubscribeUser(); };
  }, [activeChat, user]);

  // --- ACTIONS ---

  const handleInputChange = async (e) => {
    setInputText(e.target.value);
    if (!activeChat) return;
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
    formData.append('api_key', API_KEY); // API Key for images
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) await sendToFirebase(data.secure_url, 'image');
    } catch (err) { console.error(err); alert("Image upload failed"); }
    setIsUploading(false);
  };

  const sendToFirebase = async (content, type) => {
    const chatId = [user.uid, activeChat.uid].sort().join("_");
    const chatRef = doc(db, "chats", chatId);
    let previewText = content;
    if (type === 'call') previewText = '🎥 Video Call';
    if (type === 'audio') previewText = '🎤 Voice Message';
    if (type === 'image') previewText = '📷 Photo';

    await setDoc(chatRef, {
      participants: [user.uid, activeChat.uid],
      users: [ { uid: user.uid, name: user.displayName, avatar: user.photoURL }, { uid: activeChat.uid, name: activeChat.name || activeChat.displayName, avatar: activeChat.avatar || activeChat.photoURL } ],
      lastMessage: previewText,
      lastUpdated: serverTimestamp(),
      typing: { [user.uid]: false }
    }, { merge: true });

    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: content, type: type, senderId: user.uid, createdAt: serverTimestamp(), read: false
    });
  };

  const sendMessage = async (e) => { e.preventDefault(); if (!inputText.trim() || !activeChat) return; await sendToFirebase(inputText, 'text'); setInputText(""); };

  const startRecording = async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const mediaRecorder = new MediaRecorder(stream); mediaRecorderRef.current = mediaRecorder; audioChunksRef.current = []; mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); }; mediaRecorder.start(); setRecordingStream(stream); setIsRecording(true); setRecordingTime(0); timerRef.current = setInterval(() => { setRecordingTime(prev => prev + 1); }, 1000); } catch (e) { console.error(e); alert("Mic error."); } };
  
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
        formData.append('api_key', API_KEY); // API Key for audio

        try { 
          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: formData }); 
          const data = await res.json(); 
          if (data.secure_url) await sendToFirebase(data.secure_url, 'audio'); 
        } catch (e) { console.error(e); } 
        setIsRecording(false); 
        setIsUploading(false); 
    }; 
    mediaRecorderRef.current.stop(); 
  };

  const cancelRecording = () => { if (mediaRecorderRef.current) { if (mediaRecorderRef.current.stream) mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); mediaRecorderRef.current = null; } clearInterval(timerRef.current); setIsRecording(false); setRecordingStream(null); };
  
  const formatTime = (s) => { const m = Math.floor(s / 60); const sc = s % 60; return `${m}:${sc < 10 ? '0' : ''}${sc}`; };
  
  const startVideoCall = async () => { if (!activeChat) return; const roomId = `call_${user.uid}_${Date.now()}`; if (onStartCall) onStartCall(roomId); await sendToFirebase(roomId, 'call'); try { await addDoc(collection(db, "users", activeChat.uid, "notifications"), { type: 'call_invite', message: 'is calling! 🎥', roomId: roomId, senderUid: user.uid, senderName: user.displayName, timestamp: serverTimestamp(), read: false }); } catch (e) {} };

  const requestClearChat = () => { setShowChatMenu(false); openDialog("Clear Chat", "Delete entire history?", async () => { const chatId = [user.uid, activeChat.uid].sort().join("_"); const q = query(collection(db, "chats", chatId, "messages")); const snapshot = await getDocs(q); const batch = writeBatch(db); snapshot.docs.forEach((doc) => batch.delete(doc.ref)); batch.update(doc(db, "chats", chatId), { lastMessage: "" }); await batch.commit(); }, true, "Clear"); };

  // --- RENDER ---
  return (
    <>
      {/* TRIGGER (Bottom Right Floating Button - Replaced by Sidebar) */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed top-1/2 left-0 transform -translate-y-1/2 bg-white dark:bg-midnight-card p-2 rounded-r-xl shadow-lg border border-l-0 border-gray-200 dark:border-white/10 z-50 hover:w-14 transition-all group overflow-hidden"
        >
          <MessageCircle size={28} className="text-pink-500 group-hover:scale-110 transition-transform" />
          <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-midnight-card"></span>
        </button>
      )}

      {/* SIDEBAR & CHAT WINDOW */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ x: -400 }} animate={{ x: 0 }} exit={{ x: -400 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-[100] flex shadow-2xl h-screen"
          >
            {/* FRIEND LIST PANEL */}
            <div className="w-80 h-full bg-white dark:bg-[#1e1f22] border-r border-gray-200 dark:border-black/20 flex flex-col">
              <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h2 className="font-bold text-xl text-gray-800 dark:text-white">Messages</h2>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-gray-400"><ChevronLeft size={20} /></button>
              </div>
              <div className="p-3">
                <div className="bg-gray-100 dark:bg-[#111214] flex items-center px-3 py-2 rounded-lg text-sm">
                    <Search size={16} className="text-gray-400 mr-2" />
                    <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="bg-transparent outline-none flex-1 dark:text-white" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {recentChats.filter(c => c.otherUser.name.toLowerCase().includes(searchTerm.toLowerCase())).map(chat => (
                    <div key={chat.id} onClick={() => setActiveChat(chat.otherUser)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${activeChat?.uid === chat.otherUser.uid ? 'bg-pink-50 dark:bg-white/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden"><img src={chat.otherUser.avatar} className="w-full h-full object-cover" /></div>
                        <div className="flex-1 min-w-0">
                            <h4 className={`font-bold text-sm ${activeChat?.uid === chat.otherUser.uid ? 'text-pink-600 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>{chat.otherUser.name}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{chat.lastMessage}</p>
                        </div>
                    </div>
                ))}
              </div>
            </div>

            {/* CHAT WINDOW */}
            {activeChat && (
                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 450, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="h-full bg-gray-50 dark:bg-[#313338] flex flex-col border-r border-gray-200 dark:border-black/20 w-[450px] shadow-xl relative">
                    {/* Header */}
                    <div className="h-16 border-b border-gray-200 dark:border-black/20 flex items-center justify-between px-4 bg-white dark:bg-[#313338]">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-300 relative">
                                <img src={activeChat.avatar || activeChat.photoURL} className="w-full h-full object-cover" />
                                {isFriendOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-[#313338] rounded-full"></div>}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white text-sm">{activeChat.name}</h3>
                                <p className="text-[10px] text-gray-500 font-bold">{isFriendTyping ? "Typing..." : isFriendOnline ? "Online" : "Offline"}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 text-gray-500 dark:text-gray-300">
                            <button onClick={startVideoCall} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><Video size={20} /></button>
                            <button onClick={() => setShowChatMenu(!showChatMenu)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full relative">
                                <MoreVertical size={20} />
                                {showChatMenu && <div className="absolute top-10 right-0 bg-white dark:bg-[#111214] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl w-32 py-1 z-50"><button onClick={requestClearChat} className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-white/5 flex items-center gap-2 font-bold"><Trash2 size={12}/> Clear Chat</button></div>}
                            </button>
                            <button onClick={() => setActiveChat(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><X size={20} /></button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-[#313338]">
                        {messages.map((msg, i) => {
                            const isMe = msg.senderId === user.uid;
                            return (
                                <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                    {!isMe && <div className="w-8 h-8 rounded-full overflow-hidden mr-2 mt-1"><img src={activeChat.avatar} className="w-full h-full object-cover" /></div>}
                                    <div className="max-w-[75%]">
                                        {msg.type === 'call' ? (
                                            <div className="bg-gray-100 dark:bg-[#2b2d31] p-3 rounded-lg flex items-center gap-2 border border-pink-500/30">
                                                <div className="p-2 bg-pink-500 rounded-full text-white"><Video size={16} /></div>
                                                <div><p className="text-sm font-bold dark:text-white">Video Call</p><button onClick={() => onJoinCall(msg.text)} className="text-xs text-pink-500 font-bold hover:underline">Join Call</button></div>
                                            </div>
                                        ) : msg.type === 'image' ? (
                                            <img src={msg.text} className="rounded-lg max-w-full border-2 border-transparent hover:border-pink-500 transition-colors" />
                                        ) : msg.type === 'audio' ? (
                                            <div className="w-64"><Waveform audioUrl={msg.text} isMe={isMe} /></div>
                                        ) : (
                                            <div className={`px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-pink-500 text-white rounded-tr-none' : 'bg-gray-100 dark:bg-[#2b2d31] dark:text-gray-100 rounded-tl-none'}`}>{msg.text}</div>
                                        )}
                                        {isMe && <div className="text-[10px] text-right mt-1 opacity-50 flex justify-end">{msg.read ? <CheckCheck size={12} className="text-blue-500" /> : <CheckCheck size={12} />}</div>}
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={scrollRef}></div>
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white dark:bg-[#313338]">
                        <AnimatePresence mode="wait">
                            {isRecording ? (
                                <motion.div key="rec" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} className="flex items-center gap-2 bg-gray-100 dark:bg-[#383a40] p-2 rounded-xl">
                                    <button onClick={cancelRecording} className="p-2 bg-white text-red-500 rounded-full shadow-sm hover:bg-gray-50"><Trash2 size={18} /></button>
                                    <div className="flex-1 h-8 flex items-center justify-center"><Waveform isRecording={true} stream={recordingStream} /></div>
                                    <button onClick={stopAndSendAudio} disabled={isUploading} className="p-2 bg-pink-500 text-white rounded-full shadow-sm hover:scale-105 transition-transform">{isUploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Send size={18} />}</button>
                                </motion.div>
                            ) : (
                                <motion.form key="text" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} onSubmit={sendMessage} className="flex gap-2 items-center bg-gray-100 dark:bg-[#383a40] p-2 rounded-xl">
                                    <button type="button" onClick={() => fileInputRef.current.click()} className="p-2 text-gray-500 hover:text-pink-500"><Plus size={20} /></button>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                                    <input value={inputText} onChange={handleInputChange} placeholder={`Message @${activeChat.name}`} className="flex-1 bg-transparent outline-none text-sm dark:text-white" autoFocus />
                                    <button type="button" onClick={startRecording} className="p-2 text-gray-500 hover:text-pink-500"><Mic size={20} /></button>
                                    {inputText.trim() && <button type="submit" className="p-2 text-pink-500 hover:scale-110 transition-transform"><Send size={20} /></button>}
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}