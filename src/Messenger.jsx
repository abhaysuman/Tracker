import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, ChevronDown, Minimize2 } from 'lucide-react';
import { collection, query, where, orderBy, addDoc, onSnapshot, serverTimestamp, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

export default function Messenger({ isOpen, onClose, activeChatFriend, user }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeChat, setActiveChat] = useState(null); // The friend you are talking to
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [recentChats, setRecentChats] = useState([]);
  const scrollRef = useRef(null);

  // If parent passes a friend to chat with, open it immediately
  useEffect(() => {
    if (activeChatFriend) {
      setIsExpanded(true);
      setActiveChat(activeChatFriend);
    }
  }, [activeChatFriend]);

  // 1. FETCH RECENT CHATS LIST
  useEffect(() => {
    if (!user) return;
    // Query chats where user is a participant
    const q = query(collection(db, "chats"), where("participants", "array-contains", user.uid), orderBy("lastUpdated", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => {
        const data = doc.data();
        // Find the "other" person's info
        const otherUser = data.users.find(u => u.uid !== user.uid);
        return { id: doc.id, ...data, otherUser };
      });
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
      // Scroll to bottom
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

    // Create Chat Doc if not exists
    await setDoc(chatRef, {
      participants: [user.uid, activeChat.uid],
      users: [
        { uid: user.uid, name: user.displayName, avatar: user.photoURL },
        { uid: activeChat.uid, name: activeChat.name || activeChat.displayName, avatar: activeChat.avatar || activeChat.photoURL }
      ],
      lastMessage: inputText,
      lastUpdated: serverTimestamp()
    }, { merge: true });

    // Add Message
    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: inputText,
      senderId: user.uid,
      createdAt: serverTimestamp()
    });

    setInputText("");
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-0 right-4 z-[100] flex flex-col items-end pointer-events-none">
      <div className="pointer-events-auto">
        
        {/* --- MAIN MESSENGER WINDOW --- */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 100, opacity: 0 }}
              className="w-80 h-96 bg-white dark:bg-midnight-card rounded-t-2xl shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col overflow-hidden"
            >
              
              {/* HEADER */}
              <div className="bg-pink-500 p-3 flex justify-between items-center text-white cursor-pointer" onClick={() => !activeChat && setIsExpanded(false)}>
                {activeChat ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setActiveChat(null)}><ChevronLeft size={18} /></button>
                    <div className="w-6 h-6 rounded-full bg-white/20 overflow-hidden">
                       <img src={activeChat.avatar || activeChat.photoURL} className="w-full h-full object-cover" />
                    </div>
                    <span className="font-bold text-sm truncate">{activeChat.name || activeChat.displayName}</span>
                  </div>
                ) : (
                  <span className="font-bold">Messaging</span>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setIsExpanded(false)}><Minimize2 size={16} /></button>
                </div>
              </div>

              {/* CONTENT AREA */}
              <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-black/20">
                
                {/* LIST OF CHATS (If no active chat) */}
                {!activeChat && (
                  <div className="p-2 space-y-1">
                    {recentChats.map(chat => (
                      <div key={chat.id} onClick={() => setActiveChat(chat.otherUser)} className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors">
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                          <img src={chat.otherUser.avatar} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-700 dark:text-white text-sm">{chat.otherUser.name}</h4>
                          <p className="text-xs text-gray-400 truncate">{chat.lastMessage}</p>
                        </div>
                      </div>
                    ))}
                    {recentChats.length === 0 && <p className="text-center text-gray-400 text-xs mt-10">Start a conversation with a friend!</p>}
                  </div>
                )}

                {/* CHAT MESSAGES (If active chat) */}
                {activeChat && (
                  <div className="p-3 space-y-3">
                    {messages.map((msg, i) => {
                      const isMe = msg.senderId === user.uid;
                      return (
                        <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-pink-500 text-white rounded-br-none' : 'bg-white dark:bg-white/10 text-gray-700 dark:text-white rounded-bl-none shadow-sm'}`}>
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
                <form onSubmit={sendMessage} className="p-2 bg-white dark:bg-midnight-card border-t border-gray-100 dark:border-white/5 flex gap-2">
                  <input 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-100 dark:bg-black/20 rounded-full px-3 py-2 text-sm outline-none dark:text-white"
                  />
                  <button type="submit" className="p-2 bg-pink-100 text-pink-500 rounded-full hover:bg-pink-200">
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
            className="bg-white dark:bg-midnight-card text-gray-700 dark:text-white p-3 rounded-t-xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] flex items-center gap-2 border border-b-0 border-gray-100 dark:border-white/10 hover:pb-5 transition-all"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-500">
                 <MessageCircle size={18} />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
            </div>
            <span className="font-bold text-sm pr-2">Messaging</span>
            <ChevronDown size={16} className="rotate-180 text-gray-400" />
          </motion.button>
        )}

      </div>
    </div>
  );
}