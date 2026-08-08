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
          className="ide-pill-btn"
          style={{
            color: 'var(--green)',
            borderColor: 'rgba(166, 227, 161, 0.3)',
            backgroundColor: 'rgba(166, 227, 161, 0.1)'
          }}
        >
          <PhoneCall size={13} color="var(--green)" />
          <span>Join Voice</span>
        </button>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'var(--mantle)',
          padding: '4px 8px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)'
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
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: isMuted ? 'var(--red)' : isSpeaking ? 'var(--green)' : 'var(--surface0)',
              color: isMuted || isSpeaking ? '#11111b' : 'var(--text)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: isSpeaking ? '0 0 10px var(--green)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {isMuted ? <MicOff size={13} /> : <Mic size={13} />}
          </button>

          {/* Connected Voice Peers Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 4px' }}>
            <Radio size={12} color={isSpeaking ? 'var(--green)' : 'var(--mauve)'} className={isSpeaking ? 'animate-pulse' : ''} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text)', fontWeight: 600 }}>
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
                  backgroundColor: 'var(--blue)',
                  color: '#11111b',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: peer.isSpeaking ? '2px solid var(--green)' : '1px solid var(--border)',
                  boxShadow: peer.isSpeaking ? '0 0 8px var(--green)' : 'none'
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
                      backgroundColor: 'var(--red)'
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
