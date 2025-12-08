import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause } from 'lucide-react';

const formWave = (url, isMe) => {
  return WaveSurfer.create({
    container: '#waveform',
    waveColor: isMe ? '#FECACA' : '#CBD5E1', // light pink / light gray
    progressColor: isMe ? '#F472B6' : '#94A3B8', // pink / gray
    cursorColor: 'transparent',
    barWidth: 2,
    barRadius: 2,
    cursorWidth: 0,
    height: 30,
    barGap: 2,
    normalize: true,
    partialRender: true,
    url: url
  });
};

const liveWave = (stream) => {
    const wavesurfer = WaveSurfer.create({
        container: '#recording-waveform',
        waveColor: '#F472B6',
        progressColor: '#F472B6',
        cursorColor: 'transparent',
        barWidth: 2,
        barRadius: 2,
        cursorWidth: 0,
        height: 30,
        barGap: 2,
        normalize: true,
        interact: false,
    });
    
    const microphone = wavesurfer.registerPlugin(
        WaveSurfer.Microphone.create({
            waveformColor: '#F472B6',
        })
    );

    microphone.start(stream);
    return wavesurfer;
}


export default function Waveform({ audioUrl, stream, isMe, isRecording }) {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState('0:00');
  const [currentTime, setCurrentTime] = useState('0:00');

  useEffect(() => {
    if (!waveformRef.current) return;

    // --- LIVE RECORDING WAVEFORM ---
    if (isRecording && stream) {
        wavesurfer.current = liveWave(stream);
    } 
    // --- PLAYBACK WAVEFORM ---
    else if (audioUrl) {
        wavesurfer.current = formWave(audioUrl, isMe);

        wavesurfer.current.on('ready', () => {
            const d = wavesurfer.current.getDuration();
            setDuration(formatTime(d));
        });

        wavesurfer.current.on('audioprocess', () => {
            const c = wavesurfer.current.getCurrentTime();
            setCurrentTime(formatTime(c));
        });

        wavesurfer.current.on('finish', () => setPlaying(false));
    }

    return () => {
      if (wavesurfer.current) wavesurfer.current.destroy();
    };
  }, [audioUrl, stream, isMe, isRecording]);

  const handlePlayPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
      setPlaying(!playing);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (isRecording) {
      return <div id="recording-waveform" ref={waveformRef} className="w-full" />;
  }

  return (
    <div className={`flex items-center gap-3 p-2 rounded-2xl ${isMe ? 'bg-pink-500 text-white rounded-tr-none' : 'bg-white dark:bg-white/10 dark:text-white rounded-tl-none shadow-sm'}`}>
      <button onClick={handlePlayPause} className={`p-2 rounded-full ${isMe ? 'bg-pink-400 hover:bg-pink-300' : 'bg-gray-100 hover:bg-gray-200 dark:bg-white/20 dark:hover:bg-white/30'} transition-colors`}>
        {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>
      <div id="waveform" ref={waveformRef} className="flex-1" />
      <span className="text-xs font-medium tabular-nums opacity-80">{playing ? currentTime : duration}</span>
    </div>
  );
}