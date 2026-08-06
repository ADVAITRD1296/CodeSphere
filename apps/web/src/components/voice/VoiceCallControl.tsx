'use client';

import React from 'react';
import { Mic, MicOff, PhoneOff, PhoneCall, Volume2, AlertCircle, Radio } from 'lucide-react';
import { VoicePeerState } from '../../hooks/useVoiceCall';

interface VoiceCallControlProps {
  isInVoice: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  voicePeers: VoicePeerState[];
  permissionError: string | null;
  onJoin: () => void;
  onLeave: () => void;
  onToggleMute: () => void;
  currentUsername?: string;
}

export const VoiceCallControl: React.FC<VoiceCallControlProps> = ({
  isInVoice,
  isMuted,
  isSpeaking,
  voicePeers,
  permissionError,
  onJoin,
  onLeave,
  onToggleMute,
  currentUsername
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {permissionError && (
        <div
          title={permissionError}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.75rem',
            color: '#f38ba8',
            backgroundColor: 'rgba(243,139,168,0.1)',
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid rgba(243,139,168,0.2)'
          }}
        >
          <AlertCircle size={13} />
          <span>Mic Error</span>
        </div>
      )}

      {!isInVoice ? (
        <button
          onClick={onJoin}
          title="Join Room Voice Call"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: '#313244',
            color: '#a6e3a1',
            border: '1px solid rgba(166,227,161,0.2)',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(166,227,161,0.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#313244')}
        >
          <PhoneCall size={14} color="#a6e3a1" />
          <span>Join Voice</span>
        </button>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#181825',
          padding: '4px 8px',
          borderRadius: '8px',
          border: '1px solid #313244'
        }}>
          {/* Speaking Indicator & Mic Status Button */}
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: isMuted ? '#f38ba8' : isSpeaking ? '#a6e3a1' : '#313244',
              color: isMuted || isSpeaking ? '#11111b' : '#cdd6f4',
              border: 'none',
              cursor: 'pointer',
              boxShadow: isSpeaking ? '0 0 10px #a6e3a1' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
          </button>

          {/* Connected Voice Peers Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 4px' }}>
            <Radio size={13} color={isSpeaking ? '#a6e3a1' : '#8b5cf6'} className={isSpeaking ? 'animate-pulse' : ''} />
            <span style={{ fontSize: '0.78rem', color: '#cdd6f4', fontWeight: 600 }}>
              {voicePeers.length + 1} in call
            </span>
          </div>

          {/* Remote Voice Peers Avatars List */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
            {voicePeers.map((peer) => (
              <div
                key={peer.socketId}
                title={`${peer.username || 'Peer'}${peer.isMuted ? ' (Muted)' : peer.isSpeaking ? ' (Speaking)' : ''}`}
                style={{
                  position: 'relative',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: '#89b4fa',
                  color: '#11111b',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: peer.isSpeaking ? '2px solid #a6e3a1' : '1px solid #313244',
                  boxShadow: peer.isSpeaking ? '0 0 8px #a6e3a1' : 'none'
                }}
              >
                {(peer.username || 'P').charAt(0).toUpperCase()}
                {peer.isMuted && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#f38ba8'
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Leave Voice Call Button */}
          <button
            onClick={onLeave}
            title="Leave Voice Call"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '5px 8px',
              backgroundColor: 'rgba(243,139,168,0.15)',
              color: '#f38ba8',
              border: '1px solid rgba(243,139,168,0.3)',
              borderRadius: '6px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              marginLeft: '4px'
            }}
          >
            <PhoneOff size={13} />
          </button>
        </div>
      )}
    </div>
  );
};
