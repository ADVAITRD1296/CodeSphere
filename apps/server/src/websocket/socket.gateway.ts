import { Server as SocketIOServer, Socket } from 'socket.io';
import http from 'http';
import { spawn, spawnSync, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { SOCKET_EVENTS, ChatMessageDto, ProgrammingLanguage } from '@codesphere/shared';

// Map executionId -> running child process for stdin forwarding
const runningProcesses = new Map<string, ChildProcess>();

interface RoomUser {
  socketId: string;
  userId: string;
  username: string;
  color: string;
  cursor?: { line: number; column: number };
  activeFileId?: string;
}

const roomPresence = new Map<string, Map<string, RoomUser>>();

const PRESET_COLORS = [
  '#f38ba8', '#fab387', '#f9e2af', '#a6e3a1', '#94e2d5', '#89dceb', '#74c7ec', '#89b4fa', '#cba6f7'
];

function getRandomColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PRESET_COLORS.length;
  return PRESET_COLORS[index];
}

export function setupSocketGateway(server: http.Server) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'development' ? true : process.env.CLIENT_URL,
      credentials: true
    }
  });

  io.on('connection', (socket: Socket) => {
    let currentWorkspaceId: string | null = null;
    let currentUser: RoomUser | null = null;

    socket.on(SOCKET_EVENTS.COLLABORATION.JOIN_ROOM, ({ workspaceId, userId, username, activeFileId }) => {
      currentWorkspaceId = workspaceId;
      socket.join(workspaceId);

      if (!roomPresence.has(workspaceId)) {
        roomPresence.set(workspaceId, new Map());
      }

      const roomMap = roomPresence.get(workspaceId)!;
      currentUser = {
        socketId: socket.id,
        userId,
        username,
        color: getRandomColor(userId),
        activeFileId
      };

      roomMap.set(socket.id, currentUser);

      // Broadcast current room presence to all clients in room
      const activeUsers = Array.from(roomMap.values());
      io.to(workspaceId).emit(SOCKET_EVENTS.PRESENCE.ROOM_STATE, activeUsers);
    });

    socket.on(SOCKET_EVENTS.PRESENCE.UPDATE, ({ cursor, activeFileId }) => {
      if (currentWorkspaceId && currentUser) {
        currentUser.cursor = cursor;
        if (activeFileId) currentUser.activeFileId = activeFileId;

        const roomMap = roomPresence.get(currentWorkspaceId);
        if (roomMap) {
          roomMap.set(socket.id, currentUser);
          const activeUsers = Array.from(roomMap.values());
          socket.to(currentWorkspaceId).emit(SOCKET_EVENTS.PRESENCE.ROOM_STATE, activeUsers);
        }
      }
    });

    socket.on(SOCKET_EVENTS.CHAT.SEND_MESSAGE, ({ workspaceId, message }) => {
      if (!currentUser) return;
      const chatMsg: ChatMessageDto = {
        id: Math.random().toString(36).substring(2, 9),
        workspaceId,
        userId: currentUser.userId,
        username: currentUser.username,
        message,
        timestamp: new Date().toISOString()
      };
      io.to(workspaceId).emit(SOCKET_EVENTS.CHAT.NEW_MESSAGE, chatMsg);
    });

    // ─── Live Streaming Execution ─────────────────────────────────────────
    socket.on(SOCKET_EVENTS.EXECUTION.SUBMIT, async ({ language, code }: { language: ProgrammingLanguage; code: string }) => {
      const executionId = Math.random().toString(36).substring(2, 9);
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cs-exec-'));

      let fileName = 'script.js';
      let dockerImage = 'node:20-alpine';
      let runCmd: string[] = ['node', `/code/${fileName}`];

      switch (language) {
        case 'JAVASCRIPT':
          fileName = 'script.js';
          dockerImage = 'node:20-alpine';
          runCmd = ['node', `/code/${fileName}`];
          break;
        case 'TYPESCRIPT':
          fileName = 'script.ts';
          dockerImage = 'node:20-alpine';
          runCmd = ['sh', '-c', `npx -y tsx /code/${fileName}`];
          break;
        case 'PYTHON':
          fileName = 'script.py';
          dockerImage = 'python:3.11-alpine';
          runCmd = ['python3', `/code/${fileName}`];
          break;
        case 'CPP':
          fileName = 'main.cpp';
          dockerImage = 'gcc:12';
          runCmd = ['sh', '-c', `g++ /code/${fileName} -o /tmp/app && /tmp/app`];
          break;
        case 'GO':
          fileName = 'main.go';
          dockerImage = 'golang:1.21-alpine';
          runCmd = ['go', 'run', `/code/${fileName}`];
          break;
      }

      const filePath = path.join(tempDir, fileName);
      try {
        await fs.writeFile(filePath, code, 'utf-8');
      } catch {
        socket.emit(SOCKET_EVENTS.EXECUTION.STDERR, { executionId, chunk: '[Error]: Failed to write temp file\n' });
        socket.emit(SOCKET_EVENTS.EXECUTION.COMPLETE, { executionId, exitCode: 1, durationMs: 0 });
        return;
      }

      const startTime = Date.now();
      let isTimedOut = false;

      // Helper: clean up temp directory
      const cleanup = () => fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

      const runProcess = (cmd: string, args: string[], label: string) => {
        return new Promise<number>((resolve) => {
          socket.emit(SOCKET_EVENTS.EXECUTION.STDOUT, {
            executionId,
            chunk: `\x1b[36m▶ Running ${language} via ${label}…\x1b[0m\n`
          });

          const proc = spawn(cmd, args, { shell: cmd === 'sh', stdio: ['pipe','pipe','pipe'] });
          // Store for stdin forwarding
          runningProcesses.set(executionId, proc);
          const timer = setTimeout(() => { isTimedOut = true; proc.kill('SIGKILL'); }, 5000);

          proc.stdout.on('data', (d: Buffer) => {
            socket.emit(SOCKET_EVENTS.EXECUTION.STDOUT, { executionId, chunk: d.toString() });
          });

          proc.stderr.on('data', (d: Buffer) => {
            socket.emit(SOCKET_EVENTS.EXECUTION.STDERR, { executionId, chunk: d.toString() });
          });

          proc.on('error', (err: Error) => {
            clearTimeout(timer);
            socket.emit(SOCKET_EVENTS.EXECUTION.STDERR, {
              executionId,
              chunk: `\x1b[31m[Error] Failed to start ${label}: ${err.message}\x1b[0m\n`
            });
            socket.emit(SOCKET_EVENTS.EXECUTION.COMPLETE, { executionId, exitCode: 1, durationMs: Date.now() - startTime });
            resolve(1);
          });

          proc.on('close', (exitCode) => {
            clearTimeout(timer);
            runningProcesses.delete(executionId);
            const durationMs = Date.now() - startTime;
            socket.emit(SOCKET_EVENTS.EXECUTION.COMPLETE, { executionId, exitCode: exitCode || 0, durationMs });
            resolve(exitCode || 0);
          });
        });
      };

      // Helper: run code on host when Docker is unavailable
      const runHostExecution = async (): Promise<void> => {
        const spawnAndStream = (cmd: string, args: string[], label: string) => {
          return new Promise<number>((resolve) => {
            // Directly spawn process without emitting running header
            const proc = spawn(cmd, args, { shell: cmd === 'sh', stdio: ['pipe', 'pipe', 'pipe'] });
            runningProcesses.set(executionId, proc);
            const timer = setTimeout(() => { isTimedOut = true; proc.kill('SIGKILL'); }, 5000);

            proc.stdout.on('data', (d: Buffer) => {
              socket.emit(SOCKET_EVENTS.EXECUTION.STDOUT, { executionId, chunk: d.toString() });
            });
            proc.stderr.on('data', (d: Buffer) => {
              socket.emit(SOCKET_EVENTS.EXECUTION.STDERR, { executionId, chunk: d.toString() });
            });
            proc.on('error', (err: Error) => {
              clearTimeout(timer);
              socket.emit(SOCKET_EVENTS.EXECUTION.STDERR, {
                executionId,
                chunk: `\x1b[31m[Error] Failed to start ${label}: ${err.message}\x1b[0m\n`
              });
              socket.emit(SOCKET_EVENTS.EXECUTION.COMPLETE, { executionId, exitCode: 1, durationMs: Date.now() - startTime });
              resolve(1);
            });
            proc.on('close', (exitCode) => {
              clearTimeout(timer);
              runningProcesses.delete(executionId);
              const durationMs = Date.now() - startTime;
              socket.emit(SOCKET_EVENTS.EXECUTION.COMPLETE, { executionId, exitCode: exitCode || 0, durationMs });
              resolve(exitCode || 0);
            });
          });
        };
        switch (language) {
          case 'JAVASCRIPT':
            await spawnAndStream('node', [filePath], 'host runtime');
            break;
          case 'TYPESCRIPT':
            await spawnAndStream('npx', ['tsx', filePath], 'host runtime');
            break;
          case 'PYTHON':
            await spawnAndStream('python3', [filePath], 'host runtime');
            break;
          case 'CPP':
            // Compile then execute
            await spawnAndStream('g++', [filePath, '-o', `${tempDir}/app`], 'host compile');
            await spawnAndStream(`${tempDir}/app`, [], 'host runtime');
            break;
          case 'GO':
            await spawnAndStream('go', ['run', filePath], 'host runtime');
            break;
        }
      };

      // Listen for kill signal from client to terminate execution
      socket.on(SOCKET_EVENTS.EXECUTION.KILL, ({ executionId: killId }: { executionId: string }) => {
        if (runningProcesses.has(killId)) {
          const proc = runningProcesses.get(killId)!;
          proc.kill('SIGKILL');
          runningProcesses.delete(killId);
          socket.emit(SOCKET_EVENTS.EXECUTION.STDERR, {
            executionId: killId,
            chunk: '\x1b[33m[Info] Execution killed by client\n'
          });
          socket.emit(SOCKET_EVENTS.EXECUTION.COMPLETE, { executionId: killId, exitCode: 137, durationMs: Date.now() - startTime });
        }
      });

      socket.on(SOCKET_EVENTS.EXECUTION.INPUT, ({ executionId: inputId, input }: { executionId: string; input: string }) => {
        if (runningProcesses.has(inputId)) {
          const proc = runningProcesses.get(inputId)!;
          if (proc.stdin) {
            proc.stdin.write(input.endsWith('\n') ? input : input + '\n');
          }
        }
      });

      // Determine if Docker is usable before attempting Docker execution
      const dockerAvailable = (() => {
        try {
          const { status } = spawnSync('docker', ['info'], { stdio: 'ignore' });
          return status === 0;
        } catch {
          return false;
        }
      })();

      if (!dockerAvailable) {
        // Docker not available – run directly on host

        await runHostExecution();
        await cleanup();
        return;
      }

      // First, try Docker execution (Docker is available)
      const dockerArgs = [
        'run', '--rm',
        '--network', 'none',
        '--memory', '128m',
        '--cpus', '0.5',
        '--pids-limit', '64',
        '-v', `${tempDir}:/code:ro`,
        dockerImage,
        ...runCmd
      ];



      const dockerProc = spawn('docker', dockerArgs);
      const dockerTimer = setTimeout(() => { isTimedOut = true; dockerProc.kill('SIGKILL'); }, 5000);

      dockerProc.stdout.on('data', (data: Buffer) => {
        socket.emit(SOCKET_EVENTS.EXECUTION.STDOUT, { executionId, chunk: data.toString() });
      });

      dockerProc.stderr.on('data', (data: Buffer) => {
        socket.emit(SOCKET_EVENTS.EXECUTION.STDERR, { executionId, chunk: data.toString() });
      });

      let dockerFailed = false;

      dockerProc.on('error', async (err) => {
        dockerFailed = true;
        // Docker not available — fall back to host execution
        // IMPORTANT: Do NOT delete tempDir here — the fallback process needs the files!
        clearTimeout(dockerTimer);
        isTimedOut = false;



        await runHostExecution();
      });

      dockerProc.on('close', async (exitCode) => {
        clearTimeout(dockerTimer);
        const durationMs = Date.now() - startTime;
        const finalExit = isTimedOut ? 124 : (exitCode || 0);

        if (isTimedOut) {
          socket.emit(SOCKET_EVENTS.EXECUTION.STDERR, {
            executionId,
            chunk: '\x1b[31m[Timeout] Execution exceeded 5 seconds\x1b[0m\n'
          });
        }

        // If Docker exited with a non-zero code and we haven't already fallen back, try host runtime
        if (!dockerFailed && exitCode !== 0) {
  
await runHostExecution();
        } else {
          socket.emit(SOCKET_EVENTS.EXECUTION.COMPLETE, { executionId, exitCode: finalExit, durationMs });
          await cleanup();
        }
      });
    });

    socket.on('disconnect', () => {
        // Ensure any leftover processes are killed on disconnect
        if (currentWorkspaceId && roomPresence.has(currentWorkspaceId)) {
          // No specific process cleanup here; processes are tied to executionId and will be cleaned up via kill or timeout
        }

      if (currentWorkspaceId && roomPresence.has(currentWorkspaceId)) {
        const roomMap = roomPresence.get(currentWorkspaceId)!;
        roomMap.delete(socket.id);

        if (roomMap.size === 0) {
          roomPresence.delete(currentWorkspaceId);
        } else {
          const activeUsers = Array.from(roomMap.values());
          io.to(currentWorkspaceId).emit(SOCKET_EVENTS.PRESENCE.ROOM_STATE, activeUsers);
        }
      }
    });
  });

  return io;
}
