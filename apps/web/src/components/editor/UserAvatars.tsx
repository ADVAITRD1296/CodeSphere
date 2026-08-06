'use client';

import React from 'react';
import { UserPresence, PresenceStatus } from '@codesphere/shared';

interface UserAvatarsProps {
  onlineUsers: UserPresence[];
  currentUserId?: string;
  onTogglePresenceSidebar?: () => void;
}

export const UserAvatars: React.FC<UserAvatarsProps> = ({
  onlineUsers,
  currentUserId,
  onTogglePresenceSidebar
}) => {
  const getStatusColor = (status?: PresenceStatus) => {
    switch (status) {
      case 'ONLINE': return '#10b981'; // 🟢
      case 'IDLE': return '#f59e0b'; // 🟡
      case 'OFFLINE': return '#6b7280'; // 🔴
      case 'IN_VOICE': return '#8b5cf6'; // 🟣
      case 'SHARING_SCREEN': return '#3b82f6'; // 🔵
      default: return '#10b981';
    }
  };

  return (
    <div
      onClick={onTogglePresenceSidebar}
      title="Click to view presence members list"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        cursor: 'pointer',
        padding: '2px 6px',
        borderRadius: '16px',
        backgroundColor: '#181825',
        border: '1px solid #313244'
      }}
    >
      {onlineUsers.slice(0, 5).map(user => {
        const isSelf = user.userId === currentUserId;
        const statusColor = getStatusColor(user.status);

        return (
          <div
            key={user.userId}
            title={`${user.username}${isSelf ? ' (You)' : ''} - ${user.status || 'ONLINE'} - ${user.activity || 'VIEWING'}`}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: user.color || '#3b82f6',
              color: '#11111b',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: isSelf ? '2px solid #89b4fa' : '2px solid #181825',
            }}
          >
            {user.username.charAt(0).toUpperCase()}
            {/* Status Dot */}
            <span
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: statusColor,
                border: '1px solid #181825'
              }}
            />
          </div>
        );
      })}

      {onlineUsers.length > 5 && (
        <div style={{
          fontSize: '0.72rem',
          color: '#a6adc8',
          fontWeight: 600,
          paddingRight: '4px'
        }}>
          +{onlineUsers.length - 5}
        </div>
      )}
    </div>
  );
};
