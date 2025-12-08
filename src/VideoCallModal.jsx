import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function VideoCallModal({ isOpen, onClose, callUrl }) {
  if (!isOpen || !callUrl) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full h-full max-w-5xl max-h-[85vh] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col"
      >
        {/* Header / Close Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-end z-50 pointer-events-none">
          <button 
            onClick={onClose} 
            className="pointer-events-auto p-3 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
            title="End Call"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Video Embed */}
        <iframe 
          src={callUrl} 
          className="w-full h-full border-0" 
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          title="Video Call"
        />
      </motion.div>
    </div>
  );
}