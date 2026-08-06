'use client';

import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { MessageSquare, Send, X, Hash, Users } from 'lucide-react';
import { SOCKET_EVENTS, ChatMessageDto } from '@codesphere/shared';

// ─── Relative time ─────────────────────────────────────────────────────────────
function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Color hash for avatar ─────────────────────────────────────────────────────
const AVATAR_COLORS = [
  '#f38ba8', '#fab387', '#f9e2af', '#a6e3a1',
  '#94e2d5', '#89b4fa', '#cba6f7', '#74c7ec',
];
function userColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Single message bubble ─────────────────────────────────────────────────────
const MessageBubble = memo(({
  msg,
  isSelf,
  prevMsg,
}: {
  msg: ChatMessageDto;
  isSelf: boolean;
  prevMsg?: ChatMessageDto;
}) => {
  const showHeader = !prevMsg || prevMsg.userId !== msg.userId;
  const color = userColor(msg.userId);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isSelf ? 'row-reverse' : 'row',
        gap: '8px',
        marginBottom: showHeader ? '12px' : '2px',
        alignItems: 'flex-end',
      }}
    >
      {/* Avatar */}
      {!isSelf && showHeader && (
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 800,
            color: '#1e1e2e',
            flexShrink: 0,
          }}
        >
          {msg.username.charAt(0).toUpperCase()}
        </div>
      )}
      {/* Spacer for consecutive messages */}
      {!isSelf && !showHeader && <div style={{ width: '28px', flexShrink: 0 }} />}

      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start' }}>
        {showHeader && (
          <div style={{ fontSize: '0.7rem', color: isSelf ? '#6c7086' : color, marginBottom: '3px', fontWeight: 600 }}>
            {isSelf ? 'You' : msg.username}
            <span style={{ color: '#45475a', fontWeight: 400, marginLeft: '6px' }}>{formatTime(msg.timestamp)}</span>
          </div>
        )}
        <div
          style={{
            padding: '8px 12px',
            borderRadius: isSelf
              ? '16px 16px 4px 16px'
              : '16px 16px 16px 4px',
            backgroundColor: isSelf ? '#89b4fa' : '#313244',
            color: isSelf ? '#1e1e2e' : '#cdd6f4',
            fontSize: '0.85rem',
            lineHeight: '1.5',
            wordBreak: 'break-word',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        >
          {msg.message}
        </div>
      </div>
    </div>
  );
});
MessageBubble.displayName = 'MessageBubble';

// ─── Props ─────────────────────────────────────────────────────────────────────
interface ChatPanelProps {
  socket: Socket | null;
  workspaceId: string;
  currentUserId: string;
  onlineCount: number;
  onClose: () => void;
}

// ─── Chat Panel ────────────────────────────────────────────────────────────────
export const ChatPanel: React.FC<ChatPanelProps> = ({
  socket,
  workspaceId,
  currentUserId,
  onlineCount,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [input, setInput] = useState('');
  const [hasUnread, setHasUnread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFocusedRef = useRef(true);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg: ChatMessageDto) => {
      setMessages((prev) => [...prev, msg]);
      if (!isFocusedRef.current && msg.userId !== currentUserId) {
        setHasUnread(true);
      }
    };

    socket.on(SOCKET_EVENTS.CHAT.NEW_MESSAGE, handleMessage);
    return () => { socket.off(SOCKET_EVENTS.CHAT.NEW_MESSAGE, handleMessage); };
  }, [socket, currentUserId]);

  const sendMessage = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || !socket) return;

    socket.emit(SOCKET_EVENTS.CHAT.SEND_MESSAGE, {
      workspaceId,
      message: trimmed,
    });

    setInput('');
  }, [input, socket, workspaceId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: '320px',
        backgroundColor: '#1e1e2e',
        borderLeft: '1px solid rgba(137,180,250,0.12)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 150,
        boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div
        style={{
          height: '54px',
          backgroundColor: '#181825',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Hash size={16} style={{ color: '#89b4fa' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Room Chat</div>
            <div style={{ fontSize: '0.7rem', color: '#585b70', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#a6e3a1', display: 'inline-block' }} />
              {onlineCount} online
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: '#6c7086', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#f38ba8')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#6c7086')}
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        onFocus={() => { isFocusedRef.current = true; setHasUnread(false); }}
        onBlur={() => { isFocusedRef.current = false; }}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          scrollbarWidth: 'thin',
          scrollbarColor: '#313244 transparent',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#45475a',
              gap: '8px',
              textAlign: 'center',
            }}
          >
            <MessageSquare size={36} style={{ opacity: 0.4 }} />
            <div style={{ fontSize: '0.85rem' }}>No messages yet</div>
            <div style={{ fontSize: '0.75rem', color: '#313244' }}>
              Start collaborating with your team!
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isSelf={msg.userId === currentUserId}
              prevMsg={messages[idx - 1]}
            />
          ))
        )}
      </div>

      {/* Input area */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          backgroundColor: '#181825',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#313244',
            borderRadius: '12px',
            padding: '6px 6px 6px 14px',
            border: '1px solid rgba(137,180,250,0.12)',
          }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Message the room..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={500}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#cdd6f4',
              fontSize: '0.85rem',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: input.trim() ? '#89b4fa' : '#45475a',
              border: 'none',
              color: '#1e1e2e',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease',
              flexShrink: 0,
            }}
          >
            <Send size={14} />
          </button>
        </div>
        <div style={{ fontSize: '0.65rem', color: '#45475a', marginTop: '4px', textAlign: 'right' }}>
          {input.length}/500 · Press Enter to send
        </div>
      </div>
    </div>
  );
};
