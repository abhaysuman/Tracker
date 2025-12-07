import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, History, Calendar, BarChart2, Gift } from 'lucide-react';

export default function HomePage({ onNavigate, onSaveMood }) {
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [note, setNote] = useState('');

  const moods = [
    { emoji: '😍', label: 'Amazing', color: 'bg-red-100' },
    { emoji: '😊', label: 'Happy', color: 'bg-yellow-100' },
    { emoji: '😐', label: 'Neutral', color: 'bg-gray-100' },
    { emoji: '😔', label: 'Sad', color: 'bg-blue-100' },
    { emoji: '😡', label: 'Angry', color: 'bg-red-200' },
    { emoji: '😴', label: 'Tired', color: 'bg-purple-100' },
  ];

  const tags = ['Work', 'Friends', 'Family', 'Hungry', 'Health', 'IDK'];

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSave = () => {
    if (selectedMood) {
      const moodObj = moods.find(m => m.label === selectedMood);
      onSaveMood({ 
        emoji: moodObj.emoji, 
        label: moodObj.label, 
        tags: selectedTags, 
        note: note 
      });
      setSelectedMood(null);
      setNote('');
      setSelectedTags([]);
    }
  };

  return (
    <div className="min-h-screen bg-[#EBD4F4] dark:bg-midnight-bg pb-24 font-sans selection:bg-pink-200 transition-colors duration-300">
      
      {/* Header */}
      <div className="pt-16 pb-8 text-center">
        <h1 className="text-2xl font-medium text-gray-800 dark:text-white tracking-wide font-mono transition-colors">
          How are you feeling today?
        </h1>
      </div>

      <div className="px-6 max-w-md mx-auto space-y-6">
        
        {/* --- MOOD SELECTOR CARD --- */}
        <div className="bg-white dark:bg-midnight-card rounded-[2rem] p-6 shadow-sm transition-colors duration-300">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">Select your mood!</p>
          
          <div className="grid grid-cols-3 gap-y-8 gap-x-4">
            {moods.map((m) => (
              <motion.button
                key={m.label}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedMood(m.label)}
                className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all ${
                  selectedMood === m.label 
                    ? 'bg-pink-100 ring-2 ring-pink-300 dark:bg-pink-900/50 dark:ring-pink-500' 
                    : 'hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <span className="text-4xl filter drop-shadow-sm">{m.emoji}</span>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{m.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* --- EXPANDABLE SECTION (Note & Tags) --- */}
        <AnimatePresence>
          {selectedMood && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: 20 }}
              className="space-y-6 overflow-hidden"
            >
              {/* NOTE INPUT */}
              <div className="bg-white dark:bg-midnight-card rounded-[2rem] p-6 shadow-sm transition-colors duration-300">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 font-medium ml-1">Wanna Share why?</p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Write what happened..."
                  className="w-full h-24 rounded-xl border border-pink-200 dark:border-pink-900/30 dark:bg-black/20 dark:text-white p-4 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-200 resize-none placeholder-gray-300"
                ></textarea>
              </div>

              {/* TAGS */}
              <div className="bg-white dark:bg-midnight-card rounded-[2rem] p-6 shadow-sm transition-colors duration-300">
                <p className="text-center text-sm text-gray-600 dark:text-gray-300 mb-4 font-medium">What's influencing your mood?</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        selectedTags.includes(tag) 
                          ? 'bg-pink-200 border-pink-300 text-pink-800 dark:bg-pink-600 dark:border-pink-400 dark:text-white' 
                          : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 dark:bg-black/20 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* SAVE BUTTON */}
              <motion.button
                onClick={handleSave}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-full bg-[#FF8080] text-white font-bold shadow-lg shadow-red-200 dark:shadow-none"
              >
                Save mood
              </motion.button>
              
              <div className="h-4"></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- BOTTOM NAVIGATION --- */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-sm bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md rounded-full shadow-lg border border-white/50 dark:border-white/10 px-6 py-4 flex justify-between items-center z-50 transition-colors duration-300">
        <NavIcon icon={<Home size={20} />} active onClick={() => onNavigate('home')} />
        <NavIcon icon={<History size={20} />} onClick={() => onNavigate('history')} />
        <NavIcon icon={<Calendar size={20} />} onClick={() => onNavigate('calendar')} />
        <NavIcon icon={<BarChart2 size={20} />} onClick={() => onNavigate('insights')} />
        <NavIcon icon={<Gift size={20} />} onClick={() => onNavigate('surprise')} />
      </div>

    </div>
  );
}

function NavIcon({ icon, active, onClick }) {
  return (
    <button onClick={onClick} className={`p-2 rounded-full transition-colors ${active ? 'text-gray-800 bg-pink-100 dark:bg-pink-900/50 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}>
      {icon}
    </button>
  );
}