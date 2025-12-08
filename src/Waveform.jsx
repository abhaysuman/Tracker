import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js'; // Import RecordPlugin specifically
import { Play, Pause } from 'lucide-react';

export default function Waveform({ audioUrl, stream, isMe, isRecording }) {
  const containerRef = useRef(null);
  const wavesurfer = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState('0:00');
  const [currentTime, setCurrentTime] = useState('0:00');

  // Helper to format time
  const formatTime = (time) => {
    if (!time) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // --- SCENARIO A: LIVE RECORDING ---
    if (isRecording && stream) {
      // 1. Initialize Wavesurfer instance
      wavesurfer.current = WaveSurfer.create({
        container: containerRef.current,
        waveColor: '#F472B6', // Pink
        progressColor: '#F472B6',
        cursorColor: 'transparent',
        barWidth: 3,
        barRadius: 3,
        cursorWidth: 0,
        height: 40,
        barGap: 3,
        interact: false, // Cannot click to seek while recording
      });

      // 2. Initialize Record Plugin
      const record = wavesurfer.current.registerPlugin(
        RecordPlugin.create({
          scrollingWaveform: true,
          renderRecordedAudio: false,
        })
      );

      // 3. Start rendering the stream
      record.startMic({ stream }); // Use the stream passed from parent
    } 
    
    // --- SCENARIO B: PLAYBACK ---
    else if (audioUrl) {
      wavesurfer.current = WaveSurfer.create({
        container: containerRef.current,
        waveColor: isMe ? '#FBCFE8' : '#CBD5E1', // Light pink vs Light gray
        progressColor: isMe ? '#DB2777' : '#64748B', // Dark pink vs Dark gray
        cursorColor: 'transparent',
        barWidth: 3,
        barRadius: 3,
        cursorWidth: 0,
        height: 30,
        barGap: 3,
        url: audioUrl,
      });

      wavesurfer.current.on('ready', () => {
        setDuration(formatTime(wavesurfer.current.getDuration()));
      });

      wavesurfer.current.on('audioprocess', () => {
        setCurrentTime(formatTime(wavesurfer.current.getCurrentTime()));
      });

      wavesurfer.current.on('finish', () => setPlaying(false));
    }

    // Cleanup
    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
        wavesurfer.current = null;
      }
    };
  }, [audioUrl, stream, isMe, isRecording]);

  const handlePlayPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
      setPlaying(!playing);
    }
  };

  // --- RENDER FOR RECORDING ---
  if (isRecording) {
    return <div ref={containerRef} className="w-full h-full flex items-center" />;
  }

  // --- RENDER FOR PLAYBACK ---
  return (
    <div className={`flex items-center gap-3 p-2 rounded-2xl w-full ${isMe ? 'bg-pink-500 text-white rounded-tr-none' : 'bg-white dark:bg-white/10 dark:text-white rounded-tl-none shadow-sm'}`}>
      <button 
        onClick={handlePlayPause} 
        className={`p-2 rounded-full shrink-0 ${isMe ? 'bg-pink-400 hover:bg-pink-300 text-white' : 'bg-gray-100 hover:bg-gray-200 dark:bg-white/20 dark:hover:bg-white/30 text-gray-600 dark:text-white'} transition-colors`}
      >
        {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>
      
      {/* Waveform Container */}
      <div ref={containerRef} className="flex-1 h-8 w-32" />
      
      <span className="text-[10px] font-medium tabular-nums opacity-80 shrink-0 w-8 text-right">
        {playing ? currentTime : duration}
      </span>
    </div>
  );
}