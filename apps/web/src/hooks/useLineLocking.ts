import { useEffect, useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { SOCKET_EVENTS, LineLockInfo } from '@codesphere/shared';

export function useLineLocking(
  workspaceId: string | null,
  fileId: string | null,
  socket: Socket | null,
  currentUserId?: string
) {
  const [locks, setLocks] = useState<LineLockInfo[]>([]);
  const [lockError, setLockError] = useState<string | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync locks on socket updates
  useEffect(() => {
    if (!socket || !workspaceId || !fileId) {
      setLocks([]);
      return;
    }

    const handleLockSync = (data: { fileId: string; locks: LineLockInfo[] }) => {
      if (data.fileId === fileId) {
        setLocks(data.locks || []);
      }
    };

    const handleLockError = (data: { message: string }) => {
      setLockError(data.message);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = setTimeout(() => {
        setLockError(null);
      }, 4000);
    };

    socket.on(SOCKET_EVENTS.LOCK.SYNC, handleLockSync);
    socket.on(SOCKET_EVENTS.LOCK.ERROR, handleLockError);

    // Request initial lock state for active file
    socket.emit(SOCKET_EVENTS.LOCK.REQUEST, { fileId, startLine: 0, endLine: 0 }); // query trigger

    return () => {
      socket.off(SOCKET_EVENTS.LOCK.SYNC, handleLockSync);
      socket.off(SOCKET_EVENTS.LOCK.ERROR, handleLockError);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, [socket, workspaceId, fileId]);

  const requestLock = useCallback((startLine: number, endLine: number) => {
    if (!socket || !fileId || !workspaceId) return;
    socket.emit(SOCKET_EVENTS.LOCK.REQUEST, { fileId, startLine, endLine });
  }, [socket, fileId, workspaceId]);

  const releaseLock = useCallback((lockId: string) => {
    if (!socket || !fileId) return;
    socket.emit(SOCKET_EVENTS.LOCK.RELEASE, { fileId, lockId });
  }, [socket, fileId]);

  const forceReleaseLock = useCallback((lockId: string) => {
    if (!socket || !fileId) return;
    socket.emit(SOCKET_EVENTS.LOCK.FORCE_RELEASE, { fileId, lockId });
  }, [socket, fileId]);

  const isRangeLockedByOther = useCallback((
    startLine: number,
    endLine: number,
    userId?: string
  ): LineLockInfo | null => {
    const targetUid = userId || currentUserId;
    const normStart = Math.min(startLine, endLine);
    const normEnd = Math.max(startLine, endLine);

    const match = locks.find(l => {
      if (l.userId === targetUid) return false;
      return l.startLine <= normEnd && l.endLine >= normStart;
    });

    return match || null;
  }, [locks, currentUserId]);

  const myLocks = locks.filter(l => l.userId === currentUserId);
  const otherLocks = locks.filter(l => l.userId !== currentUserId);

  return {
    locks,
    myLocks,
    otherLocks,
    lockError,
    requestLock,
    releaseLock,
    forceReleaseLock,
    isRangeLockedByOther
  };
}
