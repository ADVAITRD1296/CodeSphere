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

export interface VideoPeerState {
  socketId: string;
  userId?: string;
  username?: string;
  isCameraOn?: boolean;
  isMicOn?: boolean;
  isScreenSharing?: boolean;
  stream?: MediaStream;
}

export function useVideoCall(socket: Socket | null, workspaceId: string | null) {
  const [isInVideo, setIsInVideo] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [videoPeers, setVideoPeers] = useState<Map<string, VideoPeerState>>(new Map());
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Enumerate camera devices
  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(cams);
      if (cams.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(cams[0].deviceId);
      }
    } catch (err) {
      console.error('[Video] Device enumeration error:', err);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // Clean up Peer Connection helper
  const removePeerConnection = useCallback((peerSocketId: string) => {
    const pc = peerConnectionsRef.current.get(peerSocketId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerSocketId);
    }

    setVideoPeers((prev) => {
      const next = new Map(prev);
      next.delete(peerSocketId);
      return next;
    });
  }, []);

  // Create WebRTC Peer Connection helper
  const createPeerConnection = useCallback((peerSocketId: string, isInitiator: boolean) => {
    if (peerConnectionsRef.current.has(peerSocketId)) {
      return peerConnectionsRef.current.get(peerSocketId)!;
    }

    const pc = new RTCPeerConnection(STUN_SERVERS);
    peerConnectionsRef.current.set(peerSocketId, pc);

    // Add local tracks (camera / screen) to peer connection
    const currentStream = screenStreamRef.current || localStreamRef.current;
    if (currentStream) {
      currentStream.getTracks().forEach((track) => {
        pc.addTrack(track, currentStream);
      });
    }

    // Handle ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit(SOCKET_EVENTS.VIDEO.SIGNAL, {
          targetSocketId: peerSocketId,
          signal: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    // Handle incoming Remote Tracks
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setVideoPeers((prev) => {
        const next = new Map(prev);
        const existing = next.get(peerSocketId) || { socketId: peerSocketId };
        next.set(peerSocketId, { ...existing, stream: remoteStream });
        return next;
      });
    };

    // Create SDP Offer if initiator
    if (isInitiator) {
      pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          if (socket && pc.localDescription) {
            socket.emit(SOCKET_EVENTS.VIDEO.SIGNAL, {
              targetSocketId: peerSocketId,
              signal: { type: 'offer', sdp: pc.localDescription }
            });
          }
        })
        .catch((err) => console.error('[Video] Offer error:', err));
    }

    return pc;
  }, [socket]);

  // Start Camera Stream Preview
  const startCameraPreview = useCallback(async (deviceId?: string) => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        audio: true,
        video: deviceId ? { deviceId: { exact: deviceId } } : true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      setPermissionError(null);
      return stream;
    } catch (err: any) {
      console.error('[Video] Camera permission error:', err);
      setPermissionError('Camera / Microphone permission denied or device unavailable.');
      return null;
    }
  }, []);

  // Join Video Conference
  const joinVideoCall = useCallback(async () => {
    if (!socket || !workspaceId) return;

    let stream = localStreamRef.current;
    if (!stream) {
      stream = await startCameraPreview(selectedDeviceId);
    }

    if (!stream) return;

    setIsInVideo(true);
    setIsCameraOn(true);
    setIsMicOn(true);

    socket.emit(SOCKET_EVENTS.VIDEO.JOIN);
  }, [socket, workspaceId, selectedDeviceId, startCameraPreview]);

  // Leave Video Conference
  const leaveVideoCall = useCallback(() => {
    if (socket) {
      socket.emit(SOCKET_EVENTS.VIDEO.LEAVE);
    }

    // Stop screen share if active
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    // Stop local camera stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    // Close all WebRTC Peer Connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    setVideoPeers(new Map());
    setIsInVideo(false);
    setIsScreenSharing(false);
  }, [socket]);

  // Toggle Camera Track
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const enabled = videoTrack.enabled;
        setIsCameraOn(enabled);

        socket?.emit(SOCKET_EVENTS.VIDEO.STATE_UPDATE, {
          isCameraOn: enabled,
          isMicOn,
          isScreenSharing,
          activeDeviceId: selectedDeviceId
        });
      }
    }
  }, [socket, isMicOn, isScreenSharing, selectedDeviceId]);

  // Toggle Microphone Track
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const enabled = audioTrack.enabled;
        setIsMicOn(enabled);

        socket?.emit(SOCKET_EVENTS.VIDEO.STATE_UPDATE, {
          isCameraOn,
          isMicOn: enabled,
          isScreenSharing,
          activeDeviceId: selectedDeviceId
        });
      }
    }
  }, [socket, isCameraOn, isScreenSharing, selectedDeviceId]);

  // Switch Camera Device
  const switchCameraDevice = useCallback(async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    const newStream = await startCameraPreview(deviceId);
    if (newStream && isInVideo) {
      const newVideoTrack = newStream.getVideoTracks()[0];
      // Replace video track on all active WebRTC peer connections without renegotiation
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && newVideoTrack) {
          sender.replaceTrack(newVideoTrack);
        }
      });
    }
  }, [startCameraPreview, isInVideo]);

  // Toggle Screen Sharing via getDisplayMedia()
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen share and revert to camera stream
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);

      if (localStreamRef.current) {
        const camVideoTrack = localStreamRef.current.getVideoTracks()[0];
        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender && camVideoTrack) {
            sender.replaceTrack(camVideoTrack);
          }
        });
      }

      socket?.emit(SOCKET_EVENTS.VIDEO.STATE_UPDATE, {
        isCameraOn,
        isMicOn,
        isScreenSharing: false
      });
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);

        const screenVideoTrack = screenStream.getVideoTracks()[0];

        // Handle user stopping screen share from browser floating toolbar
        screenVideoTrack.onended = () => {
          toggleScreenShare();
        };

        // Replace video track on all peer connections
        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender && screenVideoTrack) {
            sender.replaceTrack(screenVideoTrack);
          }
        });

        socket?.emit(SOCKET_EVENTS.VIDEO.STATE_UPDATE, {
          isCameraOn,
          isMicOn,
          isScreenSharing: true
        });
      } catch (err) {
        console.error('[Video] Screen share error:', err);
      }
    }
  }, [isScreenSharing, socket, isCameraOn, isMicOn]);

  // Socket Signaling Event Listeners
  useEffect(() => {
    if (!socket || !isInVideo) return;

    const handlePeerJoined = (data: any) => {
      if (data.peers && Array.isArray(data.peers)) {
        data.peers.forEach((peerSocketId: string) => {
          createPeerConnection(peerSocketId, true);
        });
      } else if (data.peerSocketId) {
        setVideoPeers((prev) => {
          const next = new Map(prev);
          next.set(data.peerSocketId, {
            socketId: data.peerSocketId,
            userId: data.userId,
            username: data.username,
            isCameraOn: true,
            isMicOn: true,
            isScreenSharing: false
          });
          return next;
        });
      }
    };

    const handlePeerLeft = ({ peerSocketId }: { peerSocketId: string }) => {
      removePeerConnection(peerSocketId);
    };

    const handleVideoSignal = async ({ senderSocketId, signal }: { senderSocketId: string; signal: any }) => {
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
          socket.emit(SOCKET_EVENTS.VIDEO.SIGNAL, {
            targetSocketId: senderSocketId,
            signal: { type: 'answer', sdp: pc.localDescription }
          });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } else if (signal.type === 'candidate' && signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('[Video] Signal error:', err);
      }
    };

    const handleVideoStateUpdate = (data: VideoPeerState) => {
      setVideoPeers((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.socketId) || { socketId: data.socketId };
        next.set(data.socketId, { ...existing, ...data });
        return next;
      });
    };

    socket.on(SOCKET_EVENTS.VIDEO.PEER_JOINED, handlePeerJoined);
    socket.on(SOCKET_EVENTS.VIDEO.PEER_LEFT, handlePeerLeft);
    socket.on(SOCKET_EVENTS.VIDEO.SIGNAL, handleVideoSignal);
    socket.on(SOCKET_EVENTS.VIDEO.STATE_UPDATE, handleVideoStateUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.VIDEO.PEER_JOINED, handlePeerJoined);
      socket.off(SOCKET_EVENTS.VIDEO.PEER_LEFT, handlePeerLeft);
      socket.off(SOCKET_EVENTS.VIDEO.SIGNAL, handleVideoSignal);
      socket.off(SOCKET_EVENTS.VIDEO.STATE_UPDATE, handleVideoStateUpdate);
    };
  }, [socket, isInVideo, createPeerConnection, removePeerConnection]);

  return {
    isInVideo,
    isCameraOn,
    isMicOn,
    isScreenSharing,
    localStream,
    videoPeers: Array.from(videoPeers.values()),
    videoDevices,
    selectedDeviceId,
    permissionError,
    startCameraPreview,
    joinVideoCall,
    leaveVideoCall,
    toggleCamera,
    toggleMic,
    switchCameraDevice,
    toggleScreenShare
  };
}
