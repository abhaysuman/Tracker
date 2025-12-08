import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ChevronDown, Minimize2, ChevronLeft, Plus, Video, Send, Mic, Trash2, Edit2, Star, MoreVertical, X, Check } from 'lucide-react';
import { collection, query, where, orderBy, addDoc, onSnapshot, serverTimestamp, doc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, writeBatch, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import Waveform from './Waveform'; 

export default function Messenger({ isOpen, onClose, activeChatFriend, user, userData, friends = [], onStartCall, onJoinCall }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeChat, setActiveChat] = useState(null); 
  const [showNewChat, setShowNewChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [recentChats, setRecentChats] = useState([]);
  
  // EDIT & MENU
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState("");
  const [showChatMenu, setShowChatMenu] = useState(false);

  // RECORDING
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStream, setRecordingStream] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const scrollRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // CONFIG - Using simple upload
  const CLOUD_NAME = "qbqrzy56"; 
  const UPLOAD_PRESET = "gf_mood_app"; 

  useEffect(() => {
    if (activeChatFriend) {
      setIsExpanded(true);
      setActiveChat(activeChatFriend);
      setShowNewChat(false);
    }
  }, [activeChatFriend]);

  // 1. RECENT CHATS
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

  // 2. MESSAGES
  useEffect(() => {
    if (!activeChat || !user) return;
    const chatId = [user.uid, activeChat.uid].sort().join("_");
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubscribe();
  }, [activeChat, user]);

  // --- ACTIONS ---
  const toggleStar = async (e, friendUid) => {
    e.stopPropagation();
    const isStarred = userData?.starredFriends?.includes(friendUid);
    const userRef = doc(db, "users", user.uid);
    if (isStarred) await updateDoc(userRef, { starredFriends: arrayRemove(friendUid) });
    else await updateDoc(userRef, { starredFriends: arrayUnion(friendUid) });
  };

  const deleteMessage = async (msgId) => {
    if(!window.confirm("Delete this message?")) return;
    const chatId = [user.uid, activeChat.uid].sort().join("_");
    await deleteDoc(doc(db, "chats", chatId, "messages", msgId));
  };

  const startEditing = (msg) => { setEditingMsgId(msg.id); setEditText(msg.text); };
  const saveEdit = async () => {
    const chatId = [user.uid, activeChat.uid].sort().join("_");
    await updateDoc(doc(db, "chats", chatId, "messages", editingMsgId), { text: editText, isEdited: true });
    setEditingMsgId(null); setEditText("");
  };

  const clearChat = async () => {
    if(!window.confirm("Clear all messages?")) return;
    const chatId = [user.uid, activeChat.uid].sort().join("_");
    const q = query(collection(db, "chats", chatId, "messages"));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    batch.update(doc(db, "chats", chatId), { lastMessage: "" });
    await batch.commit();
    setShowChatMenu(false);
  };

  // --- SENDING ---
  const sendToFirebase = async (content, type) => {
    const chatId = [user.uid, activeChat.uid].sort().join("_");
    const chatRef = doc(db, "chats", chatId);
    let previewText = content;
    if (type === 'call') previewText = '🎥 Video Call';
    if (type === 'audio') previewText = '🎤 Voice Message';

    await setDoc(chatRef, {
      participants: [user.uid, activeChat.uid],
      users: [
        { uid: user.uid, name: user.displayName, avatar: user.photoURL },
        { uid: activeChat.uid, name: activeChat.name || activeChat.displayName, avatar: activeChat.avatar || activeChat.photoURL }
      ],
      lastMessage: previewText,
      lastUpdated: serverTimestamp()
    }, { merge: true });

    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: content, type: type, senderId: user.uid, createdAt: serverTimestamp()
    });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat) return;
    await sendToFirebase(inputText, 'text');
    setInputText("");
  };

  // --- RECORDING ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorder.start();
      setRecordingStream(stream); setIsRecording(true); setRecordingTime(0);
      timerRef.current = setInterval(() => { setRecordingTime(prev => prev + 1); }, 1000);
    } catch (e) { console.error(e); alert("Mic error. Check permissions."); }
  };

  const stopAndSendAudio = () => {
    if (!mediaRecorderRef.current) return;
    setIsUploading(true); clearInterval(timerRef.current); setRecordingStream(null); 
    mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (mediaRecorderRef.current.stream) mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        
        const formData = new FormData(); 
        formData.append('file', audioBlob); 
        formData.append('upload_preset', UPLOAD_PRESET);
        
        // SIMPLE UPLOAD LOGIC (No resource_type, no API key)
        try {
          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: formData });
          const data = await res.json();
          if (data.secure_url) await sendToFirebase(data.secure_url, 'audio');
          else if (data.error) alert(data.error.message);
        } catch (e) { console.error(e); }
        
        setIsRecording(false); setIsUploading(false);
    };
    mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) { if (mediaRecorderRef.current.stream) mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); mediaRecorderRef.current = null; }
    clearInterval(timerRef.current); setIsRecording(false); setRecordingStream(null);
  };

  const formatTime = (s) => { const m = Math.floor(s / 60); const sc = s % 60; return `${m}:${sc < 10 ? '0' : ''}${sc}`; };
  
  const startVideoCall = async () => {
    if (!activeChat) return;
    const roomId = `call_${user.uid}_${Date.now()}`; 
    if (onStartCall) onStartCall(roomId);
    await sendToFirebase(roomId, 'call');
    try { await addDoc(collection(db, "users", activeChat.uid, "notifications"), { type: 'call_invite', message: 'is calling! 🎥', roomId: roomId, senderUid: user.uid, senderName: user.displayName, timestamp: serverTimestamp(), read: false }); } catch (e) {}
  };

  const startNewChat = (friend) => { setActiveChat(friend); setShowNewChat(false); };

  if (!user) return null;

  return (
    <div className="fixed bottom-0 right-4 z-[100] flex flex-col items-end pointer-events-none">
      <div className="pointer-events-auto">
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ y: 400, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 400, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="w-80 h-96 bg-white dark:bg-midnight-card rounded-t-2xl shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col overflow-hidden">
              
              {/* HEADER */}
              <div className="bg-pink-500 p-3 flex justify-between items-center text-white shadow-md z-10">
                {activeChat ? (
                  <div className="flex items-center gap-2 max-w-[60%]">
                    <button onClick={() => { setActiveChat(null); setShowChatMenu(false); }} className="hover:bg-white/20 p-1 rounded-full"><ChevronLeft size={20} /></button>
                    <div className="w-7 h-7 rounded-full bg-white/20 overflow-hidden border border-white/50 shrink-0"><img src={activeChat.avatar || activeChat.photoURL} className="w-full h-full object-cover" /></div>
                    <span className="font-bold text-sm truncate">{activeChat.name || activeChat.displayName}</span>
                  </div>
                ) : showNewChat ? (
                  <div className="flex items-center gap-2"><button onClick={() => setShowNewChat(false)} className="hover:bg-white/20 p-1 rounded-full"><ChevronLeft size={20} /></button><span className="font-bold text-sm">New Message</span></div>
                ) : (<span className="font-bold text-lg tracking-tight">Messages</span>)}
                
                <div className="flex gap-1 items-center relative">
                  {activeChat ? (
                    <>
                      <button onClick={startVideoCall} className="p-1.5 hover:bg-white/20 rounded-full" title="Video Call"><Video size={20} /></button>
                      <button onClick={() => setShowChatMenu(!showChatMenu)} className="p-1.5 hover:bg-white/20 rounded-full"><MoreVertical size={20} /></button>
                      {showChatMenu && (
                        <div className="absolute top-10 right-0 bg-white dark:bg-gray-800 text-gray-700 dark:text-white rounded-xl shadow-xl py-2 w-40 z-50 text-sm font-medium border border-gray-100 dark:border-gray-700">
                          <button onClick={clearChat} className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 flex items-center gap-2"><Trash2 size={16} /> Clear Chat</button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {!showNewChat && <button onClick={() => setShowNewChat(true)} className="p-1.5 hover:bg-white/20 rounded-full"><Plus size={20} /></button>}
                      <button onClick={() => setIsExpanded(false)} className="p-1.5 hover:bg-white/20 rounded-full"><ChevronDown size={20} /></button>
                    </>
                  )}
                </div>
              </div>

              {/* CONTENT */}
              <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-black/20">
                {!activeChat && !showNewChat && (
                  <div className="p-2 space-y-1">
                    {recentChats.map(chat => {
                      const isStarred = userData?.starredFriends?.includes(chat.otherUser.uid);
                      return (
                        <div key={chat.id} onClick={() => setActiveChat(chat.otherUser)} className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors group relative">
                          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-white dark:border-white/10 shadow-sm"><img src={chat.otherUser.avatar} className="w-full h-full object-cover" /></div>
                          <div className="flex-1 min-w-0"><div className="flex justify-between items-center"><h4 className="font-bold text-gray-800 dark:text-white text-sm">{chat.otherUser.name}</h4>{isStarred && <Star size={12} className="text-yellow-400 fill-yellow-400" />}</div><p className="text-xs text-gray-500 truncate dark:text-gray-400">{chat.lastMessage}</p></div>
                          <button onClick={(e) => toggleStar(e, chat.otherUser.uid)} className={`absolute right-2 top-8 opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-opacity ${isStarred ? 'text-yellow-400' : 'text-gray-300'}`}><Star size={16} fill={isStarred ? "currentColor" : "none"} /></button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {!activeChat && showNewChat && (
                  <div className="p-2 space-y-1">
                    {friends.map(friend => (
                      <div key={friend.uid} onClick={() => startNewChat(friend)} className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors"><div className="w-10 h-10 rounded-full bg-pink-100 overflow-hidden border border-white dark:border-white/10">{friend.photoURL ? <img src={friend.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">😊</div>}</div><h4 className="font-bold text-gray-800 dark:text-white text-sm">{friend.name || friend.displayName}</h4></div>
                    ))}
                  </div>
                )}
                {activeChat && (
                  <div className="p-3 space-y-3 min-h-full flex flex-col justify-end pb-2">
                    {messages.map((msg, i) => {
                      const isMe = msg.senderId === user.uid;
                      const isCall = msg.type === 'call';
                      const isAudio = msg.type === 'audio';
                      const isEditingThis = editingMsgId === msg.id;

                      return (
                        <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative`}>
                          {isEditingThis ? (
                            <div className="flex items-center gap-2 w-full max-w-[85%]"><input value={editText} onChange={(e) => setEditText(e.target.value)} className="flex-1 bg-white border border-pink-300 rounded-full px-3 py-1 text-sm outline-none" autoFocus /><button onClick={saveEdit} className="p-1 bg-green-500 text-white rounded-full"><Check size={14} /></button><button onClick={() => setEditingMsgId(null)} className="p-1 bg-gray-300 text-white rounded-full"><X size={14} /></button></div>
                          ) : (
                            <div className="relative max-w-[85%]">
                                {isMe && !isCall && !isAudio && (<div className="absolute -top-6 right-0 hidden group-hover:flex gap-1 bg-white dark:bg-gray-800 shadow-md rounded-lg p-1 z-10 border border-gray-100 dark:border-gray-700"><button onClick={() => startEditing(msg)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500"><Edit2 size={12} /></button><button onClick={() => deleteMessage(msg.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-400"><Trash2 size={12} /></button></div>)}
                                {isCall ? (
                                    <div className={`p-3 rounded-2xl text-sm ${isMe ? 'bg-pink-100 border border-pink-200' : 'bg-white border border-gray-100 shadow-sm'}`}><div className="flex items-center gap-2 mb-2"><div className="p-2 bg-pink-500 rounded-full text-white"><Video size={16} /></div><span className="font-bold text-gray-700">Video Call</span></div><button onClick={() => { if (isMe) onStartCall && onStartCall(msg.text); else onJoinCall && onJoinCall(msg.text); }} className="block w-full text-center py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl transition-colors text-xs">{isMe ? "Return to Call" : "Join Call"}</button></div>
                                ) : isAudio ? (
                                    <div className="w-64"><Waveform audioUrl={msg.text} isMe={isMe} /></div>
                                ) : (
                                    <div className={`px-3 py-2 text-sm ${isMe ? 'bg-pink-500 text-white rounded-2xl rounded-tr-none' : 'bg-white dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-none shadow-sm'}`}>{msg.text}{msg.isEdited && <span className="text-[10px] opacity-60 ml-1 block text-right">(edited)</span>}</div>
                                )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={scrollRef}></div>
                  </div>
                )}
              </div>

              {/* INPUT */}
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
                            <input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Type a message..." className="flex-1 bg-gray-100 dark:bg-black/20 rounded-full px-4 py-2.5 text-sm outline-none dark:text-white transition-all focus:ring-2 focus:ring-pink-100 dark:focus:ring-white/10" autoFocus />
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
        
        {!isExpanded && (
          <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => setIsExpanded(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-80 bg-white dark:bg-midnight-card text-gray-700 dark:text-white p-3 rounded-t-xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] flex items-center justify-between border border-b-0 border-gray-100 dark:border-white/10 cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="relative"><div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-500"><MessageCircle size={18} fill="currentColor" /></div><span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-midnight-card rounded-full"></span></div>
              <span className="font-bold text-sm">Messaging</span>
            </div>
            <ChevronDown size={16} className="rotate-180 text-gray-400" />
          </motion.button>
        )}
      </div>
    </div>
  );
}