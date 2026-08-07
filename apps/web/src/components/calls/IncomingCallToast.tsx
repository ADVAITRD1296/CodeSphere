'use client';

import React, { useEffect, useState, memo } from 'react';
import { Phone, PhoneOff, Video, Mic, Volume2 } from 'lucide-react';

export interface IncomingCallData {
  callerSocketId: string;
  callerUserId: string;
  callerUsername: string;
  callType: 'VOICE' | 'VIDEO';
}

interface IncomingCallToastProps {
  callData: IncomingCallData | null;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallToast: React.FC<IncomingCallToastProps> = memo(({
  callData,
  onAccept,
  onDecline,
}) => {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!callData) return;
    setCountdown(30);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [callData, onDecline]);

  if (!callData) return null;

  return (
    <div
      className="glass-panel animate-slide-up"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 250,
        width: '320px',
        padding: '16px',
        backgroundColor: 'rgba(24, 24, 37, 0.95)',
        border: '1px solid rgba(137, 180, 250, 0.3)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(137, 180, 250, 0.2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        {/* Pulsing Avatar */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--blue), var(--mauve))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.1rem',
              color: '#11111b',
              animation: 'pulse-ring 1.5s infinite',
            }}
          >
            {callData.callerUsername.charAt(0).toUpperCase()}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              backgroundColor: 'var(--green)',
              padding: '3px',
              borderRadius: '50%',
              border: '2px solid var(--mantle)',
            }}
          >
            {callData.callType === 'VIDEO' ? <Video size={10} color="#11111b" /> : <Mic size={10} color="#11111b" />}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text)' }}>
            {callData.callerUsername}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--subtext0)', marginTop: '2px' }}>
            Incoming {callData.callType === 'VIDEO' ? 'Video' : 'Voice'} Call ({countdown}s)
          </div>
        </div>
      </div>

      {/* Accept / Decline Action Buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onDecline}
          className="btn-danger"
          style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: '0.82rem' }}
        >
          <PhoneOff size={14} /> Decline
        </button>

        <button
          onClick={onAccept}
          className="btn-primary"
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: '8px',
            fontSize: '0.82rem',
            background: 'linear-gradient(135deg, var(--green) 0%, var(--teal) 100%)',
            color: '#11111b',
          }}
        >
          <Phone size={14} /> Accept
        </button>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(137, 180, 250, 0.6); }
          70% { box-shadow: 0 0 0 10px rgba(137, 180, 250, 0); }
          100% { box-shadow: 0 0 0 0 rgba(137, 180, 250, 0); }
        }
      `}</style>
    </div>
  );
});

IncomingCallToast.displayName = 'IncomingCallToast';
