import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { doc, setDoc, onSnapshot, updateDoc, addDoc, collection, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const servers = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
  ],
  iceCandidatePoolSize: 10,
};

export default function VideoCall({ roomId, role, onClose }) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [status, setStatus] = useState("Initializing...");
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pc = useRef(new RTCPeerConnection(servers));
  const localStream = useRef(null);
  const callStarted = useRef(false); // SAFETY LOCK

  useEffect(() => {
    if (callStarted.current) return; // Prevent double-run in Strict Mode
    callStarted.current = true;

    const startCall = async () => {
      setStatus("Starting camera...");
      
      // 1. Setup Local Stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStream.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // Push tracks to PeerConnection
        stream.getTracks().forEach((track) => {
          pc.current.addTrack(track, stream);
        });
      } catch (err) {
        console.error("Camera Error:", err);
        setStatus("Camera failed. Check permissions.");
        return;
      }

      // 2. Setup Remote Stream Listener
      const remoteStream = new MediaStream();
      pc.current.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      };

      // 3. Database References
      const callDoc = doc(db, 'calls', roomId);
      const offerCandidates = collection(callDoc, 'offerCandidates');
      const answerCandidates = collection(callDoc, 'answerCandidates');

      // --- CALLER LOGIC ---
      if (role === 'caller') {
        setStatus("Calling...");
        
        pc.current.onicecandidate = (event) => {
          if (event.candidate) addDoc(offerCandidates, event.candidate.toJSON());
        };

        const offerDescription = await pc.current.createOffer();
        await pc.current.setLocalDescription(offerDescription);

        const offer = { sdp: offerDescription.sdp, type: offerDescription.type };
        await setDoc(callDoc, { offer });

        // Listen for Answer
        onSnapshot(callDoc, (snapshot) => {
          const data = snapshot.data();
          if (!pc.current.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            pc.current.setRemoteDescription(answerDescription);
            setStatus("Connected!");
          }
        });

        // Listen for Candidates
        onSnapshot(answerCandidates, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const candidate = new RTCIceCandidate(change.doc.data());
              pc.current.addIceCandidate(candidate);
            }
          });
        });
      } 
      
      // --- CALLEE LOGIC ---
      else if (role === 'callee') {
        setStatus("Joining...");
        
        pc.current.onicecandidate = (event) => {
          if (event.candidate) addDoc(answerCandidates, event.candidate.toJSON());
        };

        // Wait for Offer to exist
        const callSnap = await getDoc(callDoc);
        const callData = callSnap.data();

        if (!callData?.offer) {
          setStatus("Call not found or ended.");
          return;
        }

        await pc.current.setRemoteDescription(new RTCSessionDescription(callData.offer));

        const answerDescription = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answerDescription);

        const answer = { type: answerDescription.type, sdp: answerDescription.sdp };
        await updateDoc(callDoc, { answer });

        // Listen for Candidates
        onSnapshot(offerCandidates, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const candidate = new RTCIceCandidate(change.doc.data());
              pc.current.addIceCandidate(candidate);
            }
          });
        });
        setStatus("Connected!");
      }
    };

    startCall();

    // CLEANUP ON CLOSE
    return () => {
      // Don't close immediately in Strict Mode dev, but essential for prod
      // For now, we rely on window reload in App.jsx to force clean
    };
  }, [roomId, role]);

  const toggleMic = () => {
    localStream.current.getAudioTracks().forEach(track => track.enabled = !micOn);
    setMicOn(!micOn);
  };

  const toggleCam = () => {
    localStream.current.getVideoTracks().forEach(track => track.enabled = !camOn);
    setCamOn(!camOn);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center">
      
      {/* REMOTE VIDEO (MAIN) */}
      <div className="relative w-full h-full flex items-center justify-center">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <div className="absolute top-6 left-6 text-white bg-black/50 px-4 py-2 rounded-full backdrop-blur-md z-10 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status === 'Connected!' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
          {status}
        </div>
      </div>

      {/* LOCAL VIDEO (PIP) */}
      <div className="absolute top-6 right-6 w-32 h-48 bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-20">
        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
        {!camOn && <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white"><VideoOff size={20}/></div>}
      </div>

      {/* CONTROLS */}
      <div className="absolute bottom-10 flex gap-6 z-30">
        <button onClick={toggleMic} className={`p-4 rounded-full ${micOn ? 'bg-gray-700 text-white' : 'bg-red-500 text-white'} transition-all hover:scale-110 shadow-lg`}>
          {micOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
        
        <button onClick={onClose} className="p-4 rounded-full bg-red-600 text-white shadow-lg shadow-red-500/30 hover:bg-red-700 transition-all hover:scale-110">
          <PhoneOff size={32} />
        </button>

        <button onClick={toggleCam} className={`p-4 rounded-full ${camOn ? 'bg-gray-700 text-white' : 'bg-red-500 text-white'} transition-all hover:scale-110 shadow-lg`}>
          {camOn ? <Video size={24} /> : <VideoOff size={24} />}
        </button>
      </div>
    </div>
  );
}