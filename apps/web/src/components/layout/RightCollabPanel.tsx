'use client';

import React, { useState, memo } from 'react';
import { 
  Users, 
  MessageSquare, 
  Video, 
  Mic, 
  MicOff, 
  Volume2, 
  PhoneOff, 
  Camera, 
  CameraOff, 
  Monitor, 
  ChevronRight, 
  X,
  Send,
  UserCheck,
  Shield,
  Circle
} from 'lucide-react';
import { UserPresence, RoomPresenceSummary, WorkspaceRole } from '@codesphere/shared';
import { VoicePeer } from '../../hooks/useVoiceCall';
import { VideoPeer } from '../../hooks/useVideoCall';

export type CollabTab = 'voice' | 'video' | 'chat' | 'members';

interface RightCollabPanelProps {
  // Navigation & Toggle
  activeTab: CollabTab;
  onSelectTab: (tab: CollabTab) => void;
  onClose: () => void;

  // Presence & Members
  presenceSummary: RoomPresenceSummary;
  currentUserId?: string;

  // Voice State & Actions
  isInVoice: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  voicePeers: VoicePeer[];
  onJoinVoice: () => void;
  onLeaveVoice: () => void;
  onToggleMute: () => void;

  // Video State & Actions
  isInVideo: boolean;
  isCameraOn: boolean;
  isMicOn: boolean;
  isScreenSharing: boolean;
  localStream: MediaStream | null;
  videoPeers: VideoPeer[];
  onJoinVideo: () => void;
  onLeaveVideo: () => void;
  onToggleCamera: () => void;
  onToggleVideoMic: () => void;
  onToggleScreenShare: () => void;

  // Chat State & Actions
  chatMessages: Array<{ id: string; sender: string; content: string; timestamp: number; isSelf: boolean }>;
  onSendMessage: (msg: string) => void;
}

