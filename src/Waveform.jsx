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
  const [hasError, setHasError] = useState(false); // Safety flag

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  useEffect(() => {
    if (!containerRef.current || hasError) return;

    const initWave = async () => {
      try {
        // Destroy existing instance
        if (wavesurfer.current) {
          wavesurfer.current.destroy();
        }

        // --- A: RECORDING MODE ---
        if (isRecording && stream) {
          wavesurfer.current = WaveSurfer.create({
            container: containerRef.current,
            waveColor: '#ec4899',
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
          wavesurfer.current.on('error', (e) => {
            console.error("Waveform error:", e);
            setHasError(true); // Fallback if url is bad
          });
        }
      } catch (err) {
        console.error("WaveSurfer crash prevented:", err);
        setHasError(true);
      }
    };

    // Small timeout to ensure DOM is ready
    const timer = setTimeout(initWave, 0);

    return () => {
      clearTimeout(timer);
      if (wavesurfer.current) {
        try { wavesurfer.current.destroy(); } catch(e) {}
      }
    };
  }, [audioUrl, stream, isMe, isRecording]);

  const handlePlayPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
      setPlaying(!playing);
    }
  };

  // --- SAFETY FALLBACK ---
  if (hasError) {
    if (isRecording) return <div className="text-xs text-red-400">Recording...</div>;
    return (
      <audio controls src={audioUrl} className="w-full h-8" />
    );
  }

  // --- NORMAL RENDER ---
  if (isRecording) {
    return <div ref={containerRef} className="w-full h-full flex items-center" />;
  }

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