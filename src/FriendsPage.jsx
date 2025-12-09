import React, { useState } from 'react';
import { Search, MoreVertical, MessageSquare, Users } from 'lucide-react';

export default function FriendsPage({ currentUser, userData, onNavigate, onViewProfile, openDialog, showToast }) {
  const [activeTab, setActiveTab] = useState('online');
  const [searchTerm, setSearchTerm] = useState('');

  const friendsList = userData?.friends || [];

  // Filter logic for friends list
  const filteredFriends = friendsList.filter(friend => {
    const matchesSearch = friend.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === 'online') {
      // In a real scenario, you'd use real-time presence data.
      // For this UI mockup, we'll assume a 'presence' field exists on the friend object,
      // which should be populated by a real-time listener in App.jsx or a similar mechanism.
      // If it's not available, this will just show an empty list for 'online'.
      return matchesSearch && friend.presence === 'online';
    } else if (activeTab === 'all') {
      return matchesSearch;
    }
    return false;
  });

  return (
    <div className="flex-1 flex flex-col bg-[#313338] h-full overflow-hidden font-sans">
      {/* 1. TOP BAR */}
      <div className="h-12 flex items-center px-4 border-b border-[#26272D] shrink-0">
        <div className="flex items-center gap-2 mr-4">
          <Users size={24} className="text-gray-400" />
          <h2 className="font-bold text-white">Friends</h2>
        </div>
        <div className="h-6 w-[1px] bg-gray-600 mx-2"></div>

        {/* Tabs */}
        <div className="flex items-center gap-4 flex-1 text-gray-400 font-medium text-sm">
          <button onClick={() => setActiveTab('online')} className={`hover:text-gray-200 ${activeTab === 'online' ? 'text-white' : ''}`}>Online</button>
          <button onClick={() => setActiveTab('all')} className={`hover:text-gray-200 ${activeTab === 'all' ? 'text-white' : ''}`}>All</button>
          {/* Add Friend Button */}
          <button onClick={() => setActiveTab('add')} className={`ml-auto bg-[var(--theme-primary)] text-white px-3 py-1 rounded text-sm font-bold ${activeTab === 'add' ? 'bg-opacity-80' : ''}`}>
            Add Friend
          </button>
        </div>
      </div>

      {/* 2. MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'add' ? (
          /* ADD FRIEND VIEW */
          <div className="mt-4">
            <h3 className="text-white font-bold mb-2 uppercase text-sm">Add Friend</h3>
            <p className="text-gray-400 text-sm mb-4">You can add friends with their friend code.</p>
            <div className="flex gap-2">
               <input type="text" placeholder="Enter Friend Code (e.g., NAME-1234)" className="flex-1 bg-[#1e1f22] border border-[#26272D] rounded p-2 text-white focus:border-[var(--theme-primary)] outline-none" />
               <button className="bg-[var(--theme-primary)] text-white px-4 rounded font-bold hover:bg-opacity-90">Send Request</button>
            </div>
          </div>
        ) : (
          /* FRIEND LIST VIEW */
          <>
            {/* Search Input */}
            <div className="bg-[#1e1f22] rounded-md flex items-center px-3 py-2 mb-6">
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent flex-1 text-gray-300 placeholder-gray-500 outline-none text-sm"
              />
              <Search size={18} className="text-gray-500" />
            </div>

            {/* List Header */}
            <h3 className="text-gray-400 font-bold uppercase text-xs mb-4">
              {activeTab === 'online' ? `Online — ${filteredFriends.length}` : `All Friends — ${filteredFriends.length}`}
            </h3>

            {/* List Items */}
            <div className="space-y-2">
              {filteredFriends.map(friend => (
                <div key={friend.uid} className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-md group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                       <div className="w-9 h-9 rounded-full overflow-hidden">
                         <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover" />
                       </div>
                       {/* Status Indicator - Assuming 'presence' field exists */}
                       <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#313338] ${friend.presence === 'online' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    </div>
                    <div>
                      <h4 className="text-white font-bold flex items-center gap-1">
                        {friend.displayName}
                        <span className="text-gray-400 text-xs hidden group-hover:inline">#{friend.friendCode?.split('-')[1]}</span>
                      </h4>
                      <p className="text-gray-400 text-xs">{friend.statusMessage || (friend.presence === 'online' ? 'Online' : 'Offline')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <button onClick={() => onViewProfile(friend.uid)} className="p-2 hover:bg-[#1e1f22] rounded-full hover:text-gray-200" title="Message"><MessageSquare size={20} /></button>
                    <button className="p-2 hover:bg-[#1e1f22] rounded-full hover:text-gray-200" title="More"><MoreVertical size={20} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}