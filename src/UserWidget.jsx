import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Mic, MicOff, Headphones, MonitorOff, Moon, MinusCircle, Circle, LogOut, Copy, Edit2, Check } from 'lucide-react';
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
    alert("User ID copied!");
    setShowMenu(false);
  };

  return (
    <div className="relative bg-[#232428] dark:bg-[#232428] p-2 flex items-center gap-2 border-t border-[#1e1f22] w-full shrink-0 select-none">
      
      {/* --- POPUP MENU (Discord Style) --- */}
      <AnimatePresence>
        {showMenu && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }} 
            animate={{ opacity: 1, y: -10, scale: 1 }} 
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-0 w-64 bg-[#111214] border border-[#1e1f22] rounded-xl shadow-2xl overflow-hidden text-gray-200 z-[100] mb-2"
          >
            {/* Banner */}
            <div className="h-16 w-full relative" style={{ backgroundColor: userData?.bannerColor || '#F472B6' }}>
               <div className="absolute -bottom-6 left-4">
                  <div className="w-16 h-16 rounded-full bg-gray-700 border-[6px] border-[#111214] overflow-hidden relative">
                    <img src={userData?.photoURL || user.photoURL} className="w-full h-full object-cover" />
                  </div>
                  <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-[#111214] ${currentStatus.color}`}></div>
               </div>
            </div>

            {/* Info */}
            <div className="pt-8 px-4 pb-3 bg-[#111214]">
                <h3 className="font-bold text-white text-lg">{userData?.displayName || user.displayName}</h3>
                <p className="text-xs text-gray-400 font-mono">@{user.email?.split('@')[0]}</p>
                {userData?.statusMessage && (
                    <div className="mt-2 text-xs text-gray-300 bg-[#1e1f22] p-1.5 rounded flex items-center gap-2">
                        {userData?.statusMessage}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="p-2 bg-[#1e1f22] space-y-1">
                <button onClick={() => { onOpenProfile(); setShowMenu(false); }} className="w-full flex items-center gap-3 px-2 py-2 rounded text-xs hover:bg-[#404249] transition-colors text-gray-300 font-bold">
                    <Edit2 size={14} /> Edit Profile
                </button>
                <div className="h-[1px] bg-white/10 my-1 mx-2"></div>
                {STATUS_OPTIONS.map(s => (
                    <button key={s.id} onClick={() => handleStatusChange(s.id)} className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-[#404249] transition-colors group">
                        <div className="flex items-center gap-2">
                            {s.icon} <span className={s.id === currentStatus.id ? "text-white font-medium" : "text-gray-400"}>{s.label}</span>
                        </div>
                    </button>
                ))}
                <div className="h-[1px] bg-white/10 my-1 mx-2"></div>
                <button onClick={onLogout} className="w-full flex items-center gap-3 px-2 py-2 rounded text-xs hover:bg-red-900/50 text-red-400 transition-colors">
                    <LogOut size={14} /> Log Out
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- THE BAR --- */}
      <div 
        className="flex items-center gap-2 flex-1 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors group"
        onClick={() => setShowMenu(!showMenu)}
      >
        <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-600">
                <img src={userData?.photoURL || user.photoURL} className="w-full h-full object-cover" />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#232428] ${currentStatus.color}`}></div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
            <span className="text-xs font-bold text-white truncate">{userData?.displayName || user.displayName}</span>
            <span className="text-[9px] text-gray-400 truncate">{currentStatus.label}</span>
        </div>
      </div>

      {/* Mic/Deafen Buttons */}
      <div className="flex items-center">
        <button onClick={() => setMicOn(!micOn)} className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200">
            {micOn ? <Mic size={16} /> : <MicOff size={16} className="text-red-500" />}
        </button>
        <button onClick={() => setDeafenOn(!deafenOn)} className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200">
            {deafenOn ? <Headphones size={16} /> : <MonitorOff size={16} className="text-red-500" />}
        </button>
        <button onClick={onOpenSettings} className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200">
            <Settings size={16} />
        </button>
      </div>
    </div>
  );
}