'use client';

import React from 'react';
import { UserPresence } from '@codesphere/shared';

interface UserAvatarsProps {
  onlineUsers: UserPresence[];
  currentUserId?: string;
}

export const UserAvatars: React.FC<UserAvatarsProps> = ({ onlineUsers, currentUserId }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {onlineUsers.map(user => {
        const isSelf = user.userId === currentUserId;
        return (
          <div
            key={user.userId}
            title={`${user.username}${isSelf ? ' (You)' : ''}`}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: user.color || '#3b82f6',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 700,
              boxShadow: `0 0 8px ${user.color || '#3b82f6'}80`,
              border: isSelf ? '2px solid #ffffff' : '2px solid #181825',
              cursor: 'pointer'
            }}
          >
            {user.username.charAt(0).toUpperCase()}
            {/* Green Online Pulsing Indicator */}
            <span
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                border: '1px solid #181825'
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
