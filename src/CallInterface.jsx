import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, Maximize2, Minimize2, User } from 'lucide-react';
import { doc, onSnapshot, updateDoc, setDoc, deleteDoc, addDoc, collection, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const SERVERS = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
  ],
};

export default function CallInterface({ callId, role, user, activeChat, callType, onClose }) {
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(callType === 'video'); // <--- AUTO-ENABLE CAM FOR VIDEO CALLS
  const [screenSharing, setScreenSharing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(new RTCPeerConnection(SERVERS));
  const localStream = useRef(null);

  useEffect(() => {
    const startCall = async () => {
      // 1. Get Media based on Call Type
      localStream.current = await navigator.mediaDevices.getUserMedia({ 
        video: callType === 'video', // Start with video only if video call
        audio: true 
      });
      
      localStream.current.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, localStream.current);
      });

      if (localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = localStream.current;
      }

      peerConnection.current.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      };

      peerConnection.current.onicecandidate = async (event) => {
        if (event.candidate) {
          const cRef = collection(db, "calls", callId, role === 'caller' ? "callerCandidates" : "calleeCandidates");
          await addDoc(cRef, event.candidate.toJSON());
        }
      };

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
    };

    startCall();

    const unsubCall = onSnapshot(doc(db, "calls", callId), (snapshot) => {
      const data = snapshot.data();
      if (!data) { onClose(); return; } // End call if room deleted
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

  const toggleMic = () => {
    const audioTrack = localStream.current?.getAudioTracks()[0];
    if (audioTrack) { audioTrack.enabled = !audioTrack.enabled; setMicOn(audioTrack.enabled); }
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      const videoTrack = localStream.current?.getVideoTracks()[0];
      if (videoTrack) { videoTrack.stop(); localStream.current.removeTrack(videoTrack); }
      const sender = peerConnection.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender) peerConnection.current.removeTrack(sender);
      setCameraOn(false);
    } else {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = stream.getVideoTracks()[0];
      localStream.current.addTrack(videoTrack);
      peerConnection.current.addTrack(videoTrack, localStream.current);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream.current;
      setCameraOn(true);
    }
  };

  const endCall = async () => {
    if (role === 'caller') await deleteDoc(doc(db, "calls", callId));
    onClose();
  };

  if (minimized) {
    return (
      <motion.div drag className="fixed bottom-20 right-4 w-64 h-36 bg-[#111214] border border-[#2b2d31] rounded-xl shadow-2xl z-[200] overflow-hidden flex flex-col">
        <div className="flex-1 bg-[#1e1f22] relative">
            {remoteStream ? <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><img src={activeChat?.avatar} className="w-12 h-12 rounded-full opacity-50" /></div>}
            <div className="absolute inset-0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100"><button onClick={() => setMinimized(false)} className="p-2 bg-black/50 rounded-full text-white"><Maximize2 size={20} /></button></div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#0e0e10] flex flex-col text-white font-sans">
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center gap-3"><h2 className="font-bold text-gray-200">{callType === 'video' ? 'Video' : 'Voice'} Connected</h2><span className="text-gray-400 text-sm">/ {activeChat?.name}</span></div>
        <button onClick={() => setMinimized(true)} className="p-2 hover:bg-white/10 rounded-lg text-gray-300"><Minimize2 size={24} /></button>
      </div>

      <div className="flex-1 flex p-4 gap-4 justify-center items-center overflow-hidden relative">
        <div className="flex-1 max-w-4xl h-full max-h-[80vh] bg-[#1e1f22] rounded-2xl overflow-hidden relative flex items-center justify-center border border-[#2b2d31] shadow-xl">
            {remoteStream ? <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-contain" /> : <div className="flex flex-col items-center animate-pulse"><div className="w-24 h-24 rounded-full border-4 border-[#2b2d31] bg-[#2b2d31] overflow-hidden mb-4 shadow-lg"><img src={activeChat?.avatar || activeChat?.photoURL} className="w-full h-full object-cover" /></div><h3 className="text-xl font-bold text-white">{activeChat?.name}</h3><p className="text-gray-400">Connecting...</p></div>}
            <motion.div drag dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} className="absolute bottom-4 right-4 w-48 h-32 bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10">
                {cameraOn ? <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover flip-horizontal" /> : <div className="w-full h-full flex items-center justify-center bg-[#2b2d31]"><User size={32} className="text-gray-500" /></div>}
            </motion.div>
        </div>
      </div>

      <div className="h-20 bg-[#1e1f22] flex items-center justify-center gap-4 pb-4">
        <button onClick={toggleMic} className={`p-4 rounded-full transition-all ${micOn ? 'bg-[#2b2d31] hover:bg-[#35373c] text-white' : 'bg-white text-black'}`}>{micOn ? <Mic size={24} /> : <MicOff size={24} />}</button>
        <button onClick={endCall} className="px-8 py-4 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-lg transition-all active:scale-95"><PhoneOff size={28} /></button>
        <button onClick={toggleCamera} className={`p-4 rounded-full transition-all ${cameraOn ? 'bg-white text-black' : 'bg-[#2b2d31] hover:bg-[#35373c] text-white'}`}>{cameraOn ? <Video size={24} /> : <VideoOff size={24} />}</button>
      </div>
    </div>
  );
}