import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff, Settings, MoreHorizontal } from 'lucide-react';
import { doc, onSnapshot, updateDoc, setDoc, deleteDoc, addDoc, collection, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const SERVERS = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
  ],
};

export default function CallInterface({ callId, role, user, activeChat, callType, onClose }) {
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(callType === 'video');
  const [screenSharing, setScreenSharing] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(new RTCPeerConnection(SERVERS));
  const localStream = useRef(null);

  useEffect(() => {
    const startCall = async () => {
      try {
        // 1. Always get Audio first (Critical for voice calls)
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: callType === 'video' 
        });
        
        localStream.current = stream;
        
        // Add tracks to PC
        stream.getTracks().forEach((track) => {
          peerConnection.current.addTrack(track, stream);
        });

        // Set Local Video if needed
        if (localVideoRef.current && (callType === 'video')) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true; // Mute local preview
        }

        // 2. Handle Remote Stream
        peerConnection.current.ontrack = (event) => {
          console.log("Stream received!");
          setRemoteStream(event.streams[0]);
          setConnectionStatus("Connected");
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
        };

        // 3. ICE Candidates
        peerConnection.current.onicecandidate = async (event) => {
          if (event.candidate) {
            const cRef = collection(db, "calls", callId, role === 'caller' ? "callerCandidates" : "calleeCandidates");
            await addDoc(cRef, event.candidate.toJSON());
          }
        };

        // 4. Signaling
        if (role === 'caller') {
          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);
          await setDoc(doc(db, "calls", callId), { 
            offer: { type: offer.type, sdp: offer.sdp },
            participants: [user.uid, activeChat.uid],
            type: callType 
          });
        } else {
          const callDoc = await getDoc(doc(db, "calls", callId));
          const data = callDoc.data();
          if (data?.offer) {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);
            await updateDoc(doc(db, "calls", callId), { answer: { type: answer.type, sdp: answer.sdp } });
          }
        }
      } catch (err) {
        console.error("Media Error:", err);
        setConnectionStatus("Failed to access media");
      }
    };

    startCall();

    // Listeners
    const unsubCall = onSnapshot(doc(db, "calls", callId), (snapshot) => {
      const data = snapshot.data();
      if (!data) { onClose(); return; } 
      if (role === 'caller' && data.answer && !peerConnection.current.currentRemoteDescription) {
        peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    const candidateCollection = role === 'caller' ? "calleeCandidates" : "callerCandidates";
    const unsubCandidates = onSnapshot(collection(db, "calls", callId, candidateCollection), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') peerConnection.current.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      });
    });

    return () => {
      unsubCall();
      unsubCandidates();
      if (localStream.current) localStream.current.getTracks().forEach(t => t.stop());
      peerConnection.current.close();
    };
  }, []);

  // --- CONTROLS ---

  const toggleMic = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      const videoTrack = localStream.current?.getVideoTracks()[0];
      if (videoTrack) { 
        videoTrack.stop();
        localStream.current.removeTrack(videoTrack);
        const sender = peerConnection.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) peerConnection.current.removeTrack(sender);
      }
      setCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = stream.getVideoTracks()[0];
        localStream.current.addTrack(videoTrack);
        peerConnection.current.addTrack(videoTrack, localStream.current);
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream.current;
        setCameraOn(true);
      } catch(e) { console.error(e); }
    }
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
        // Stop Sharing
        const track = localStream.current.getVideoTracks()[0];
        if (track) track.stop();
        setScreenSharing(false);
        setCameraOn(false);
        // Switch back to camera logic could go here
    } else {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = stream.getVideoTracks()[0];
            
            const sender = peerConnection.current.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(screenTrack);
            else peerConnection.current.addTrack(screenTrack, localStream.current);

            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            setScreenSharing(true);
            setCameraOn(true); 

            screenTrack.onended = () => {
                setScreenSharing(false);
                setCameraOn(false);
            };
        } catch (e) { console.error(e); }
    }
  };

  const endCall = async () => {
    if (role === 'caller') await deleteDoc(doc(db, "calls", callId));
    onClose();
  };

  // --- RENDER (SPLIT SCREEN COMPATIBLE) ---
  return (
    <div className="w-full h-full bg-black flex flex-col relative overflow-hidden">
      
      {/* 1. MAIN VIDEO GRID */}
      <div className="flex-1 flex items-center justify-center p-2 gap-2 relative">
        
        {/* REMOTE STREAM (Big) */}
        <div className="flex-1 h-full max-h-full bg-[#1e1f22] rounded-xl flex items-center justify-center relative overflow-hidden">
            {remoteStream && remoteStream.getVideoTracks().length > 0 ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
            ) : (
                <div className="flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-gray-700 border-4 border-[#1e1f22] shadow-lg mb-4 overflow-hidden">
                        <img src={activeChat?.avatar || activeChat?.photoURL} className="w-full h-full object-cover" />
                    </div>
                    <h2 className="text-white font-bold text-xl">{activeChat?.name}</h2>
                    <p className="text-gray-400 text-sm animate-pulse">{connectionStatus}</p>
                </div>
            )}
        </div>

        {/* LOCAL PREVIEW (Floating PIP) */}
        {(cameraOn || screenSharing) && (
            <div className="absolute bottom-20 right-4 w-48 h-32 bg-gray-900 rounded-lg shadow-xl overflow-hidden border border-white/10 z-20">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
        )}
      </div>

      {/* 2. DISCORD STYLE CONTROL BAR */}
      <div className="h-16 bg-[#000000] flex items-center justify-center gap-2 pb-2">
        
        {/* Cam & Mic Group */}
        <div className="flex items-center gap-2 bg-[#1e1f22] p-1.5 rounded-xl">
            <button 
                onClick={toggleCamera} 
                className={`p-3 rounded-lg transition-colors ${cameraOn ? 'bg-white text-black' : 'text-white hover:bg-[#2b2d31]'}`}
                title="Turn On/Off Camera"
            >
                {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
            <button 
                onClick={toggleMic} 
                className={`p-3 rounded-lg transition-colors ${micOn ? 'text-white hover:bg-[#2b2d31]' : 'bg-white text-black'}`}
                title="Mute/Unmute"
            >
                {micOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
        </div>

        {/* Screen Share */}
        <div className="flex items-center gap-2 bg-[#1e1f22] p-1.5 rounded-xl">
            <button 
                onClick={toggleScreenShare} 
                className={`p-3 rounded-lg transition-colors ${screenSharing ? 'bg-[#23a559] text-white' : 'text-white hover:bg-[#2b2d31]'}`}
                title="Share Screen"
            >
                {screenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
            </button>
        </div>

        {/* End Call */}
        <button 
            onClick={endCall} 
            className="p-3 bg-[#da373c] hover:bg-[#a1282c] rounded-xl text-white transition-colors px-6"
            title="Disconnect"
        >
            <PhoneOff size={24} />
        </button>

      </div>
    </div>
  );
}