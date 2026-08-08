'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Pin,
  PinOff,
  Maximize2,
  Grid,
  User,
  Settings,
  X,
  Camera
} from 'lucide-react';
import { VideoPeerState } from '../../hooks/useVideoCall';

interface VideoConferenceModalProps {
  isOpen: boolean;
  isInVideo: boolean;
  isCameraOn: boolean;
  isMicOn: boolean;
  isScreenSharing: boolean;
  localStream: MediaStream | null;
  videoPeers: VideoPeerState[];
  videoDevices: MediaDeviceInfo[];
  selectedDeviceId: string;
  currentUsername?: string;
  permissionError?: string | null;
  onStartPreview: () => void;
  onJoin: () => void;
  onLeave: () => void;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onToggleScreenShare: () => void;
  onSwitchDevice: (deviceId: string) => void;
  onClose: () => void;
}

// Single Video Card Component
const VideoCard: React.FC<{
  stream?: MediaStream | null;
  username?: string;
  isCameraOn?: boolean;
  isMicOn?: boolean;
  isSelf?: boolean;
  isPinned?: boolean;
  onPin?: () => void;
}> = ({ stream, username, isCameraOn = true, isMicOn = true, isSelf = false, isPinned = false, onPin }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--mantle)',
        borderRadius: '12px',
        overflow: 'hidden',
        border: isPinned ? '2px solid var(--blue)' : '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isPinned ? '0 0 16px rgba(137,180,250,0.3)' : 'none'
      }}
    >
      {stream && isCameraOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: isSelf ? 'scaleX(-1)' : 'none'
          }}
        />
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--text)'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#89b4fa',
            color: '#11111b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            fontWeight: 700
          }}>
            {(username || 'U').charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: '0.85rem', color: '#a6adc8' }}>Camera Off</span>
        </div>
      )}

      {/* Participant Info Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        backgroundColor: 'rgba(17,17,27,0.75)',
        backdropFilter: 'blur(4px)',
        padding: '3px 8px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.75rem',
        color: '#cdd6f4'
      }}>
        <span>{username} {isSelf && '(You)'}</span>
        {!isMicOn && <MicOff size={12} color="#f38ba8" />}
      </div>

      {/* Pin Toggle Button */}
      {onPin && (
        <button
          onClick={onPin}
          title={isPinned ? 'Unpin participant' : 'Pin participant'}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            backgroundColor: isPinned ? '#89b4fa' : 'rgba(17,17,27,0.6)',
            color: isPinned ? '#11111b' : '#cdd6f4',
            border: 'none',
            borderRadius: '6px',
            padding: '4px',
            cursor: 'pointer',
            display: 'flex'
          }}
        >
          {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
        </button>
      )}
    </div>
  );
};

