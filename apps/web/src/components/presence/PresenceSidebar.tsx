'use client';

import React, { useState } from 'react';
import { RoomPresenceSummary, UserPresence, PresenceStatus } from '@codesphere/shared';
import { Users, Eye, Edit3, Mic, Video, Circle, Shield, FileText, ChevronDown, ChevronRight } from 'lucide-react';

interface PresenceSidebarProps {
  summary: RoomPresenceSummary;
  currentUserId?: string;
  onSelectUser?: (user: UserPresence) => void;
}

export const PresenceSidebar: React.FC<PresenceSidebarProps> = ({ summary, currentUserId, onSelectUser }) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'EDITING' | 'VOICE'>('ALL');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getStatusColor = (status: PresenceStatus) => {
    switch (status) {
      case 'ONLINE': return '#10b981'; // 🟢 Green
      case 'IDLE': return '#f59e0b'; // 🟡 Yellow
      case 'OFFLINE': return '#6b7280'; // 🔴 Gray
      case 'IN_VOICE': return '#8b5cf6'; // 🟣 Purple
      case 'SHARING_SCREEN': return '#3b82f6'; // 🔵 Blue
      default: return '#10b981';
    }
  };

  const getStatusLabel = (status: PresenceStatus) => {
    switch (status) {
      case 'ONLINE': return 'Online';
      case 'IDLE': return 'Idle';
      case 'OFFLINE': return 'Offline';
      case 'IN_VOICE': return 'In Voice Call';
      case 'SHARING_SCREEN': return 'Sharing Screen';
      default: return 'Online';
    }
  };

  const users = summary.users || [];

  return (
    <div style={{
      width: '260px',
      backgroundColor: '#11111b',
      borderLeft: '1px solid #1e1e2e',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      color: '#cdd6f4',
      fontSize: '0.85rem'
    }}>
      {/* Header Stat Overview Bar */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid #1e1e2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#181825'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#f5e0dc' }}>
          <Users size={16} color="#89b4fa" />
          <span>Members</span>
          <span style={{
            backgroundColor: '#313244',
            padding: '2px 7px',
            borderRadius: '10px',
            fontSize: '0.75rem',
            color: '#a6e3a1'
          }}>
            {summary.totalOnline}
          </span>
        </div>
      </div>

      {/* Metric Badges Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '6px',
        padding: '10px 14px',
        borderBottom: '1px solid #1e1e2e',
        backgroundColor: '#11111b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#a6e3a1' }}>
          <Edit3 size={13} />
          <span>Editing: <strong>{summary.editingCount}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#89dceb' }}>
          <Eye size={13} />
          <span>Viewing: <strong>{summary.viewingCount}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#cba6f7' }}>
          <Mic size={13} />
          <span>Voice: <strong>{summary.voiceCount}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#74c7ec' }}>
          <Video size={13} />
          <span>Video: <strong>{summary.videoCount}</strong></span>
        </div>
      </div>

      {/* Online Member List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: '#6c7086',
          marginBottom: '8px',
          paddingLeft: '4px'
        }}>
          Active Members ({users.length})
        </div>

        {users.length === 0 ? (
          <div style={{ padding: '16px 8px', textAlign: 'center', color: '#6c7086', fontSize: '0.8rem' }}>
            No active members online
          </div>
        ) : (
          users.map((user) => {
            const isSelf = user.userId === currentUserId;
            const statusColor = getStatusColor(user.status);

            return (
              <div
                key={user.userId}
                onClick={() => onSelectUser && onSelectUser(user)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  marginBottom: '4px',
                  backgroundColor: isSelf ? '#1e1e2e' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  border: isSelf ? '1px solid #313244' : '1px solid transparent'
                }}
                onMouseEnter={(e) => {
                  if (!isSelf) e.currentTarget.style.backgroundColor = '#181825';
                }}
                onMouseLeave={(e) => {
                  if (!isSelf) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {/* Avatar with Status Dot */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: user.color || '#89b4fa',
                    color: '#11111b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>

                  {/* Status Indicator Badge */}
                  <span style={{
                    position: 'absolute',
                    bottom: '-1px',
                    right: '-1px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: statusColor,
                    border: '2px solid #11111b'
                  }} title={getStatusLabel(user.status)} />
                </div>

                {/* User Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontWeight: 600,
                      color: isSelf ? '#89b4fa' : '#cdd6f4',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: '0.82rem'
                    }}>
                      {user.username} {isSelf && '(You)'}
                    </span>
                    {user.role && (
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: '#313244',
                        color: '#a6adc8',
                        marginLeft: '4px'
                      }}>
                        {user.role}
                      </span>
                    )}
                  </div>

                  {/* Current Activity / Active File */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    color: user.activity === 'EDITING' ? '#a6e3a1' : '#89dceb',
                    marginTop: '2px'
                  }}>
                    {user.activity === 'EDITING' ? (
                      <>
                        <Edit3 size={11} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Editing {user.activeFileName || 'code'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Eye size={11} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Viewing {user.activeFileName || 'workspace'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
