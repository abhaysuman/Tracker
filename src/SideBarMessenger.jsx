import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, ChevronLeft, Plus, Video, Send, Mic, Trash2, MoreVertical, Image as ImageIcon, CheckCheck, Search, X, Home, Calendar, BarChart2, Gift, CheckSquare } from 'lucide-react';
import { collection, query, where, orderBy, addDoc, onSnapshot, serverTimestamp, doc, setDoc, updateDoc, deleteDoc, writeBatch, getDocs, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import Waveform from './Waveform'; 
import UserWidget from './UserWidget'; 

export default function SideBarMessenger({ user, userData, friends = [], activeChat, setActiveChat, onStartCall, onJoinCall, openDialog, onOpenSettings, onOpenProfile, onLogout, onNavigate, children }) {
  // UI STATES
  const [searchTerm, setSearchTerm] = useState("");
  
  // DATA
  const [recentChats, setRecentChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  
  // STATUS
  const [isFriendOnline, setIsFriendOnline] = useState(false);
  const [isFriendTyping, setIsFriendTyping] = useState(false);

  // ACTIONS
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

  // CONFIG
  const CLOUD_NAME = "qbqrzy56"; 
  const UPLOAD_PRESET = "gf_mood_app"; 
  const API_KEY = "282875156328147"; 

  // --- 1. FETCH RECENT CHATS ---
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

  // --- 2. FETCH MESSAGES & STATUS ---
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
            if (presence === 'invisible') setIsFriendOnline(false);
            else setIsFriendOnline(presence !== 'online' || isActiveNow);
        }
    });
    return () => { unsubscribeMsgs(); unsubscribeChat(); unsubscribeUser(); };
  }, [activeChat, user]);

  // --- HELPERS (Abbreviated for cleaner file) ---
  const handleInputChange = async (e) => { setInputText(e.target.value); if(!activeChat) return; const chatId = [user.uid, activeChat.uid].sort().join("_"); await setDoc(doc(db, "chats", chatId), { typing: { [user.uid]: true } }, { merge: true }); if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = setTimeout(async () => { await setDoc(doc(db, "chats", chatId), { typing: { [user.uid]: false } }, { merge: true }); }, 2000); };
  const handleImageSelect = async (e) => { const file = e.target.files[0]; if (!file) return; setIsUploading(true); const formData = new FormData(); formData.append('file', file); formData.append('upload_preset', UPLOAD_PRESET); formData.append('api_key', API_KEY); try { const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData }); const data = await res.json(); if (data.secure_url) await sendToFirebase(data.secure_url, 'image'); } catch (err) { console.error(err); } setIsUploading(false); };
  const sendToFirebase = async (content, type) => { const chatId = [user.uid, activeChat.uid].sort().join("_"); const chatRef = doc(db, "chats", chatId); let previewText = content; if (type === 'call') previewText = '🎥 Video Call'; if (type === 'audio') previewText = '🎤 Voice Message'; if (type === 'image') previewText = '📷 Photo'; await setDoc(chatRef, { participants: [user.uid, activeChat.uid], users: [ { uid: user.uid, name: user.displayName, avatar: user.photoURL }, { uid: activeChat.uid, name: activeChat.name || activeChat.displayName, avatar: activeChat.avatar || activeChat.photoURL } ], lastMessage: previewText, lastUpdated: serverTimestamp(), typing: { [user.uid]: false } }, { merge: true }); await addDoc(collection(db, "chats", chatId, "messages"), { text: content, type: type, senderId: user.uid, createdAt: serverTimestamp(), read: false }); };
  const sendMessage = async (e) => { e.preventDefault(); if (!inputText.trim() || !activeChat) return; await sendToFirebase(inputText, 'text'); setInputText(""); };
  const startRecording = async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const mediaRecorder = new MediaRecorder(stream); mediaRecorderRef.current = mediaRecorder; audioChunksRef.current = []; mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); }; mediaRecorder.start(); setRecordingStream(stream); setIsRecording(true); setRecordingTime(0); timerRef.current = setInterval(() => { setRecordingTime(prev => prev + 1); }, 1000); } catch (e) { alert("Mic error."); } };
  const stopAndSendAudio = () => { if (!mediaRecorderRef.current) return; setIsUploading(true); clearInterval(timerRef.current); setRecordingStream(null); mediaRecorderRef.current.onstop = async () => { const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); if (mediaRecorderRef.current.stream) mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); const formData = new FormData(); formData.append('file', audioBlob); formData.append('upload_preset', UPLOAD_PRESET); formData.append('api_key', API_KEY); try { const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: formData }); const data = await res.json(); if (data.secure_url) await sendToFirebase(data.secure_url, 'audio'); } catch (e) {} setIsRecording(false); setIsUploading(false); }; mediaRecorderRef.current.stop(); };
  const cancelRecording = () => { if (mediaRecorderRef.current) { if (mediaRecorderRef.current.stream) mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); mediaRecorderRef.current = null; } clearInterval(timerRef.current); setIsRecording(false); setRecordingStream(null); };
  const formatTime = (s) => { const m = Math.floor(s / 60); const sc = s % 60; return `${m}:${sc < 10 ? '0' : ''}${sc}`; };
  const startVideoCall = async () => { if (!activeChat) return; const roomId = `call_${user.uid}_${Date.now()}`; if (onStartCall) onStartCall(roomId); await sendToFirebase(roomId, 'call'); try { await addDoc(collection(db, "users", activeChat.uid, "notifications"), { type: 'call_invite', message: 'is calling! 🎥', roomId: roomId, senderUid: user.uid, senderName: user.displayName, timestamp: serverTimestamp(), read: false }); } catch (e) {} };
  const requestClearChat = () => { setShowChatMenu(false); openDialog("Clear Chat", "Delete entire history?", async () => { const chatId = [user.uid, activeChat.uid].sort().join("_"); const q = query(collection(db, "chats", chatId, "messages")); const snapshot = await getDocs(q); const batch = writeBatch(db); snapshot.docs.forEach((doc) => batch.delete(doc.ref)); batch.update(doc(db, "chats", chatId), { lastMessage: "" }); await batch.commit(); }, true, "Clear"); };

  // --- RENDER (FIXED SIDEBAR LAYOUT) ---
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1e1f22] font-sans">
      
      {/* 1. LEFT RAIL (Navigation) */}
      <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 gap-2 border-r border-[#1e1f22] shrink-0 z-50">
        <NavIcon icon={<Home size={28} />} label="Home" onClick={() => { setActiveChat(null); onNavigate('home'); }} />
        <div className="w-8 h-[2px] bg-[#35363C] rounded-full mx-auto my-1"></div>
        <NavIcon icon={<Calendar size={24} />} label="Calendar" onClick={() => { setActiveChat(null); onNavigate('calendar'); }} />
        <NavIcon icon={<CheckSquare size={24} />} label="Bucket List" onClick={() => { setActiveChat(null); onNavigate('bucketlist'); }} />
        <NavIcon icon={<Gift size={24} />} label="Surprise" onClick={() => { setActiveChat(null); onNavigate('surprise'); }} />
        <NavIcon icon={<BarChart2 size={24} />} label="Insights" onClick={() => { setActiveChat(null); onNavigate('insights'); }} />
      </div>

      {/* 2. SIDEBAR PANEL (DM List + Fixed UserWidget) */}
      <div className="w-64 bg-[#2b2d31] flex flex-col rounded-tl-xl border-r border-[#1f2023] shrink-0 z-40 relative">
        
        {/* Header */}
        <div className="h-12 border-b border-[#1f2023] flex items-center px-4 shadow-sm shrink-0">
            <button className="w-full text-left bg-[#1e1f22] text-[#949BA4] text-xs px-2 py-1.5 rounded flex items-center">
                <Search size={14} className="mr-2" /> Find conversation
            </button>
        </div>

        {/* Chat List (Scrollable Area) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
            <div className="px-2 pt-2 pb-1 text-[10px] font-bold text-[#949BA4] hover:text-[#dbdee1] cursor-default uppercase">Direct Messages</div>
            {recentChats.map(chat => (
                <div 
                    key={chat.id} 
                    onClick={() => setActiveChat(chat.otherUser)}
                    className={`flex items-center gap-3 px-2 py-2 rounded-[4px] cursor-pointer group ${activeChat?.uid === chat.otherUser.uid ? 'bg-[#404249] text-white' : 'text-[#949BA4] hover:bg-[#35373C] hover:text-[#dbdee1]'}`}
                >
                    <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gray-500 overflow-hidden"><img src={chat.otherUser.avatar} className="w-full h-full object-cover" /></div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{chat.otherUser.name}</h4>
                        <p className="text-[11px] opacity-70 truncate h-3">{chat.lastMessage}</p>
                    </div>
                </div>
            ))}
        </div>

        {/* USER WIDGET (Pinned to Bottom, Top Layer) */}
        <div className="mt-auto bg-[#232428]">
            <UserWidget 
                user={user} 
                userData={userData} 
                onOpenSettings={onOpenSettings} 
                onOpenProfile={onOpenProfile} 
                onLogout={onLogout} 
            />
        </div>
      </div>

      {/* 3. MAIN AREA (Dynamic: Chat OR Page) */}
      <div className="flex-1 bg-[#313338] flex flex-col min-w-0 relative h-full">
        
        {/* SCENARIO A: CHAT IS OPEN */}
        {activeChat ? (
            <>
                <div className="h-12 border-b border-[#26272D] flex items-center justify-between px-4 shadow-sm bg-[#313338] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-500"><img src={activeChat.avatar || activeChat.photoURL} className="w-full h-full object-cover" /></div>
                            {isFriendOnline && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#313338]"></div>}
                        </div>
                        <span className="font-bold text-white text-sm">{activeChat.name}</span>
                        {isFriendTyping && <span className="text-[10px] text-[#dbdee1] animate-pulse ml-2 font-bold">is typing...</span>}
                    </div>
                    <div className="flex items-center gap-4 text-[#B5BAC1]">
                        <button onClick={startVideoCall} className="hover:text-white"><Video size={20}/></button>
                        <button onClick={() => setActiveChat(null)} className="hover:text-white"><X size={20}/></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {messages.map((msg, i) => {
                        const isMe = msg.senderId === user.uid;
                        return (
                            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group hover:bg-[#2e3035]/30 -mx-4 px-4 py-1`}>
                                {!isMe && <div className="w-8 h-8 rounded-full overflow-hidden mr-3 mt-1 bg-gray-600"><img src={activeChat.avatar} className="w-full h-full object-cover" /></div>}
                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                    <div className="flex items-baseline gap-2 mb-1">
                                        {!isMe && <span className="text-white font-medium text-sm hover:underline cursor-pointer">{activeChat.name}</span>}
                                        <span className="text-[10px] text-[#949BA4]">{new Date(msg.createdAt?.toMillis()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    {msg.type === 'image' ? <img src={msg.text} className="rounded-lg max-w-sm mb-1" /> : msg.type === 'audio' ? <div className="bg-[#2B2D31] p-2 rounded-md"><Waveform audioUrl={msg.text} isMe={isMe} /></div> : msg.type === 'call' ? <div className="bg-[#2B2D31] p-3 rounded-md border border-pink-500/50 flex items-center gap-2"><Video size={16} className="text-pink-500"/> <span className="text-white text-sm font-bold">Video Call</span></div> : <div className={`text-[#DBDEE1] text-[15px] leading-[1.375rem]`}>{msg.text}</div>}
                                </div>
                            </div>
                        )
                    })}
                    <div ref={scrollRef}></div>
                </div>

                <div className="px-4 pb-6 bg-[#313338] shrink-0">
                    <div className="bg-[#383A40] rounded-lg px-3 py-2 flex items-center gap-3">
                        <button onClick={() => fileInputRef.current.click()} className="text-[#B5BAC1] hover:text-white bg-[#B5BAC1]/20 p-1 rounded-full"><Plus size={16} /></button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                        {isRecording ? (
                            <div className="flex-1 flex items-center gap-3 text-red-400 font-bold animate-pulse"><Mic size={16} /> Recording... {formatTime(recordingTime)}<button onClick={stopAndSendAudio} className="ml-auto text-xs bg-red-500 text-white px-2 py-1 rounded">Send</button><button onClick={cancelRecording} className="text-xs text-gray-400 hover:text-white">Cancel</button></div>
                        ) : (
                            <input value={inputText} onChange={handleInputChange} onKeyDown={(e) => e.key === 'Enter' && sendMessage(e)} placeholder={`Message @${activeChat.name}`} className="bg-transparent flex-1 outline-none text-[#DBDEE1] placeholder-[#949BA4]" autoFocus />
                        )}
                        <div className="flex items-center gap-2 text-[#B5BAC1]"><button onClick={startRecording} className="hover:text-white"><Mic size={20} /></button>{inputText && <button onClick={sendMessage} className="text-pink-500 hover:text-pink-400"><Send size={20} /></button>}</div>
                    </div>
                </div>
            </>
        ) : (
            // SCENARIO B: NO CHAT -> SHOW PAGE CONTENT
            <div className="flex-1 overflow-y-auto bg-[#313338] relative h-full">
                {children}
            </div>
        )}
      </div>
    </div>
  );
}

function NavIcon({ icon, label, onClick }) {
    return (
        <div className="group relative flex items-center justify-center w-[48px] h-[48px] cursor-pointer mb-2" onClick={onClick}>
            <div className="absolute left-0 w-1 h-2 bg-white rounded-r-full opacity-0 group-hover:opacity-100 group-hover:h-5 transition-all duration-200"></div>
            <div className="w-[48px] h-[48px] bg-[#313338] rounded-[24px] group-hover:rounded-[16px] group-hover:bg-[#5865F2] flex items-center justify-center text-[#23A559] group-hover:text-white transition-all duration-200 shadow-md">
                {icon}
            </div>
            <div className="absolute left-16 bg-black text-white text-xs font-bold px-3 py-1.5 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {label}
            </div>
        </div>
    )
}