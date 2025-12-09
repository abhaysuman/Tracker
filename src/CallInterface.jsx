import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, Maximize2, Minimize2, User } from 'lucide-react';
import { doc, onSnapshot, updateDoc, setDoc, deleteDoc, addDoc, collection, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// Standard public STUN servers
const SERVERS = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
  ],
};

export default function CallInterface({ callId, role, user, activeChat, onClose }) {
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(false); // Start with audio only like Discord voice
  const [screenSharing, setScreenSharing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(new RTCPeerConnection(SERVERS));
  const localStream = useRef(null);

  // --- 1. SETUP MEDIA & CONNECTION ---
  useEffect(() => {
    const startCall = async () => {
      // Get User Media (Audio initially)
      localStream.current = await navigator.mediaDevices.getUserMedia({ 
        video: false, 
        audio: true 
      });
      
      // Add Tracks to Peer Connection
      localStream.current.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, localStream.current);
      });

      // Handle Incoming Stream
      peerConnection.current.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE Candidates (Network Discovery)
      peerConnection.current.onicecandidate = async (event) => {
        if (event.candidate) {
          const cRef = collection(db, "calls", callId, role === 'caller' ? "callerCandidates" : "calleeCandidates");
          await addDoc(cRef, event.candidate.toJSON());
        }
      };

      // --- CALLER LOGIC ---
      if (role === 'caller') {
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        
        await setDoc(doc(db, "calls", callId), { 
          offer: { type: offer.type, sdp: offer.sdp },
          participants: [user.uid, activeChat.uid]
        });
      } 
      // --- CALLEE LOGIC ---
      else {
        const callDoc = await getDoc(doc(db, "calls", callId));
        const offer = callDoc.data()?.offer;
        
        if (offer) {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);
          
          await updateDoc(doc(db, "calls", callId), {
            answer: { type: answer.type, sdp: answer.sdp }
          });
        }
      }
    };

    startCall();

    // --- SIGNALING LISTENERS ---
    const unsubCall = onSnapshot(doc(db, "calls", callId), (snapshot) => {
      const data = snapshot.data();
      if (!data) return; // Call ended

      if (role === 'caller' && data.answer && !peerConnection.current.currentRemoteDescription) {
        const answer = new RTCSessionDescription(data.answer);
        peerConnection.current.setRemoteDescription(answer);
      }
    });

    const candidateCollection = role === 'caller' ? "calleeCandidates" : "callerCandidates";
    const unsubCandidates = onSnapshot(collection(db, "calls", callId, candidateCollection), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          peerConnection.current.addIceCandidate(candidate);
        }
      });
    });

    return () => {
      // Cleanup
      unsubCall();
      unsubCandidates();
      if (localStream.current) localStream.current.getTracks().forEach(t => t.stop());
      peerConnection.current.close();
    };
  }, []);

  // --- ACTIONS ---

  const toggleMic = () => {
    const audioTrack = localStream.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
    }
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      // Turn Off
      const videoTrack = localStream.current?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
        localStream.current.removeTrack(videoTrack);
        const sender = peerConnection.current.getSenders().find(s => s.track.kind === 'video');
        if (sender) peerConnection.current.removeTrack(sender);
      }
      setCameraOn(false);
    } else {
      // Turn On
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = stream.getVideoTracks()[0];
      
      localStream.current.addTrack(videoTrack);
      peerConnection.current.addTrack(videoTrack, localStream.current);
      
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream.current;
      setCameraOn(true);
    }
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      // Stop Sharing -> Revert to Camera if it was on
      const videoTrack = localStream.current?.getVideoTracks()[0];
      if (videoTrack) {
          videoTrack.stop();
          // Logic to switch back to camera would go here
      }
      setScreenSharing(false);
      setCameraOn(false); // Simplification: Turn video off after stop share
    } else {
      // Start Sharing
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ cursor: true });
        const screenTrack = stream.getVideoTracks()[0];
        
        // Replace existing video track if any
        const sender = peerConnection.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
            sender.replaceTrack(screenTrack);
        } else {
            peerConnection.current.addTrack(screenTrack, localStream.current);
        }

        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setScreenSharing(true);
        setCameraOn(true); // Technically video is on

        // Handle user clicking "Stop Sharing" on browser UI
        screenTrack.onended = () => {
            setScreenSharing(false);
            setCameraOn(false);
        };
      } catch (e) {
        console.error("Screen share failed", e);
      }
    }
  };

  const endCall = async () => {
    if (role === 'caller') {
        // If I called, delete the room
        await deleteDoc(doc(db, "calls", callId));
    }
    onClose();
  };

  // --- RENDER ---

  if (minimized) {
    return (
      <motion.div 
        drag
        className="fixed bottom-20 right-4 w-64 h-36 bg-[#111214] border border-[#2b2d31] rounded-xl shadow-2xl z-[200] overflow-hidden flex flex-col"
      >
        <div className="flex-1 bg-[#1e1f22] relative">
            {/* If video exists, show it, else show avatar */}
            {remoteStream ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <img src={activeChat?.avatar} className="w-12 h-12 rounded-full opacity-50" />
                </div>
            )}
            <div className="absolute inset-0 bg-black/20 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                <button onClick={() => setMinimized(false)} className="p-2 bg-black/50 rounded-full text-white"><Maximize2 size={20} /></button>
            </div>
        </div>
        <div className="h-8 bg-green-500 flex items-center justify-center text-xs font-bold text-white uppercase tracking-wider">
            Call in Progress
        </div>
      </motion.div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#0e0e10] flex flex-col text-white">
      
      {/* 1. TOP BAR (Transparent) */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center gap-3">
            <h2 className="font-bold text-gray-200">Voice Connected</h2>
            <span className="text-gray-400 text-sm">/ {activeChat?.name}</span>
        </div>
        <button onClick={() => setMinimized(true)} className="p-2 hover:bg-white/10 rounded-lg text-gray-300">
            <Minimize2 size={24} />
        </button>
      </div>

      {/* 2. MAIN STAGE (Video Grid) */}
      <div className="flex-1 flex p-4 gap-4 justify-center items-center overflow-hidden">
        
        {/* REMOTE USER (The Big View) */}
        <div className="flex-1 max-w-4xl h-full max-h-[80vh] bg-[#1e1f22] rounded-2xl overflow-hidden relative flex items-center justify-center border border-[#2b2d31] shadow-xl">
            {remoteStream ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
            ) : (
                <div className="flex flex-col items-center animate-pulse">
                    <div className="w-24 h-24 rounded-full border-4 border-[#2b2d31] bg-[#2b2d31] overflow-hidden mb-4 shadow-lg">
                        <img src={activeChat?.avatar || activeChat?.photoURL} className="w-full h-full object-cover" />
                    </div>
                    <h3 className="text-xl font-bold text-white">{activeChat?.name}</h3>
                    <p className="text-gray-400">Connecting...</p>
                </div>
            )}
            
            {/* My Small Preview (Floating Picture-in-Picture) */}
            <motion.div 
                drag 
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                className="absolute bottom-4 right-4 w-48 h-32 bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10"
            >
                {cameraOn ? (
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover flip-horizontal" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#2b2d31]">
                        <User size={32} className="text-gray-500" />
                    </div>
                )}
            </motion.div>
        </div>

      </div>

      {/* 3. CONTROL DOCK (Discord Style Bottom Bar) */}
      <div className="h-20 bg-[#1e1f22] flex items-center justify-center gap-4 pb-4">
        
        {/* Toggle Audio */}
        <button onClick={toggleMic} className={`p-4 rounded-full transition-all ${micOn ? 'bg-[#2b2d31] hover:bg-[#35373c] text-white' : 'bg-white text-black'}`}>
            {micOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>

        {/* End Call */}
        <button onClick={endCall} className="px-8 py-4 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-lg shadow-red-500/20 transition-all active:scale-95">
            <PhoneOff size={28} />
        </button>

        {/* Toggle Camera */}
        <button onClick={toggleCamera} className={`p-4 rounded-full transition-all ${cameraOn ? 'bg-white text-black' : 'bg-[#2b2d31] hover:bg-[#35373c] text-white'}`}>
            {cameraOn ? <Video size={24} /> : <VideoOff size={24} />}
        </button>

        {/* Screen Share */}
        <button onClick={toggleScreenShare} className={`p-4 rounded-full transition-all ${screenSharing ? 'bg-green-500 text-white' : 'bg-[#2b2d31] hover:bg-[#35373c] text-white'}`}>
            <Monitor size={24} />
        </button>

      </div>
    </div>
  );
}