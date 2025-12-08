import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js';
import { Play, Pause } from 'lucide-react';

export default function Waveform({ audioUrl, stream, isMe, isRecording }) {
  const containerRef = useRef(null);
  const wavesurfer = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState('0:00');
  const [currentTime, setCurrentTime] = useState('0:00');
  const [isReady, setIsReady] = useState(false); // New state to prevent crash

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  useEffect(() => {
    // 1. Wait for animation to finish before initializing (Prevents Blank Screen)
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 200); 

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady || !containerRef.current) return;

    const initWave = async () => {
      try {
        // Cleanup old instance
        if (wavesurfer.current) {
          wavesurfer.current.destroy();
        }

        // --- A: RECORDING MODE ---
        if (isRecording && stream) {
          wavesurfer.current = WaveSurfer.create({
            container: containerRef.current,
            waveColor: '#ec4899', // Pink-500
            progressColor: '#ec4899',
            cursorColor: 'transparent',
            barWidth: 3,
            barRadius: 3,
            cursorWidth: 0,
            height: 32,
            barGap: 3,
            interact: false,
          });

          const record = wavesurfer.current.registerPlugin(
            RecordPlugin.create({ scrollingWaveform: true, renderRecordedAudio: false })
          );
          
          record.startMic({ stream });
        } 
        
        // --- B: PLAYBACK MODE ---
        else if (audioUrl) {
          wavesurfer.current = WaveSurfer.create({
            container: containerRef.current,
            waveColor: isMe ? '#fbcfe8' : '#cbd5e1', 
            progressColor: isMe ? '#db2777' : '#64748b', 
            cursorColor: 'transparent',
            barWidth: 3,
            barRadius: 3,
            cursorWidth: 0,
            height: 32,
            barGap: 3,
            url: audioUrl,
          });

          wavesurfer.current.on('ready', () => setDuration(formatTime(wavesurfer.current.getDuration())));
          wavesurfer.current.on('audioprocess', () => setCurrentTime(formatTime(wavesurfer.current.getCurrentTime())));
          wavesurfer.current.on('finish', () => setPlaying(false));
        }
      } catch (err) {
        console.warn("Waveform failed to load, falling back.", err);
      }
    };

    initWave();

    return () => {
      if (wavesurfer.current) {
        try { wavesurfer.current.destroy(); } catch(e) {}
      }
    };
  }, [audioUrl, stream, isMe, isRecording, isReady]);

  const handlePlayPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
      setPlaying(!playing);
    }
  };

  // --- RENDER ---

  // If waiting for animation, show placeholder
  if (!isReady) {
    return <div className="h-8 w-32 bg-gray-100 dark:bg-white/10 rounded animate-pulse" />;
  }

  // Recording View
  if (isRecording) {
    return <div ref={containerRef} className="w-full h-full flex items-center" />;
  }

  // Playback View
  return (
    <div className={`flex items-center gap-3 p-2 rounded-2xl w-full min-w-[160px] ${isMe ? 'bg-pink-500 text-white rounded-tr-none' : 'bg-white dark:bg-white/10 dark:text-white rounded-tl-none shadow-sm'}`}>
      <button 
        onClick={handlePlayPause} 
        className={`p-2 rounded-full shrink-0 ${isMe ? 'bg-pink-400 hover:bg-pink-300 text-white' : 'bg-gray-100 hover:bg-gray-200 dark:bg-white/20 dark:hover:bg-white/30 text-gray-600 dark:text-white'} transition-colors`}
      >
        {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>
      
      <div ref={containerRef} className="flex-1 h-8 cursor-pointer" />
      
      <span className="text-[10px] font-medium tabular-nums opacity-80 shrink-0 w-8 text-right">
        {playing ? currentTime : duration}
      </span>
    </div>
  );
}