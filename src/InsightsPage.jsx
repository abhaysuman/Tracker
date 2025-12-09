import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function InsightsPage({ onNavigate, savedMoods }) {
  
  // Calculate Mood Stats
  const calculateStats = () => {
    const counts = {};
    let total = 0;
    Object.values(savedMoods).flat().forEach(entry => {
      counts[entry.label] = (counts[entry.label] || 0) + 1;
      total++;
    });
    
    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key],
      percentage: Math.round((counts[key] / total) * 100)
    }));
  };

  const data = calculateStats();
  const COLORS = ['#F472B6', '#FBBF24', '#9CA3AF', '#60A5FA', '#F87171', '#A78BFA'];

  return (
    <div className="min-h-full pb-10 font-sans p-6 bg-white dark:bg-[#313338] transition-colors duration-300">
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Insights</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Overview of your mood logs</p>
      </div>

      <div className="grid gap-6">
        
        {/* Mood Distribution */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-gray-50 dark:bg-[#2b2d31] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5">
          <h3 className="font-bold text-gray-700 dark:text-white mb-4">Mood Distribution</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {data.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{entry.name} ({entry.percentage}%)</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Weekly Activity */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-gray-50 dark:bg-[#2b2d31] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5">
          <h3 className="font-bold text-gray-700 dark:text-white mb-4">Entries Count</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Bar dataKey="value" fill="#F472B6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </div>
    </div>
  );
}