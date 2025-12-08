import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { doc, setDoc, onSnapshot, updateDoc, addDoc, collection, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// Free Google STUN servers to punch through firewalls
const servers = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
  ],
  iceCandidatePoolSize: 10,
};

export default function VideoCall({ roomId, role, onClose }) {
  const [pc, setPc] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    // STARTUP: Initialize PeerConnection and Media
    const startCall = async () => {
      const peerConnection = new RTCPeerConnection(servers);
      const remote = new MediaStream();
      setPc(peerConnection);
      setRemoteStream(remote);

      // 1. Get Local Camera/Mic
      const local = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      local.getTracks().forEach((track) => peerConnection.addTrack(track, local));
      setLocalStream(local);
      
      if (localVideoRef.current) localVideoRef.current.srcObject = local;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;

      // 2. Handle Remote Stream
      peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => remote.addTrack(track));
      };

      // 3. Database References
      const callDoc = doc(db, 'calls', roomId);
      const offerCandidates = collection(callDoc, 'offerCandidates');
      const answerCandidates = collection(callDoc, 'answerCandidates');

      // 4. CALLER LOGIC
      if (role === 'caller') {
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) addDoc(offerCandidates, event.candidate.toJSON());
        };

        const offerDescription = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offerDescription);

        const offer = { sdp: offerDescription.sdp, type: offerDescription.type };
        await setDoc(callDoc, { offer });

        // Listen for Answer
        onSnapshot(callDoc, (snapshot) => {
          const data = snapshot.data();
          if (!peerConnection.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            peerConnection.setRemoteDescription(answerDescription);
          }
        });

        // Listen for Remote Candidates
        onSnapshot(answerCandidates, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const candidate = new RTCIceCandidate(change.doc.data());
              peerConnection.addIceCandidate(candidate);
            }
          });
        });
      } 
      
      // 5. RECEIVER LOGIC
      else if (role === 'callee') {
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) addDoc(answerCandidates, event.candidate.toJSON());
        };

        const callData = (await getDoc(callDoc)).data();
        const offerDescription = callData.offer;
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offerDescription));

        const answerDescription = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answerDescription);

        const answer = { type: answerDescription.type, sdp: answerDescription.sdp };
        await updateDoc(callDoc, { answer });

        // Listen for Remote Candidates
        onSnapshot(offerCandidates, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const candidate = new RTCIceCandidate(change.doc.data());
              peerConnection.addIceCandidate(candidate);
            }
          });
        });
      }
    };

    startCall();

    // CLEANUP
    return () => {
      if (localStream) localStream.getTracks().forEach(track => track.stop());
      if (pc) pc.close();
    };
  }, []);

  const toggleMic = () => {
    localStream.getAudioTracks().forEach(track => track.enabled = !micOn);
    setMicOn(!micOn);
  };

  const toggleCam = () => {
    localStream.getVideoTracks().forEach(track => track.enabled = !camOn);
    setCamOn(!camOn);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center">
      
      {/* REMOTE VIDEO (MAIN) */}
      <div className="relative w-full h-full flex items-center justify-center">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <div className="absolute top-6 left-6 text-white bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">
          {role === 'caller' ? "Calling..." : "In Call"}
        </div>
      </div>

      {/* LOCAL VIDEO (PIP) */}
      <div className="absolute top-6 right-6 w-32 h-48 bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20">
        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
      </div>

      {/* CONTROLS */}
      <div className="absolute bottom-10 flex gap-6">
        <button onClick={toggleMic} className={`p-4 rounded-full ${micOn ? 'bg-gray-700 text-white' : 'bg-red-500 text-white'} transition-all hover:scale-110`}>
          {micOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
        
        <button onClick={onClose} className="p-4 rounded-full bg-red-600 text-white shadow-lg shadow-red-500/30 hover:bg-red-700 transition-all hover:scale-110">
          <PhoneOff size={32} />
        </button>

        <button onClick={toggleCam} className={`p-4 rounded-full ${camOn ? 'bg-gray-700 text-white' : 'bg-red-500 text-white'} transition-all hover:scale-110`}>
          {camOn ? <Video size={24} /> : <VideoOff size={24} />}
        </button>
      </div>
    </div>
  );
}