export const RightCollabPanel: React.FC<RightCollabPanelProps> = memo(({
  activeTab,
  onSelectTab,
  onClose,
  presenceSummary,
  currentUserId,
  isInVoice,
  isMuted,
  isSpeaking,
  voicePeers,
  onJoinVoice,
  onLeaveVoice,
  onToggleMute,
  isInVideo,
  isCameraOn,
  isMicOn,
  isScreenSharing,
  localStream,
  videoPeers,
  onJoinVideo,
  onLeaveVideo,
  onToggleCamera,
  onToggleVideoMic,
  onToggleScreenShare,
  chatMessages,
  onSendMessage,
}) => {
  const [chatInput, setChatInput] = useState('');

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="presence-sidebar" style={{ width: '320px', display: 'flex', flexDirection: 'column' }}>
      {/* Tab Switcher Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          height: '42px',
          backgroundColor: 'var(--mantle)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {/* Members Tab */}
          <button
            onClick={() => onSelectTab('members')}
            className={`ide-pill-btn${activeTab === 'members' ? ' active' : ''}`}
            title="Room Members"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
          >
            <Users size={12} /> {presenceSummary.totalOnline}
          </button>

          {/* Chat Tab */}
          <button
            onClick={() => onSelectTab('chat')}
            className={`ide-pill-btn${activeTab === 'chat' ? ' active' : ''}`}
            title="Room Chat"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
          >
            <MessageSquare size={12} /> Chat
          </button>

          {/* Voice Tab */}
          <button
            onClick={() => onSelectTab('voice')}
            className={`ide-pill-btn${activeTab === 'voice' ? ' active' : ''}${isInVoice ? ' run-btn' : ''}`}
            title="Voice Room"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
          >
            <Mic size={12} /> Voice
          </button>

          {/* Video Tab */}
          <button
            onClick={() => onSelectTab('video')}
            className={`ide-pill-btn${activeTab === 'video' ? ' active' : ''}${isInVideo ? ' video-active' : ''}`}
            title="Video Conference"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
          >
            <Video size={12} /> Video
          </button>
        </div>

        <button
          onClick={onClose}
          className="ide-icon-btn"
          title="Collapse Panel"
          style={{ width: '26px', height: '26px' }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Tab Content Body */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* ─── 1. MEMBERS TAB ────────────────────────────────────────────── */}
        {activeTab === 'members' && (
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--subtext0)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Online Now — {presenceSummary.totalOnline}
            </div>

            {presenceSummary.users.map((u) => {
              const isSelf = u.userId === currentUserId;
              return (
                <div
                  key={u.userId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ position: 'relative' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--surface0)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: 'var(--blue)',
                        }}
                      >
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div
                        className={`status-dot ${u.status.toLowerCase()}`}
                        style={{ position: 'absolute', bottom: '-1px', right: '-1px', border: '2px solid var(--mantle)' }}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {u.username} {isSelf && <span style={{ color: 'var(--overlay0)', fontSize: '0.72rem' }}>(you)</span>}
                      </div>
                      {u.activeFileName && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--subtext0)' }}>
                          📄 {u.activeFileName}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className={`badge badge-${(u.role || 'EDITOR').toLowerCase()}`}>{u.role || 'EDITOR'}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── 2. CHAT TAB ───────────────────────────────────────────────── */}
        {activeTab === 'chat' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {chatMessages.length === 0 ? (
                <div style={{ color: 'var(--overlay0)', fontSize: '0.82rem', textAlign: 'center', marginTop: '20px' }}>
                  No messages yet. Start the conversation!
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.isSelf ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--overlay0)', marginBottom: '2px' }}>
                      {msg.sender} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div
                      style={{
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: msg.isSelf ? 'rgba(137, 180, 250, 0.18)' : 'var(--surface0)',
                        color: 'var(--text)',
                        fontSize: '0.82rem',
                        maxWidth: '85%',
                        wordBreak: 'break-word',
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '6px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                <Send size={12} />
              </button>
            </form>
          </div>
        )}

        {/* ─── 3. VOICE TAB ──────────────────────────────────────────────── */}
        {activeTab === 'voice' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <Volume2 size={32} style={{ color: isInVoice ? 'var(--green)' : 'var(--overlay0)', margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>
                {isInVoice ? 'Connected to Voice' : 'Voice Channel Idle'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--subtext0)', marginTop: '4px' }}>
                {isInVoice ? `${voicePeers.length + 1} active in voice call` : 'Click below to join low-latency voice audio'}
              </div>
            </div>

            {/* Controls */}
            {isInVoice ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={onToggleMute}
                  className={`btn-secondary${isMuted ? ' btn-danger' : ''}`}
                  style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: '0.8rem' }}
                >
                  {isMuted ? <MicOff size={14} /> : <Mic size={14} />} {isMuted ? 'Muted' : 'Unmute'}
                </button>
                <button
                  onClick={onLeaveVoice}
                  className="btn-danger"
                  style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: '0.8rem' }}
                >
                  <PhoneOff size={14} /> Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={onJoinVoice}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
              >
                <Mic size={14} /> Join Voice Channel
              </button>
            )}

            {/* Voice Participants */}
            {isInVoice && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--subtext0)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Voice Participants
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isSpeaking ? 'var(--green)' : 'var(--overlay0)' }} />
                    <span style={{ fontSize: '0.82rem', color: 'var(--text)', fontWeight: 600 }}>You</span>
                    {isMuted && <MicOff size={12} color="var(--red)" style={{ marginLeft: 'auto' }} />}
                  </div>

                  {voicePeers.map((peer) => (
                    <div key={peer.socketId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: peer.isSpeaking ? 'var(--green)' : 'var(--overlay0)' }} />
                      <span style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{peer.username}</span>
                      {peer.isMuted && <MicOff size={12} color="var(--red)" style={{ marginLeft: 'auto' }} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── 4. VIDEO TAB ──────────────────────────────────────────────── */}
        {activeTab === 'video' && (
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--subtext0)', textTransform: 'uppercase' }}>
                Video Conference ({videoPeers.length + (isInVideo ? 1 : 0)})
              </div>
            </div>

            {/* Video Controls */}
            {isInVideo ? (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  onClick={onToggleCamera}
                  className={`ide-pill-btn${!isCameraOn ? ' active' : ''}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {isCameraOn ? <Camera size={12} /> : <CameraOff size={12} color="var(--red)" />} Cam
                </button>
                <button
                  onClick={onToggleVideoMic}
                  className={`ide-pill-btn${!isMicOn ? ' active' : ''}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {isMicOn ? <Mic size={12} /> : <MicOff size={12} color="var(--red)" />} Mic
                </button>
                <button
                  onClick={onToggleScreenShare}
                  className={`ide-pill-btn${isScreenSharing ? ' active' : ''}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <Monitor size={12} /> Share
                </button>
                <button
                  onClick={onLeaveVideo}
                  className="ide-pill-btn"
                  style={{ color: 'var(--red)', borderColor: 'rgba(243,139,168,0.3)', flex: 1, justifyContent: 'center' }}
                >
                  Leave
                </button>
              </div>
            ) : (
              <button
                onClick={onJoinVideo}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '9px' }}
              >
                <Video size={14} /> Start Video Meeting
              </button>
            )}

            {/* Live Video Grid Tiles */}
            {isInVideo && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Local Video Tile */}
                <div style={{ position: 'relative', width: '100%', height: '140px', backgroundColor: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <video
                    ref={(el) => {
                      if (el && localStream) el.srcObject = localStream;
                    }}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                  />
                  <div style={{ position: 'absolute', bottom: '6px', left: '8px', backgroundColor: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', color: '#fff' }}>
                    You (Local)
                  </div>
                </div>

                {/* Peer Video Tiles */}
                {videoPeers.map((peer) => (
                  <div key={peer.socketId} style={{ position: 'relative', width: '100%', height: '140px', backgroundColor: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <video
                      ref={(el) => {
                        if (el && peer.stream) el.srcObject = peer.stream;
                      }}
                      autoPlay
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', bottom: '6px', left: '8px', backgroundColor: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', color: '#fff' }}>
                      {peer.username}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

RightCollabPanel.displayName = 'RightCollabPanel';
