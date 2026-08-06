import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS, UserPresence, RoomPresenceSummary, PresenceStatus } from '@codesphere/shared';
import type { editor } from 'monaco-editor';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export function usePresence(
  workspaceId: string | null,
  userId?: string,
  username?: string,
  activeFileId?: string,
  activeFileName?: string,
  editorInstance?: editor.IStandaloneCodeEditor | null,
  userRole?: string
) {
  const [presenceSummary, setPresenceSummary] = useState<RoomPresenceSummary>({
    workspaceId: workspaceId || '',
    totalOnline: 0,
    totalOffline: 0,
    editingCount: 0,
    viewingCount: 0,
    voiceCount: 0,
    videoCount: 0,
    users: []
  });

  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isEditingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to emit status changes
  const updateStatus = useCallback((status: PresenceStatus) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(SOCKET_EVENTS.PRESENCE.SET_STATUS, { status });
    }
  }, []);

  useEffect(() => {
    if (!workspaceId || !userId || !username) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit(SOCKET_EVENTS.COLLABORATION.JOIN_ROOM, {
        workspaceId,
        userId,
        username,
        activeFileId,
        activeFileName,
        role: userRole || 'EDITOR'
      });
    });

    socket.on(SOCKET_EVENTS.PRESENCE.ROOM_STATE, (data: RoomPresenceSummary | UserPresence[]) => {
      if (Array.isArray(data)) {
        // Fallback backward-compatible list
        setOnlineUsers(data);
        setPresenceSummary({
          workspaceId: workspaceId || '',
          totalOnline: data.length,
          totalOffline: 0,
          editingCount: data.filter(u => u.activity === 'EDITING').length,
          viewingCount: data.filter(u => u.activity === 'VIEWING').length,
          voiceCount: data.filter(u => u.isInVoice).length,
          videoCount: data.filter(u => u.isInVideo).length,
          users: data
        });
      } else {
        setPresenceSummary(data);
        setOnlineUsers(data.users || []);
      }
    });

    // Activity / Idle monitoring (mouse movement & window focus)
    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      // Auto-set status back to ONLINE if user was IDLE
      idleTimerRef.current = setTimeout(() => {
        updateStatus('IDLE');
      }, 120000); // 2 minutes of inactivity -> IDLE
    };

    const handleUserActivity = () => {
      resetIdleTimer();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateStatus('IDLE');
      } else {
        updateStatus('ONLINE');
      }
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [workspaceId, userId, username, updateStatus, userRole]);

  // Track Monaco Cursor Movements and Editing activity
  useEffect(() => {
    if (!editorInstance || !socketRef.current) return;

    const cursorDisposable = editorInstance.onDidChangeCursorPosition((e) => {
      const cursor = { line: e.position.lineNumber, column: e.position.column };
      socketRef.current?.emit(SOCKET_EVENTS.PRESENCE.UPDATE, {
        cursor,
        activeFileId,
        activeFileName,
        isEditing: false
      });
    });

    const modelDisposable = editorInstance.onDidChangeModelContent(() => {
      if (isEditingTimeoutRef.current) clearTimeout(isEditingTimeoutRef.current);

      socketRef.current?.emit(SOCKET_EVENTS.PRESENCE.UPDATE, {
        activeFileId,
        activeFileName,
        isEditing: true
      });

      isEditingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit(SOCKET_EVENTS.PRESENCE.UPDATE, {
          activeFileId,
          activeFileName,
          isEditing: false
        });
      }, 1500); // Reset editing flag after 1.5s of no typing
    });

    return () => {
      cursorDisposable.dispose();
      modelDisposable.dispose();
      if (isEditingTimeoutRef.current) clearTimeout(isEditingTimeoutRef.current);
    };
  }, [editorInstance, activeFileId, activeFileName]);

  return { onlineUsers, presenceSummary, socket: socketRef.current, updateStatus };
}