export const VideoConferenceModal: React.FC<VideoConferenceModalProps> = ({
  isOpen,
  isInVideo,
  isCameraOn,
  isMicOn,
  isScreenSharing,
  localStream,
  videoPeers,
  videoDevices,
  selectedDeviceId,
  currentUsername,
  permissionError,
  onStartPreview,
  onJoin,
  onLeave,
  onToggleCamera,
  onToggleMic,
  onToggleScreenShare,
  onSwitchDevice,
  onClose
}) => {
  const [pinnedPeerId, setPinnedPeerId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'GRID' | 'SPEAKER'>('GRID');

  useEffect(() => {
    if (isOpen && !isInVideo && !localStream) {
      onStartPreview();
    }
  }, [isOpen, isInVideo, localStream, onStartPreview]);

  if (!isOpen) return null;

  const allParticipants = [
    {
      socketId: 'local',
      username: currentUsername || 'You',
      stream: localStream,
      isCameraOn,
      isMicOn,
      isSelf: true
    },
    ...videoPeers.map(p => ({
      socketId: p.socketId,
      username: p.username || 'Peer',
      stream: p.stream,
      isCameraOn: p.isCameraOn ?? true,
      isMicOn: p.isMicOn ?? true,
      isSelf: false
    }))
  ];

  const pinnedParticipant = allParticipants.find(p => p.socketId === pinnedPeerId) || null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 300,
      padding: '20px'
    }}>
      <div style={{
        width: 'min(95vw, 1100px)',
        height: 'min(90vh, 750px)',
        backgroundColor: '#11111b',
        borderRadius: '16px',
        border: '1px solid #313244',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 80px rgba(0,0,0,0.7)'
      }}>
        {/* Header Bar */}
        <div style={{
          height: '52px',
          backgroundColor: '#181825',
          borderBottom: '1px solid #1e1e2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Video size={18} color="#89b4fa" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#cdd6f4' }}>
              Video Conference ({allParticipants.length} Participants)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Layout Toggle */}
            {isInVideo && (
              <button
                onClick={() => setLayoutMode(m => m === 'GRID' ? 'SPEAKER' : 'GRID')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  backgroundColor: '#313244',
                  color: '#cdd6f4',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                <Grid size={14} />
                <span>{layoutMode === 'GRID' ? 'Grid View' : 'Speaker View'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#6c7086', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Video Main Body */}
        <div style={{ flex: 1, padding: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!isInVideo ? (
            /* Camera Preview Screen before joining */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
              {permissionError && (
                <div style={{ backgroundColor: 'rgba(243,139,168,0.1)', color: '#f38ba8', border: '1px solid rgba(243,139,168,0.3)', borderRadius: '8px', padding: '10px 16px', fontSize: '0.85rem', maxWidth: '440px', textAlign: 'center' }}>
                  ⚠️ {permissionError}
                </div>
              )}
              <div style={{ width: '480px', height: '270px', borderRadius: '12px', overflow: 'hidden' }}>
                <VideoCard stream={localStream} username={currentUsername} isCameraOn={isCameraOn} isSelf={true} />
              </div>

              {/* Device Selector */}
              {videoDevices.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Camera size={14} color="#89b4fa" />
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => onSwitchDevice(e.target.value)}
                    style={{
                      backgroundColor: '#181825',
                      color: '#cdd6f4',
                      border: '1px solid #313244',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  >
                    {videoDevices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.slice(0, 5)}...`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={onJoin}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 24px',
                  backgroundColor: '#89b4fa',
                  color: '#11111b',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer'
                }}
              >
                <Video size={16} /> Join Video Conference
              </button>
            </div>
          ) : pinnedParticipant || layoutMode === 'SPEAKER' ? (
            /* Speaker / Pinned Layout */
            <div style={{ flex: 1, display: 'flex', gap: '12px', height: '100%', overflow: 'hidden' }}>
              <div style={{ flex: 1, height: '100%' }}>
                <VideoCard
                  stream={pinnedParticipant?.stream || allParticipants[0].stream}
                  username={pinnedParticipant?.username || allParticipants[0].username}
                  isCameraOn={pinnedParticipant?.isCameraOn ?? allParticipants[0].isCameraOn}
                  isMicOn={pinnedParticipant?.isMicOn ?? allParticipants[0].isMicOn}
                  isSelf={pinnedParticipant?.isSelf ?? allParticipants[0].isSelf}
                  isPinned={true}
                  onPin={() => setPinnedPeerId(null)}
                />
              </div>
              <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                {allParticipants.map(p => (
                  <div key={p.socketId} style={{ height: '120px', flexShrink: 0 }}>
                    <VideoCard
                      stream={p.stream}
                      username={p.username}
                      isCameraOn={p.isCameraOn}
                      isMicOn={p.isMicOn}
                      isSelf={p.isSelf}
                      isPinned={pinnedPeerId === p.socketId}
                      onPin={() => setPinnedPeerId(p.socketId)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Grid Layout */
            <div style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: allParticipants.length <= 2 ? '1fr 1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '12px',
              height: '100%',
              overflowY: 'auto'
            }}>
              {allParticipants.map(p => (
                <VideoCard
                  key={p.socketId}
                  stream={p.stream}
                  username={p.username}
                  isCameraOn={p.isCameraOn}
                  isMicOn={p.isMicOn}
                  isSelf={p.isSelf}
                  isPinned={pinnedPeerId === p.socketId}
                  onPin={() => setPinnedPeerId(p.socketId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Video Call Controls Toolbar */}
        {isInVideo && (
          <div style={{
            height: '64px',
            backgroundColor: '#181825',
            borderTop: '1px solid #1e1e2e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px'
          }}>
            {/* Toggle Mic */}
            <button
              onClick={onToggleMic}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: isMicOn ? '#313244' : '#f38ba8',
                color: isMicOn ? '#cdd6f4' : '#11111b',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
            </button>

            {/* Toggle Camera */}
            <button
              onClick={onToggleCamera}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: isCameraOn ? '#313244' : '#f38ba8',
                color: isCameraOn ? '#cdd6f4' : '#11111b',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isCameraOn ? <Video size={18} /> : <VideoOff size={18} />}
            </button>

            {/* Toggle Screen Share */}
            <button
              onClick={onToggleScreenShare}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: isScreenSharing ? '#89b4fa' : '#313244',
                color: isScreenSharing ? '#11111b' : '#cdd6f4',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Monitor size={18} />
            </button>

            {/* Leave Call */}
            <button
              onClick={onLeave}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#f38ba8',
                color: '#11111b',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <PhoneOff size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
