import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { SOCKET_EVENTS, WhiteboardElement } from '@codesphere/shared';

export function useWhiteboard(
  workspaceId: string | null,
  socket: Socket | null
) {
  const [elements, setElements] = useState<WhiteboardElement[]>([]);

  useEffect(() => {
    if (!socket || !workspaceId) {
      setElements([]);
      return;
    }

    const handleSync = (data: { elements: WhiteboardElement[] }) => {
      setElements(data.elements || []);
    };

    const handleDraw = (data: { element: WhiteboardElement }) => {
      if (data?.element) {
        setElements((prev) => [...prev, data.element]);
      }
    };

    const handleClear = () => {
      setElements([]);
    };

    socket.on(SOCKET_EVENTS.WHITEBOARD.SYNC, handleSync);
    socket.on(SOCKET_EVENTS.WHITEBOARD.DRAW, handleDraw);
    socket.on(SOCKET_EVENTS.WHITEBOARD.CLEAR, handleClear);

    return () => {
      socket.off(SOCKET_EVENTS.WHITEBOARD.SYNC, handleSync);
      socket.off(SOCKET_EVENTS.WHITEBOARD.DRAW, handleDraw);
      socket.off(SOCKET_EVENTS.WHITEBOARD.CLEAR, handleClear);
    };
  }, [socket, workspaceId]);

  const addElement = useCallback((element: WhiteboardElement) => {
    setElements((prev) => [...prev, element]);
    if (socket && workspaceId) {
      socket.emit(SOCKET_EVENTS.WHITEBOARD.DRAW, { element });
    }
  }, [socket, workspaceId]);

  const clearWhiteboard = useCallback(() => {
    setElements([]);
    if (socket && workspaceId) {
      socket.emit(SOCKET_EVENTS.WHITEBOARD.CLEAR);
    }
  }, [socket, workspaceId]);

  return {
    elements,
    addElement,
    clearWhiteboard
  };
}
