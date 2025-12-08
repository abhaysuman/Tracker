import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, ChevronDown, Minimize2, ChevronLeft, Plus, Search } from 'lucide-react'; // Added Plus, Search
import { collection, query, where, orderBy, addDoc, onSnapshot, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function Messenger({ isOpen, onClose, activeChatFriend, user, friends = [] }) { // Accepted 'friends' prop
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeChat, setActiveChat] = useState(null); 
  const [showNewChat, setShowNewChat] = useState(false); // <--- State for "New Chat" screen
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [recentChats, setRecentChats] = useState([]);
  const scrollRef = useRef(null);

  // If parent passes a friend to chat with, open it immediately
  useEffect(() => {
    if (activeChatFriend) {
      setIsExpanded(true);
      setActiveChat(activeChatFriend);
      setShowNewChat(false);
    }
  }, [activeChatFriend]);

  // 1. FETCH RECENT CHATS LIST (Fixed: Sorting done in app to avoid Index error)
  useEffect(() => {
    if (!user) return;
    
    // REMOVED 'orderBy' from here to fix the blank screen
    const q = query(collection(db, "chats"), where("participants", "array-contains", user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => {
        const data = doc.data();
        const otherUser = data.users.find(u => u.uid !== user.uid);
        return { id: doc.id, ...data, otherUser };
      });
      
      // Sort them here instead (Newest first)
      chats.sort((a, b) => (b.lastUpdated?.toMillis() || 0) - (a.lastUpdated?.toMillis() || 0));
      
      setRecentChats(chats);
    });
    return () => unsubscribe();
  }, [user]);

  // 2. FETCH MESSAGES FOR ACTIVE CHAT
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

  // 3. SEND MESSAGE
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat) return;

    const chatId = [user.uid, activeChat.uid].sort().join("_");
    const chatRef = doc(db, "chats", chatId);

    await setDoc(chatRef, {
      participants: [user.uid, activeChat.uid],
      users: [
        { uid: user.uid, name: user.displayName, avatar: user.photoURL },
        { uid: activeChat.uid, name: activeChat.name || activeChat.displayName, avatar: activeChat.avatar || activeChat.photoURL }
      ],
      lastMessage: inputText,
      lastUpdated: serverTimestamp()
    }, { merge: true });

    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: inputText,
      senderId: user.uid,
      createdAt: serverTimestamp()
    });

    setInputText("");
  };

  // 4. START NEW CHAT (From + Button)
  const startNewChat = (friend) => {
    setActiveChat(friend);
    setShowNewChat(false);
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-0 right-4 z-[100] flex flex-col items-end pointer-events-none">
      <div className="pointer-events-auto">
        
        {/* --- MAIN MESSENGER WINDOW --- */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ y: 400, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-80 h-96 bg-white dark:bg-midnight-card rounded-t-2xl shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col overflow-hidden"
            >
              
              {/* HEADER */}
              <div className="bg-pink-500 p-3 flex justify-between items-center text-white shadow-md z-10">
                {activeChat ? (
                  // CHAT HEADER
                  <div className="flex items-center gap-2">
                    <button onClick={() => setActiveChat(null)} className="hover:bg-white/20 p-1 rounded-full"><ChevronLeft size={20} /></button>
                    <div className="w-7 h-7 rounded-full bg-white/20 overflow-hidden border border-white/50">
                       <img src={activeChat.avatar || activeChat.photoURL} className="w-full h-full object-cover" />
                    </div>
                    <span className="font-bold text-sm truncate max-w-[120px]">{activeChat.name || activeChat.displayName}</span>
                  </div>
                ) : showNewChat ? (
                  // NEW CHAT HEADER
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowNewChat(false)} className="hover:bg-white/20 p-1 rounded-full"><ChevronLeft size={20} /></button>
                    <span className="font-bold text-sm">New Message</span>
                  </div>
                ) : (
                  // MAIN LIST HEADER
                  <span className="font-bold text-lg tracking-tight">Messages</span>
                )}
                
                <div className="flex gap-1">
                  {!activeChat && !showNewChat && (
                    <button onClick={() => setShowNewChat(true)} className="p-1.5 hover:bg-white/20 rounded-full" title="Start New Chat">
                      <Plus size={20} />
                    </button>
                  )}
                  <button onClick={() => setIsExpanded(false)} className="p-1.5 hover:bg-white/20 rounded-full">
                    <Minimize2 size={18} />
                  </button>
                </div>
              </div>

              {/* CONTENT AREA */}
              <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-black/20">
                
                {/* VIEW 1: RECENT CHATS LIST */}
                {!activeChat && !showNewChat && (
                  <div className="p-2 space-y-1">
                    {recentChats.length === 0 ? (
                      <div className="text-center text-gray-400 mt-10 flex flex-col items-center">
                        <MessageCircle size={32} className="opacity-20 mb-2" />
                        <p className="text-xs">No chats yet.</p>
                        <button onClick={() => setShowNewChat(true)} className="text-pink-500 text-xs font-bold mt-2 hover:underline">Start one?</button>
                      </div>
                    ) : (
                      recentChats.map(chat => (
                        <div key={chat.id} onClick={() => setActiveChat(chat.otherUser)} className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-gray-100 dark:hover:border-white/5">
                          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-white dark:border-white/10 shadow-sm">
                            <img src={chat.otherUser.avatar} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-800 dark:text-white text-sm">{chat.otherUser.name}</h4>
                            <p className="text-xs text-gray-500 truncate dark:text-gray-400">{chat.lastMessage}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* VIEW 2: NEW CHAT (FRIEND LIST) */}
                {!activeChat && showNewChat && (
                  <div className="p-2 space-y-1">
                    <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Select a Friend</div>
                    {friends.length === 0 ? (
                      <p className="text-center text-gray-400 text-xs mt-4">Add friends first!</p>
                    ) : (
                      friends.map(friend => (
                        <div key={friend.uid} onClick={() => startNewChat(friend)} className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-gray-100">
                          <div className="w-10 h-10 rounded-full bg-pink-100 overflow-hidden border border-white dark:border-white/10">
                             {friend.photoURL ? <img src={friend.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">😊</div>}
                          </div>
                          <h4 className="font-bold text-gray-800 dark:text-white text-sm">{friend.name || friend.displayName}</h4>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* VIEW 3: ACTIVE CHAT MESSAGES */}
                {activeChat && (
                  <div className="p-3 space-y-3 min-h-full flex flex-col justify-end">
                    {messages.length === 0 && <p className="text-center text-xs text-gray-400 my-4">Say hi to {activeChat.name} 👋</p>}
                    {messages.map((msg, i) => {
                      const isMe = msg.senderId === user.uid;
                      return (
                        <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] px-3 py-2 text-sm ${isMe ? 'bg-pink-500 text-white rounded-2xl rounded-tr-none' : 'bg-white dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-none shadow-sm'}`}>
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={scrollRef}></div>
                  </div>
                )}
              </div>

              {/* INPUT AREA (Only if active chat) */}
              {activeChat && (
                <form onSubmit={sendMessage} className="p-2 bg-white dark:bg-midnight-card border-t border-gray-100 dark:border-white/5 flex gap-2 shrink-0">
                  <input 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-100 dark:bg-black/20 rounded-full px-4 py-2 text-sm outline-none dark:text-white focus:ring-2 focus:ring-pink-100 dark:focus:ring-white/10 transition-all"
                    autoFocus
                  />
                  <button type="submit" disabled={!inputText.trim()} className="p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md">
                    <Send size={16} />
                  </button>
                </form>
              )}

            </motion.div>
          )}
        </AnimatePresence>
        
        {/* --- FLOATING TOGGLE BUTTON --- */}
        {!isExpanded && (
          <motion.button 
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            onClick={() => setIsExpanded(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white dark:bg-midnight-card text-gray-700 dark:text-white p-3 rounded-t-xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] flex items-center gap-2 border border-b-0 border-gray-100 dark:border-white/10 cursor-pointer"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-500">
                 <MessageCircle size={18} fill="currentColor" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-midnight-card rounded-full"></span>
            </div>
            <span className="font-bold text-sm pr-2">Messaging</span>
            <ChevronDown size={16} className="rotate-180 text-gray-400" />
          </motion.button>
        )}

      </div>
    </div>
  );
}