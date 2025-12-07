import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Home, History, Calendar, BarChart2, Gift } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

export default function InsightsPage({ onNavigate, savedMoods }) {
  
  const stats = useMemo(() => {
    let allEntries = [];
    Object.keys(savedMoods).forEach(date => {
      const daysEntries = savedMoods[date].map(entry => ({ ...entry, date }));
      allEntries = [...allEntries, ...daysEntries];
    });

    if (allEntries.length === 0) return null;

    const totalLogs = allEntries.length;
    const counts = {};
    allEntries.forEach(e => counts[e.label] = (counts[e.label] || 0) + 1);
    const topMood = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    const topMoodEmoji = allEntries.find(e => e.label === topMood)?.emoji;

    const moodScore = { 'Amazing': 5, 'Happy': 4, 'Neutral': 3, 'Sad': 2, 'Tired': 1, 'Angry': 0 };
    const trendData = allEntries.slice(-7).map((e, i) => ({
      day: i + 1, 
      score: moodScore[e.label] || 0,
      label: e.label
    }));

    const distributionData = Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    }));

    const tagCounts = {};
    allEntries.forEach(e => {
      if (e.tags) e.tags.forEach(t => tagCounts[t] = (tagCounts[t] || 0) + 1);
    });
    const influenceData = Object.keys(tagCounts).map(key => ({
      name: key,
      count: tagCounts[key]
    })).sort((a,b) => b.count - a.count).slice(0, 3);

    return { topMood, topMoodEmoji, trendData, distributionData, influenceData, totalLogs };
  }, [savedMoods]);

  const COLORS = ['#FFB7B2', '#FF9A9E', '#A0C4FF', '#B9FBC0', '#FDFFB6', '#FFD6A5'];

  // Tooltip Styles adjusted for Dark Mode by using standard Tailwind classes on container
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percent = ((data.value / stats.totalLogs) * 100).toFixed(0);
      return (
        <div className="bg-white dark:bg-midnight-card p-3 rounded-xl shadow-lg border border-pink-100 dark:border-white/10 text-center">
          <p className="font-bold text-gray-700 dark:text-white">{data.name}</p>
          <p className="text-sm text-pink-500 font-bold">{percent}%</p>
        </div>
      );
    }
    return null;
  };

  const CustomLineTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-midnight-card p-2 rounded-lg shadow-sm border border-pink-100 dark:border-white/10 text-xs text-gray-500 dark:text-gray-200">
          {payload[0].payload.label}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#EBD4F4] dark:bg-midnight-bg pb-24 font-sans selection:bg-pink-200 flex flex-col items-center transition-colors duration-300">
      
      <div className="pt-10 pb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-700 dark:text-white transition-colors">Your Insights ✨</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Understanding your emotional patterns</p>
      </div>

      {!stats ? (
        <div className="mt-20 text-gray-500 dark:text-gray-400 text-center px-8">
          <p>No mood data yet! <br/> Go to Home and save a mood to see your insights.</p>
        </div>
      ) : (
        <div className="w-full max-w-md px-4 space-y-4">
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="bg-pink-100/80 dark:bg-pink-900/30 rounded-3xl p-6 text-center shadow-sm border border-pink-200 dark:border-pink-800/30 transition-colors duration-300"
          >
            <h3 className="text-gray-600 dark:text-gray-300 font-bold mb-2">Most common mood this month 💗</h3>
            <div className="text-6xl my-2">{stats.topMoodEmoji}</div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-bold">{stats.topMood}</span> - You've shown great emotional awareness ✨
            </p>
          </motion.div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            className="bg-white dark:bg-midnight-card rounded-3xl p-6 shadow-sm transition-colors duration-300"
          >
            <div className="flex justify-between items-end mb-4">
               <h3 className="text-gray-600 dark:text-white font-bold">Mood Trend</h3>
               <span className="text-[10px] text-gray-400">Past 7 Entries</span>
            </div>
            
            <div className="h-40 w-full ml-[-10px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.trendData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#aaa'}}
                    tickFormatter={(val) => `D${val}`} 
                  />
                  
                  <YAxis 
                    domain={[0, 5]} 
                    width={30} 
                    axisLine={false} 
                    tickLine={false}
                    ticks={[0, 3, 5]}
                    tickFormatter={(value) => {
                       if(value === 5) return '😍'; 
                       if(value === 3) return '😐'; 
                       if(value === 0) return '😡'; 
                       return '';
                    }}
                    tick={{fontSize: 18}}
                  />
                  
                  <Tooltip cursor={{ stroke: '#FFB7B2', strokeWidth: 2 }} content={<CustomLineTooltip />} />
                  <Line type="monotone" dataKey="score" stroke="#FF9A9E" strokeWidth={3} dot={{ fill: '#FF9A9E', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex justify-between text-[10px] text-gray-400 mt-2 px-2">
                <span>⬆ Higher = Happier</span>
                <span>Time ➡</span>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
              className="bg-white dark:bg-midnight-card rounded-3xl p-4 shadow-sm flex flex-col items-center transition-colors duration-300"
            >
              <h3 className="text-gray-600 dark:text-white font-bold text-xs mb-2">Mood Distribution</h3>
              <div className="h-24 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.distributionData} innerRadius={25} outerRadius={40} paddingAngle={5} dataKey="value">
                      {stats.distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs text-gray-400 mt-2 text-center">
                Tap chart for details
              </div>
            </motion.div>

            <motion.div 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
              className="bg-white dark:bg-midnight-card rounded-3xl p-4 shadow-sm transition-colors duration-300"
            >
              <h3 className="text-gray-600 dark:text-white font-bold text-xs mb-2">Top Influences</h3>
              <div className="h-24 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.influenceData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={50} tick={{fontSize: 10, fill: '#888'}} interval={0} />
                    <Bar dataKey="count" fill="#E0BBE4" radius={[0, 4, 4, 0]} barSize={15} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4 italic">
             You're doing an amazing job tracking your emotions. Every feeling is valid! 💕
          </p>

        </div>
      )}

      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-sm bg-white/80 dark:bg-midnight-card/80 backdrop-blur-md rounded-full shadow-lg border border-white/50 dark:border-white/10 px-6 py-4 flex justify-between items-center z-50 transition-colors duration-300">
        <NavIcon icon={<Home size={20} />} onClick={() => onNavigate('home')} />
        <NavIcon icon={<History size={20} />} onClick={() => onNavigate('history')} />
        <NavIcon icon={<Calendar size={20} />} onClick={() => onNavigate('calendar')} />
        <NavIcon icon={<BarChart2 size={20} />} active onClick={() => onNavigate('insights')} />
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