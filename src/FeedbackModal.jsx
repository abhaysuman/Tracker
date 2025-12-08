import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function FeedbackModal({ isOpen, onClose, user }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, "feedback"), {
        uid: user.uid,
        name: user.displayName || "Anonymous",
        message: text,
        timestamp: new Date()
      });
      alert("Feedback sent! Thank you ❤️");
      setText("");
      onClose();
    } catch (error) {
      console.error("Error sending feedback:", error);
      alert("Failed to send.");
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-midnight-card w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative z-10"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white">
          <X size={24} />
        </button>
        
        <h3 className="text-xl font-bold text-gray-700 dark:text-white mb-2">Send Feedback</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Found a bug? Or have a feature idea?</p>
        
        <textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-32 p-4 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none mb-4"
          placeholder="Tell me everything..."
        />

        <button 
          onClick={handleSubmit} 
          disabled={sending}
          className="w-full py-3 rounded-xl bg-pink-400 hover:bg-pink-500 text-white font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {sending ? "Sending..." : <><Send size={18} /> Send</>}
        </button>
      </motion.div>
    </div>
  );
}