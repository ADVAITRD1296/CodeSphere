import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS, UserPresence } from '@codesphere/shared';
import type { editor } from 'monaco-editor';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export function usePresence(
  workspaceId: string | null,
  userId?: string,
  username?: string,
  activeFileId?: string,
  editorInstance?: editor.IStandaloneCodeEditor | null
) {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const socketRef = useRef<Socket | null>(null);

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
        activeFileId
      });
    });

    socket.on(SOCKET_EVENTS.PRESENCE.ROOM_STATE, (users: UserPresence[]) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [workspaceId, userId, username]);

  // Track Monaco Cursor Movements and emit to server
  useEffect(() => {
    if (!editorInstance || !socketRef.current) return;

    const disposable = editorInstance.onDidChangeCursorPosition((e) => {
      const cursor = { line: e.position.lineNumber, column: e.position.column };
      socketRef.current?.emit(SOCKET_EVENTS.PRESENCE.UPDATE, {
        cursor,
        activeFileId
      });
    });

    return () => {
      disposable.dispose();
    };
  }, [editorInstance, activeFileId]);

  return { onlineUsers, socket: socketRef.current };
}
