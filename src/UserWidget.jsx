import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Mic, MicOff, Headphones, MonitorOff, User, Moon, MinusCircle, Circle, LogOut, Copy, Edit2, Check } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const STATUS_OPTIONS = [
  { id: 'online', label: 'Online', color: 'bg-green-500', icon: <div className="w-3 h-3 rounded-full bg-green-500" /> },
  { id: 'idle', label: 'Idle', color: 'bg-yellow-500', icon: <Moon size={14} className="text-yellow-500 fill-yellow-500" /> },
  { id: 'dnd', label: 'Do Not Disturb', color: 'bg-red-500', icon: <MinusCircle size={14} className="text-red-500 fill-red-500" /> },
  { id: 'invisible', label: 'Invisible', color: 'bg-gray-400', icon: <Circle size={14} className="text-gray-400 border-[3px] border-gray-400 rounded-full" /> },
];

export default function UserWidget({ user, userData, onOpenSettings, onOpenProfile, onLogout }) {
  const [showMenu, setShowMenu] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [deafenOn, setDeafenOn] = useState(true);
  
  const currentStatus = STATUS_OPTIONS.find(s => s.id === (userData?.presence || 'online')) || STATUS_OPTIONS[0];

  const handleStatusChange = async (statusId) => {
    setShowMenu(false);
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { presence: statusId });
    } catch (e) { console.error(e); }
  };

  const copyUserId = () => {
    navigator.clipboard.writeText(user.uid);
    alert("User ID copied to clipboard!");
    setShowMenu(false);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 font-sans">
      
      {/* --- POPUP MENU (Discord Style) --- */}
      <AnimatePresence>
        {showMenu && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-16 left-0 w-64 bg-[#111214] dark:bg-black border border-[#1e1f22] dark:border-white/10 rounded-xl shadow-2xl overflow-hidden text-gray-200"
          >
            {/* Banner Area */}
            <div className="h-16 w-full relative" style={{ backgroundColor: userData?.bannerColor || '#F472B6' }}>
               <div className="absolute -bottom-6 left-4 border-[6px] border-[#111214] rounded-full">
                  <div className="w-16 h-16 rounded-full bg-gray-700 overflow-hidden">
                    <img src={userData?.photoURL || user.photoURL} className="w-full h-full object-cover" />
                  </div>
                  <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-4 border-[#111214] ${currentStatus.color}`}></div>
               </div>
            </div>

            {/* User Info */}
            <div className="pt-8 px-4 pb-3 bg-[#111214]">
                <h3 className="font-bold text-white text-lg">{userData?.displayName || user.displayName}</h3>
                <p className="text-xs text-gray-400 font-mono">@{user.email?.split('@')[0]}</p>
                {userData?.statusMessage && (
                    <div className="mt-3 text-sm text-gray-300 flex items-center gap-2">
                        {userData?.statusMessage}
                    </div>
                )}
            </div>

            <div className="p-2 bg-[#1e1f22] space-y-1">
                <button onClick={() => { onOpenProfile(); setShowMenu(false); }} className="w-full flex items-center gap-3 px-2 py-2 rounded text-sm hover:bg-[#404249] transition-colors text-gray-300">
                    <Edit2 size={16} /> Edit Profile
                </button>
                <div className="h-[1px] bg-white/10 my-1 mx-2"></div>
                
                {/* Status List */}
                {STATUS_OPTIONS.map(s => (
                    <button key={s.id} onClick={() => handleStatusChange(s.id)} className="w-full flex items-center justify-between px-2 py-2 rounded text-sm hover:bg-[#404249] transition-colors group">
                        <div className="flex items-center gap-3">
                            {s.icon} <span className={s.id === currentStatus.id ? "text-white font-medium" : "text-gray-400 group-hover:text-gray-200"}>{s.label}</span>
                        </div>
                        {s.id === currentStatus.id && <Check size={14} className="text-white" />}
                    </button>
                ))}

                <div className="h-[1px] bg-white/10 my-1 mx-2"></div>
                
                <button onClick={copyUserId} className="w-full flex items-center gap-3 px-2 py-2 rounded text-sm hover:bg-[#404249] transition-colors text-gray-300">
                    <Copy size={16} /> Copy User ID
                </button>
                <button onClick={onLogout} className="w-full flex items-center gap-3 px-2 py-2 rounded text-sm hover:bg-red-900/50 text-red-400 transition-colors">
                    <LogOut size={16} /> Log Out
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- THE WIDGET BAR --- */}
      <div 
        className="flex items-center gap-2 bg-[#232428]/95 dark:bg-[#232428] backdrop-blur-md p-2 rounded-lg shadow-lg border border-white/5 w-64 cursor-pointer transition-colors hover:bg-[#2b2d31]"
        onClick={() => setShowMenu(!showMenu)}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-600">
                <img src={userData?.photoURL || user.photoURL} className="w-full h-full object-cover" />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#232428] ${currentStatus.color}`}></div>
        </div>

        {/* Name & Status */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
            <span className="text-sm font-bold text-white truncate leading-tight">
                {userData?.displayName || user.displayName}
            </span>
            <span className="text-[10px] text-gray-400 truncate leading-tight">
                {currentStatus.label}
            </span>
        </div>

        {/* Action Buttons (Stop Propagation to prevent menu opening) */}
        <div className="flex items-center">
            <button 
                onClick={(e) => { e.stopPropagation(); setMicOn(!micOn); }} 
                className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200 relative group"
            >
                {micOn ? <Mic size={18} /> : <MicOff size={18} className="text-red-500" />}
                {/* Tooltip could go here */}
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); setDeafenOn(!deafenOn); }} 
                className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200"
            >
                {deafenOn ? <Headphones size={18} /> : <MonitorOff size={18} className="text-red-500" />}
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); onOpenSettings(); }} 
                className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200"
            >
                <Settings size={18} />
            </button>
        </div>
      </div>
    </div>
  );
}