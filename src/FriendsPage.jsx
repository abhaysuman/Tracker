import React, { useState } from 'react';
import { Search, MoreVertical, MessageSquare, Users, UserPlus } from 'lucide-react';

export default function FriendsPage({ currentUser, userData, onNavigate, onViewProfile, openDialog, showToast }) {
  const [activeTab, setActiveTab] = useState('online'); // 'online', 'all', 'add'
  const [searchTerm, setSearchTerm] = useState('');

  const friendsList = userData?.friends || [];

  // Filter Logic
  const filteredFriends = friendsList.filter(friend => {
    // Safety check: ensure displayName exists before lowercasing
    const name = friend.displayName || ""; 
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'online') {
      // For now, we assume 'online' if the presence field is explicitly 'online'
      // In a real app, you'd merge this with the real-time user data from App.jsx
      return matchesSearch && friend.presence === 'online';
    } else if (activeTab === 'all') {
      return matchesSearch;
    }
    return false;
  });

  return (
    <div className="flex-1 flex flex-col bg-[#313338] h-full overflow-hidden font-sans">
      
      {/* 1. TOP HEADER */}
      <div className="h-12 flex items-center px-4 border-b border-[#26272D] shrink-0 bg-[#313338]">
        <div className="flex items-center gap-2 mr-4 text-white">
          <Users size={24} className="text-gray-400" />
          <h2 className="font-bold">Friends</h2>
        </div>
        <div className="h-6 w-[1px] bg-gray-600 mx-2"></div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-4 flex-1 text-gray-400 font-medium text-sm">
          <button 
            onClick={() => setActiveTab('online')} 
            className={`hover:text-gray-200 transition-colors ${activeTab === 'online' ? 'text-white font-bold' : ''}`}
          >
            Online
          </button>
          <button 
            onClick={() => setActiveTab('all')} 
            className={`hover:text-gray-200 transition-colors ${activeTab === 'all' ? 'text-white font-bold' : ''}`}
          >
            All
          </button>
          
          {/* Add Friend Button (Themed) */}
          <button 
            onClick={() => setActiveTab('add')} 
            className={`ml-auto px-3 py-1 rounded text-sm font-bold text-white transition-opacity hover:opacity-80 ${activeTab === 'add' ? 'opacity-100 bg-transparent text-green-500' : 'bg-[var(--theme-primary)]'}`}
          >
            {activeTab === 'add' ? 'Add Friend' : 'Add Friend'}
          </button>
        </div>
      </div>

      {/* 2. CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        
        {/* --- ADD FRIEND VIEW --- */}
        {activeTab === 'add' ? (
          <div className="mt-4 max-w-lg">
            <h3 className="text-white font-bold mb-2 uppercase text-sm">Add Friend</h3>
            <p className="text-gray-400 text-sm mb-4">You can add friends using their unique Friend Code.</p>
            <div className="flex gap-2 bg-[#1e1f22] p-2 rounded-lg border border-[#26272D] focus-within:border-[var(--theme-primary)] transition-colors">
               <input 
                 type="text" 
                 placeholder="Enter Friend Code (e.g., USER-1234)" 
                 className="flex-1 bg-transparent text-white outline-none placeholder-gray-500 px-2" 
               />
               <button className="bg-[var(--theme-primary)] text-white px-6 py-2 rounded-md font-bold text-sm hover:opacity-90 transition-opacity">
                 Send Request
               </button>
            </div>
            
            {/* Empty State / Illustration for Add Friend could go here */}
            <div className="mt-12 flex flex-col items-center justify-center opacity-50">
                <UserPlus size={48} className="text-gray-600 mb-4" />
                <p className="text-gray-500 text-sm">Wumpus is waiting for friends...</p>
            </div>
          </div>
        ) : (
          
          /* --- LIST VIEW (Online / All) --- */
          <>
            {/* Search Bar */}
            <div className="bg-[#1e1f22] rounded-md flex items-center px-3 py-2 mb-6 border border-transparent focus-within:border-[var(--theme-primary)] transition-colors">
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent flex-1 text-gray-200 placeholder-gray-500 outline-none text-sm"
              />
              <Search size={18} className="text-gray-500" />
            </div>

            {/* List Header */}
            <h3 className="text-gray-400 font-bold uppercase text-xs mb-4">
              {activeTab === 'online' ? `Online — ${filteredFriends.length}` : `All Friends — ${filteredFriends.length}`}
            </h3>

            {/* Friends List */}
            <div className="space-y-0.5">
              {filteredFriends.map(friend => (
                <div 
                    key={friend.uid} 
                    className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-lg group cursor-pointer border-t border-[#3f4147] border-opacity-0 hover:border-opacity-50 transition-all"
                    onClick={() => onViewProfile(friend.uid)} // Open Profile on click
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                       <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-600">
                         {friend.photoURL ? (
                            <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover" />
                         ) : (
                            <div className="w-full h-full flex items-center justify-center text-white bg-[var(--theme-primary)]">
                                {friend.displayName?.[0] || "?"}
                            </div>
                         )}
                       </div>
                       
                       {/* Status Dot */}
                       <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#313338] ${friend.presence === 'online' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    </div>
                    
                    <div>
                      <h4 className="text-white font-bold flex items-center gap-1 text-sm">
                        {friend.displayName}
                        {/* Safe Friend Code Display */}
                        <span className="text-gray-400 text-xs hidden group-hover:inline opacity-0 group-hover:opacity-100 transition-opacity">
                            #{ (friend.friendCode || "").split('-')[1] || "0000" }
                        </span>
                      </h4>
                      <p className="text-gray-400 text-xs font-medium">
                        {friend.statusMessage || (friend.presence === 'online' ? 'Online' : 'Offline')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onViewProfile(friend.uid); /* Logic to start chat could go here too */ }} 
                        className="p-2 bg-[#1e1f22] rounded-full text-gray-400 hover:text-white hover:bg-[var(--theme-primary)]/20 transition-colors" 
                        title="Message"
                    >
                        <MessageSquare size={18} fill="currentColor" />
                    </button>
                    <button className="p-2 bg-[#1e1f22] rounded-full text-gray-400 hover:text-white hover:bg-[#111214] transition-colors" title="More">
                        <MoreVertical size={18} />
                    </button>
                  </div>
                </div>
              ))}

              {filteredFriends.length === 0 && (
                  <div className="text-center py-10">
                      <div className="bg-[#1e1f22] inline-block p-4 rounded-full mb-3">
                          <Users size={32} className="text-gray-500 opacity-50" />
                      </div>
                      <p className="text-gray-500 text-sm">No friends found here.</p>
                  </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}