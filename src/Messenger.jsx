import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, ChevronDown, Minimize2, ChevronLeft, Plus, Video } from 'lucide-react';
import { collection, query, where, orderBy, addDoc, onSnapshot, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function Messenger({ isOpen, onClose, activeChatFriend, user, friends = [], onStartCall, onJoinCall }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeChat, setActiveChat] = useState(null); 
  const [showNewChat, setShowNewChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [recentChats, setRecentChats] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (activeChatFriend) {
      setIsExpanded(true);
      setActiveChat(activeChatFriend);
      setShowNewChat(false);
    }
  }, [activeChatFriend]);

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

  useEffect(() => {
    if (!activeChat || !user) return;
    const chatId = [user.uid, activeChat.uid].sort().join("_");
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => doc.data()));
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubscribe();
  }, [activeChat, user]);

  const sendToFirebase = async (content, type) => {
    const chatId = [user.uid, activeChat.uid].sort().join("_");
    const chatRef = doc(db, "chats", chatId);
    await setDoc(chatRef, {
      participants: [user.uid, activeChat.uid],
      users: [
        { uid: user.uid, name: user.displayName, avatar: user.photoURL },
        { uid: activeChat.uid, name: activeChat.name || activeChat.displayName, avatar: activeChat.avatar || activeChat.photoURL }
      ],
      lastMessage: type === 'call' ? '🎥 Video Call started' : content,
      lastUpdated: serverTimestamp()
    }, { merge: true });
    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: content,
      type: type, 
      senderId: user.uid,
      createdAt: serverTimestamp()
    });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat) return;
    await sendToFirebase(inputText, 'text');
    setInputText("");
  };

  // --- SEAMLESS VIDEO CALL ---
  const startVideoCall = async () => {
    if (!activeChat) return;
    const roomId = `call_${user.uid}_${Date.now()}`; 
    
    // 1. Immediately Open Call Window (Fastest UX)
    if (onStartCall) onStartCall(roomId);

    // 2. Send Record to Chat
    await sendToFirebase(roomId, 'call');
    
    // 3. Send Notification to Ring Friend
    try {
      await addDoc(collection(db, "users", activeChat.uid, "notifications"), {
        type: 'call_invite',
        message: 'is calling you for a video chat! 🎥',
        roomId: roomId,
        senderUid: user.uid,
        senderName: user.displayName || "Friend",
        timestamp: serverTimestamp(),
        read: false
      });
    } catch (e) { console.error(e); }
  };

  const startNewChat = (friend) => { setActiveChat(friend); setShowNewChat(false); };

  if (!user) return null;

  return (
    <div className="fixed bottom-0 right-4 z-[100] flex flex-col items-end pointer-events-none">
      <div className="pointer-events-auto">
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ y: 400, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 400, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="w-80 h-96 bg-white dark:bg-midnight-card rounded-t-2xl shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col overflow-hidden">
              <div className="bg-pink-500 p-3 flex justify-between items-center text-white shadow-md z-10">
                {activeChat ? (
                  <div className="flex items-center gap-2 max-w-[60%]">
                    <button onClick={() => setActiveChat(null)} className="hover:bg-white/20 p-1 rounded-full"><ChevronLeft size={20} /></button>
                    <div className="w-7 h-7 rounded-full bg-white/20 overflow-hidden border border-white/50 shrink-0"><img src={activeChat.avatar || activeChat.photoURL} className="w-full h-full object-cover" /></div>
                    <span className="font-bold text-sm truncate">{activeChat.name || activeChat.displayName}</span>
                  </div>
                ) : showNewChat ? (
                  <div className="flex items-center gap-2"><button onClick={() => setShowNewChat(false)} className="hover:bg-white/20 p-1 rounded-full"><ChevronLeft size={20} /></button><span className="font-bold text-sm">New Message</span></div>
                ) : (<span className="font-bold text-lg tracking-tight">Messages</span>)}
                
                <div className="flex gap-1 items-center">
                  {activeChat && <button onClick={startVideoCall} className="p-1.5 hover:bg-white/20 rounded-full" title="Video Call"><Video size={20} /></button>}
                  {!activeChat && !showNewChat && <button onClick={() => setShowNewChat(true)} className="p-1.5 hover:bg-white/20 rounded-full"><Plus size={20} /></button>}
                  <button onClick={() => setIsExpanded(false)} className="p-1.5 hover:bg-white/20 rounded-full"><Minimize2 size={18} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-black/20">
                {!activeChat && !showNewChat && (
                  <div className="p-2 space-y-1">
                    {recentChats.map(chat => (
                      <div key={chat.id} onClick={() => setActiveChat(chat.otherUser)} className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-gray-100 dark:hover:border-white/5">
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-white dark:border-white/10 shadow-sm"><img src={chat.otherUser.avatar} className="w-full h-full object-cover" /></div>
                        <div className="flex-1 min-w-0"><h4 className="font-bold text-gray-800 dark:text-white text-sm">{chat.otherUser.name}</h4><p className="text-xs text-gray-500 truncate dark:text-gray-400">{chat.lastMessage}</p></div>
                      </div>
                    ))}
                  </div>
                )}
                {!activeChat && showNewChat && (
                  <div className="p-2 space-y-1">
                    <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Select a Friend</div>
                    {friends.map(friend => (
                      <div key={friend.uid} onClick={() => startNewChat(friend)} className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors"><div className="w-10 h-10 rounded-full bg-pink-100 overflow-hidden border border-white dark:border-white/10">{friend.photoURL ? <img src={friend.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">😊</div>}</div><h4 className="font-bold text-gray-800 dark:text-white text-sm">{friend.name || friend.displayName}</h4></div>
                    ))}
                  </div>
                )}
                {activeChat && (
                  <div className="p-3 space-y-3 min-h-full flex flex-col justify-end">
                    {messages.map((msg, i) => {
                      const isMe = msg.senderId === user.uid;
                      const isCall = msg.type === 'call';
                      return (
                        <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {isCall ? (
                             <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${isMe ? 'bg-pink-100 border border-pink-200' : 'bg-white border border-gray-100 shadow-sm'}`}>
                               <div className="flex items-center gap-2 mb-2"><div className="p-2 bg-pink-500 rounded-full text-white"><Video size={16} /></div><span className="font-bold text-gray-700">Video Call</span></div>
                               <button onClick={() => { if (isMe) onStartCall && onStartCall(msg.text); else onJoinCall && onJoinCall(msg.text); }} className="block w-full text-center py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl transition-colors text-xs">{isMe ? "Return to Call" : "Join Call"}</button>
                             </div>
                          ) : (
                             <div className={`max-w-[80%] px-3 py-2 text-sm ${isMe ? 'bg-pink-500 text-white rounded-2xl rounded-tr-none' : 'bg-white dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-none shadow-sm'}`}>{msg.text}</div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={scrollRef}></div>
                  </div>
                )}
              </div>

              {activeChat && (
                <form onSubmit={sendMessage} className="p-2 bg-white dark:bg-midnight-card border-t border-gray-100 dark:border-white/5 flex gap-2 shrink-0">
                  <input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Type a message..." className="flex-1 bg-gray-100 dark:bg-black/20 rounded-full px-4 py-2 text-sm outline-none dark:text-white focus:ring-2 focus:ring-pink-100 dark:focus:ring-white/10 transition-all" autoFocus />
                  <button type="submit" disabled={!inputText.trim()} className="p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 disabled:opacity-50 transition-colors shadow-md"><Send size={16} /></button>
                </form>
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