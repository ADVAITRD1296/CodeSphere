import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@codesphere/shared';

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export interface VoicePeerState {
  socketId: string;
  userId?: string;
  username?: string;
  isMuted?: boolean;
  isSpeaking?: boolean;
  volume?: number;
  audioStream?: MediaStream;
}

export function useVoiceCall(socket: Socket | null, workspaceId: string | null) {
  const [isInVoice, setIsInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicePeers, setVoicePeers] = useState<Map<string, VoicePeerState>>(new Map());
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const remoteAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Handle WebAudio Speaking Detection
  const setupSpeakingDetection = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const speakingNow = average > 15; // Volume threshold

        setIsSpeaking((prev) => {
          if (prev !== speakingNow) {
            socket?.emit(SOCKET_EVENTS.VOICE.STATE_UPDATE, {
              isMuted: localStreamRef.current?.getAudioTracks()[0]?.enabled === false,
              isSpeaking: speakingNow,
              volume: Math.min(100, Math.round((average / 128) * 100))
            });
          }
          return speakingNow;
        });

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.error('[Voice] Failed to setup WebAudio speaking detector:', err);
    }
  }, [socket]);

  // Clean up Peer Connection helper
  const removePeerConnection = useCallback((peerSocketId: string) => {
    const pc = peerConnectionsRef.current.get(peerSocketId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerSocketId);
    }

    const audioEl = remoteAudioElementsRef.current.get(peerSocketId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      audioEl.remove();
      remoteAudioElementsRef.current.delete(peerSocketId);
    }

    setVoicePeers((prev) => {
      const next = new Map(prev);
      next.delete(peerSocketId);
      return next;
    });
  }, []);

  // Create Peer Connection helper
  const createPeerConnection = useCallback((peerSocketId: string, isInitiator: boolean) => {
    if (peerConnectionsRef.current.has(peerSocketId)) {
      return peerConnectionsRef.current.get(peerSocketId)!;
    }

    const pc = new RTCPeerConnection(STUN_SERVERS);
    peerConnectionsRef.current.set(peerSocketId, pc);

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle ICE Candidate generated locally
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit(SOCKET_EVENTS.VOICE.SIGNAL, {
          targetSocketId: peerSocketId,
          signal: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    // Handle remote track received
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setVoicePeers((prev) => {
        const next = new Map(prev);
        const existing = next.get(peerSocketId) || { socketId: peerSocketId };
        next.set(peerSocketId, { ...existing, audioStream: remoteStream });
        return next;
      });

      // Play remote audio
      let audioEl = remoteAudioElementsRef.current.get(peerSocketId);
      if (!audioEl) {
        audioEl = new Audio();
        audioEl.autoplay = true;
        remoteAudioElementsRef.current.set(peerSocketId, audioEl);
      }
      audioEl.srcObject = remoteStream;
      audioEl.play().catch(() => {});
    };

    // Create SDP Offer if initiator
    if (isInitiator) {
      pc.createOffer({ offerToReceiveAudio: true })
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          if (socket && pc.localDescription) {
            socket.emit(SOCKET_EVENTS.VOICE.SIGNAL, {
              targetSocketId: peerSocketId,
              signal: { type: 'offer', sdp: pc.localDescription }
            });
          }
        })
        .catch((err) => console.error('[Voice] Offer error:', err));
    }

    return pc;
  }, [socket]);

  // Join Voice Call
  const joinVoiceCall = useCallback(async () => {
    if (!socket || !workspaceId) return;
    setPermissionError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setIsInVoice(true);
      setIsMuted(false);

      setupSpeakingDetection(stream);

      // Join Voice Room on Socket.io Signaling Gateway
      socket.emit(SOCKET_EVENTS.VOICE.JOIN);
    } catch (err: any) {
      console.error('[Voice] Microphone permission denied:', err);
      setPermissionError('Microphone access denied or unavailable.');
    }
  }, [socket, workspaceId, setupSpeakingDetection]);

  // Leave Voice Call
  const leaveVoiceCall = useCallback(() => {
    if (socket) {
      socket.emit(SOCKET_EVENTS.VOICE.LEAVE);
    }

    // Stop speaking detection loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    // Stop local microphone track
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    // Close all WebRTC Peer Connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    // Clean up audio elements
    remoteAudioElementsRef.current.forEach((el) => {
      el.pause();
      el.srcObject = null;
      el.remove();
    });
    remoteAudioElementsRef.current.clear();

    setVoicePeers(new Map());
    setIsInVoice(false);
    setIsMuted(false);
    setIsSpeaking(false);
  }, [socket]);

  // Toggle Mute Microphone
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const muted = !audioTrack.enabled;
        setIsMuted(muted);

        socket?.emit(SOCKET_EVENTS.VOICE.STATE_UPDATE, {
          isMuted: muted,
          isSpeaking: false,
          volume: 0
        });
      }
    }
  }, [socket]);

  // Socket Signaling Listener Setup
  useEffect(() => {
    if (!socket || !isInVoice) return;

    const handlePeerJoined = (data: any) => {
      if (data.peers && Array.isArray(data.peers)) {
        // I joined existing call -> create peer connections for each peer as initiator
        data.peers.forEach((peerSocketId: string) => {
          createPeerConnection(peerSocketId, true);
        });
      } else if (data.peerSocketId) {
        // Someone else joined voice call
        setVoicePeers((prev) => {
          const next = new Map(prev);
          next.set(data.peerSocketId, {
            socketId: data.peerSocketId,
            userId: data.userId,
            username: data.username,
            isMuted: false,
            isSpeaking: false
          });
          return next;
        });
      }
    };

    const handlePeerLeft = ({ peerSocketId }: { peerSocketId: string }) => {
      removePeerConnection(peerSocketId);
    };

    const handleVoiceSignal = async ({ senderSocketId, signal }: { senderSocketId: string; signal: any }) => {
      let pc = peerConnectionsRef.current.get(senderSocketId);
      if (!pc && signal.type === 'offer') {
        pc = createPeerConnection(senderSocketId, false);
      }

      if (!pc) return;

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit(SOCKET_EVENTS.VOICE.SIGNAL, {
            targetSocketId: senderSocketId,
            signal: { type: 'answer', sdp: pc.localDescription }
          });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } else if (signal.type === 'candidate' && signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('[Voice] Signal error:', err);
      }
    };

    const handleVoiceStateUpdate = (data: VoicePeerState) => {
      setVoicePeers((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.socketId) || { socketId: data.socketId };
        next.set(data.socketId, { ...existing, ...data });
        return next;
      });
    };

    socket.on(SOCKET_EVENTS.VOICE.PEER_JOINED, handlePeerJoined);
    socket.on(SOCKET_EVENTS.VOICE.PEER_LEFT, handlePeerLeft);
    socket.on(SOCKET_EVENTS.VOICE.SIGNAL, handleVoiceSignal);
    socket.on(SOCKET_EVENTS.VOICE.STATE_UPDATE, handleVoiceStateUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.VOICE.PEER_JOINED, handlePeerJoined);
      socket.off(SOCKET_EVENTS.VOICE.PEER_LEFT, handlePeerLeft);
      socket.off(SOCKET_EVENTS.VOICE.SIGNAL, handleVoiceSignal);
      socket.off(SOCKET_EVENTS.VOICE.STATE_UPDATE, handleVoiceStateUpdate);
    };
  }, [socket, isInVoice, createPeerConnection, removePeerConnection]);

  return {
    isInVoice,
    isMuted,
    isSpeaking,
    voicePeers: Array.from(voicePeers.values()),
    permissionError,
    joinVoiceCall,
    leaveVoiceCall,
    toggleMute
  };
}
