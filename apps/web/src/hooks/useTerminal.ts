import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { SOCKET_EVENTS, ProgrammingLanguage } from '@codesphere/shared';

export interface TerminalLine {
  id: string;
  type: 'stdout' | 'stderr' | 'info' | 'system' | 'stdin';
  content: string;
  timestamp: number;
}

export interface TerminalSession {
  executionId: string;
  startedAt: number;
  isRunning: boolean;
  exitCode?: number;
  durationMs?: number;
}

export function useTerminal(socket: Socket | null) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [session, setSession] = useState<TerminalSession | null>(null);
  const [isRunningState, setIsRunningState] = useState(false);
  // True only when the backend signals the process is blocked on stdin
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const isRunningRef = useRef(false);
  const currentExecutionIdRef = useRef<string | null>(null);

  const addLine = useCallback((type: TerminalLine['type'], content: string) => {
    setLines((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2),
        type,
        content,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const clearTerminal = useCallback(() => {
    setLines([]);
    setSession(null);
    setIsWaitingForInput(false);
    currentExecutionIdRef.current = null;
  }, []);

  const runCode = useCallback(
    (language: ProgrammingLanguage, code: string) => {
      if (!socket) {
        console.warn('[Terminal] Cannot execute code: socket disconnected');
        return;
      }

      clearTerminal();
      isRunningRef.current = true;
      setIsRunningState(true);
      setIsWaitingForInput(false);

      const timestamp = new Date().toLocaleTimeString();
      setLines([
        {
          id: 'system-start',
          type: 'system',
          content: `\x1b[90m[${timestamp}] Executing ${language} code\u2026\x1b[0m`,
          timestamp: Date.now(),
        },
      ]);

      socket.emit(SOCKET_EVENTS.EXECUTION.SUBMIT, { language, code });
    },
    [socket, clearTerminal]
  );

  /**
   * Send a line of stdin input to the currently running process.
   * Also echoes the input visually and clears the waiting-for-input state.
   */
  const sendInput = useCallback(
    (input: string) => {
      const execId = currentExecutionIdRef.current || session?.executionId;
      if (!socket || !execId || !isRunningRef.current) return;

      // Clear the waiting state immediately – process is now consuming our input
      setIsWaitingForInput(false);

      // Echo the typed input in the terminal so it feels like a real terminal
      setLines((prev) => [
        ...prev,
        {
          id: `stdin-${Date.now()}`,
          type: 'stdin',
          content: `\x1b[36m\u276f ${input}\x1b[0m`,
          timestamp: Date.now(),
        },
      ]);

      socket.emit(SOCKET_EVENTS.EXECUTION.INPUT, { executionId: execId, input });
    },
    [socket, session?.executionId]
  );

  /**
   * Send a SIGKILL to the currently running process.
   */
  const killExecution = useCallback(() => {
    const execId = currentExecutionIdRef.current || session?.executionId;
    if (!socket || !execId || !isRunningRef.current) return;
    setIsWaitingForInput(false);
    socket.emit(SOCKET_EVENTS.EXECUTION.KILL, { executionId: execId });
  }, [socket, session?.executionId]);

  useEffect(() => {
    if (!socket) return;

    const handleStdout = ({ executionId, chunk }: { executionId: string; chunk: string }) => {
      // New output means process is not waiting for input right now
      setIsWaitingForInput(false);

      // Track the current running executionId for stdin / kill
      currentExecutionIdRef.current = executionId;

      // Split multi-line chunks but preserve ANSI codes
      const parts = chunk.split('\n');
      parts.forEach((part, idx) => {
        // Don't add empty trailing line from split
        if (idx === parts.length - 1 && part === '') return;
        setLines((prev) => [
          ...prev,
          {
            id: `${executionId}-out-${Date.now()}-${idx}`,
            type: 'stdout',
            content: part,
            timestamp: Date.now(),
          },
        ]);
      });

      setSession((prev) => prev || { executionId, startedAt: Date.now(), isRunning: true });
    };

    const handleStderr = ({ executionId, chunk }: { executionId: string; chunk: string }) => {
      setIsWaitingForInput(false);
      currentExecutionIdRef.current = executionId;

      const parts = chunk.split('\n');
      parts.forEach((part, idx) => {
        if (idx === parts.length - 1 && part === '') return;
        setLines((prev) => [
          ...prev,
          {
            id: `${executionId}-err-${Date.now()}-${idx}`,
            type: 'stderr',
            content: part,
            timestamp: Date.now(),
          },
        ]);
      });

      setSession((prev) => prev || { executionId, startedAt: Date.now(), isRunning: true });
    };

    const handleWaitingInput = ({ executionId }: { executionId: string }) => {
      // Backend confirmed the process is blocked on stdin — show the prompt
      if (currentExecutionIdRef.current === executionId && isRunningRef.current) {
        setIsWaitingForInput(true);
      }
    };

    const handleComplete = ({
      executionId,
      exitCode,
      durationMs,
    }: {
      executionId: string;
      exitCode: number;
      durationMs: number;
    }) => {
      isRunningRef.current = false;
      setIsRunningState(false);
      setIsWaitingForInput(false);
      currentExecutionIdRef.current = null;
      setSession((prev) =>
        prev ? { ...prev, isRunning: false, exitCode, durationMs } : null
      );

      const statusColor = exitCode === 0 ? '\x1b[32m' : '\x1b[31m';
      const statusText = exitCode === 0 ? '\u2713 Exited successfully' : `\u2717 Exited with code ${exitCode}`;
      setLines((prev) => [
        ...prev,
        {
          id: `${executionId}-done`,
          type: 'system',
          content: `${statusColor}${statusText}\x1b[90m  (${durationMs}ms)\x1b[0m`,
          timestamp: Date.now(),
        },
      ]);
    };

    socket.on(SOCKET_EVENTS.EXECUTION.STDOUT, handleStdout);
    socket.on(SOCKET_EVENTS.EXECUTION.STDERR, handleStderr);
    socket.on(SOCKET_EVENTS.EXECUTION.COMPLETE, handleComplete);
    socket.on(SOCKET_EVENTS.EXECUTION.WAITING_INPUT, handleWaitingInput);

    return () => {
      socket.off(SOCKET_EVENTS.EXECUTION.STDOUT, handleStdout);
      socket.off(SOCKET_EVENTS.EXECUTION.STDERR, handleStderr);
      socket.off(SOCKET_EVENTS.EXECUTION.COMPLETE, handleComplete);
      socket.off(SOCKET_EVENTS.EXECUTION.WAITING_INPUT, handleWaitingInput);
    };
  }, [socket]);

  return {
    lines,
    session,
    runCode,
    clearTerminal,
    sendInput,
    killExecution,
    isRunning: isRunningState,
    isWaitingForInput,
  };
}
