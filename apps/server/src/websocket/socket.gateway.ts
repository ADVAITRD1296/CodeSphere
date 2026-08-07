import { Server as SocketIOServer, Socket } from 'socket.io';
import http from 'http';
import { spawn, spawnSync, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { SOCKET_EVENTS, ChatMessageDto, ProgrammingLanguage, LineLockInfo, WhiteboardElement } from '@codesphere/shared';


// Map executionId -> running child process for stdin forwarding
const runningProcesses = new Map<string, ChildProcess>();

interface RoomUser {
  socketId: string;
  userId: string;
  username: string;
  color: string;
  status: 'ONLINE' | 'IDLE' | 'OFFLINE' | 'IN_VOICE' | 'SHARING_SCREEN';
  activity: 'EDITING' | 'VIEWING' | 'IDLE';
  cursor?: { line: number; column: number };
  activeFileId?: string;
  activeFileName?: string;
  role?: string;
  lastActive: string;
  isInVoice?: boolean;
  isInVideo?: boolean;
}

const roomPresence = new Map<string, Map<string, RoomUser>>();

// Map workspaceId -> Map<lockId, LineLockInfo>
const roomFileLocks = new Map<string, Map<string, LineLockInfo>>();

// Map workspaceId -> WhiteboardElement[]
const roomWhiteboards = new Map<string, WhiteboardElement[]>();


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

function broadcastRoomPresence(io: SocketIOServer, workspaceId: string) {
  const roomMap = roomPresence.get(workspaceId);
  if (!roomMap) return;

  const users = Array.from(roomMap.values());
  const editingCount = users.filter(u => u.activity === 'EDITING').length;
  const viewingCount = users.filter(u => u.activity === 'VIEWING').length;
  const voiceCount = users.filter(u => u.isInVoice || u.status === 'IN_VOICE').length;
  const videoCount = users.filter(u => u.isInVideo || u.status === 'SHARING_SCREEN').length;

  const summary = {
    workspaceId,
    totalOnline: users.filter(u => u.status !== 'OFFLINE').length,
    totalOffline: 0,
    editingCount,
    viewingCount,
    voiceCount,
    videoCount,
    users
  };

  io.to(workspaceId).emit(SOCKET_EVENTS.PRESENCE.ROOM_STATE, summary);
}

function broadcastFileLocks(io: SocketIOServer, workspaceId: string, fileId?: string) {
  const locksMap = roomFileLocks.get(workspaceId);
  const allLocks = locksMap ? Array.from(locksMap.values()) : [];

  if (fileId) {
    const fileLocks = allLocks.filter(l => l.fileId === fileId);
    io.to(workspaceId).emit(SOCKET_EVENTS.LOCK.SYNC, { fileId, locks: fileLocks });
  } else {
    // Broadcast all file locks grouped by fileId
    const fileIds = Array.from(new Set(allLocks.map(l => l.fileId)));
    fileIds.forEach(fid => {
      const fileLocks = allLocks.filter(l => l.fileId === fid);
      io.to(workspaceId).emit(SOCKET_EVENTS.LOCK.SYNC, { fileId: fid, locks: fileLocks });
    });
  }
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

    socket.on(SOCKET_EVENTS.COLLABORATION.JOIN_ROOM, ({ workspaceId, userId, username, activeFileId, activeFileName, role }) => {
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
        status: 'ONLINE',
        activity: 'VIEWING',
        activeFileId,
        activeFileName,
        role: role || 'EDITOR',
        lastActive: new Date().toISOString()
      };

      roomMap.set(socket.id, currentUser);
      broadcastRoomPresence(io, workspaceId);

      // Send existing active line locks to joining user
      if (activeFileId) {
        broadcastFileLocks(io, workspaceId, activeFileId);
      } else {
        broadcastFileLocks(io, workspaceId);
      }

      // Send existing whiteboard canvas state to joining user
      const existingElements = roomWhiteboards.get(workspaceId) || [];
      socket.emit(SOCKET_EVENTS.WHITEBOARD.SYNC, { elements: existingElements });
    });

    // ─── Collaborative Whiteboard Handlers ─────────────────────────────────────
    socket.on(SOCKET_EVENTS.WHITEBOARD.DRAW, ({ element }: { element: WhiteboardElement }) => {
      if (!currentWorkspaceId || !currentUser || !element) return;

      if (!roomWhiteboards.has(currentWorkspaceId)) {
        roomWhiteboards.set(currentWorkspaceId, []);
      }
      const elements = roomWhiteboards.get(currentWorkspaceId)!;
      elements.push(element);

      // Broadcast new element to other room members
      socket.to(currentWorkspaceId).emit(SOCKET_EVENTS.WHITEBOARD.DRAW, { element });
    });

    socket.on(SOCKET_EVENTS.WHITEBOARD.CLEAR, () => {
      if (!currentWorkspaceId || !currentUser) return;
      roomWhiteboards.set(currentWorkspaceId, []);
      io.to(currentWorkspaceId).emit(SOCKET_EVENTS.WHITEBOARD.CLEAR);
    });


    // ─── Line Locking System Handlers ──────────────────────────────────────────
    socket.on(SOCKET_EVENTS.LOCK.REQUEST, ({ fileId, startLine, endLine }) => {
      if (!currentWorkspaceId || !currentUser) return;

      const normStart = Math.min(startLine, endLine);
      const normEnd = Math.max(startLine, endLine);

      if (normStart < 1 || normEnd < 1) {
        socket.emit(SOCKET_EVENTS.LOCK.ERROR, { message: 'Invalid line range requested.' });
        return;
      }

      if (!roomFileLocks.has(currentWorkspaceId)) {
        roomFileLocks.set(currentWorkspaceId, new Map());
      }
      const locksMap = roomFileLocks.get(currentWorkspaceId)!;

      // Check range overlap with existing locks on the same file owned by another user
      const existingLocks = Array.from(locksMap.values()).filter(l => l.fileId === fileId);
      const conflictingLock = existingLocks.find(lock => {
        if (lock.userId === currentUser!.userId) return false; // Allow extending own lock
        return lock.startLine <= normEnd && lock.endLine >= normStart;
      });

      if (conflictingLock) {
        socket.emit(SOCKET_EVENTS.LOCK.ERROR, {
          message: `Lines ${conflictingLock.startLine}–${conflictingLock.endLine} are currently locked by ${conflictingLock.username}.`,
          conflictingLock
        });
        return;
      }

      // Create new line lock record
      const lockId = `lock_${Math.random().toString(36).substring(2, 9)}`;
      const lockInfo = {
        lockId,
        workspaceId: currentWorkspaceId,
        fileId,
        startLine: normStart,
        endLine: normEnd,
        userId: currentUser.userId,
        username: currentUser.username,
        userColor: currentUser.color,
        socketId: socket.id,
        lockedAt: new Date().toISOString()
      };

      locksMap.set(lockId, lockInfo);
      broadcastFileLocks(io, currentWorkspaceId, fileId);
    });

    socket.on(SOCKET_EVENTS.LOCK.RELEASE, ({ fileId, lockId }) => {
      if (!currentWorkspaceId || !currentUser) return;

      const locksMap = roomFileLocks.get(currentWorkspaceId);
      if (locksMap) {
        const lock = locksMap.get(lockId);
        if (lock && (lock.userId === currentUser.userId || lock.socketId === socket.id)) {
          locksMap.delete(lockId);
          broadcastFileLocks(io, currentWorkspaceId, fileId || lock.fileId);
        }
      }
    });

    socket.on(SOCKET_EVENTS.LOCK.FORCE_RELEASE, ({ fileId, lockId }) => {
      if (!currentWorkspaceId || !currentUser) return;

      // Allow room OWNER to force release any lock
      if (currentUser.role === 'OWNER') {
        const locksMap = roomFileLocks.get(currentWorkspaceId);
        if (locksMap && locksMap.has(lockId)) {
          const lock = locksMap.get(lockId)!;
          locksMap.delete(lockId);
          broadcastFileLocks(io, currentWorkspaceId, fileId || lock.fileId);
        }
      }
    });


    socket.on(SOCKET_EVENTS.PRESENCE.UPDATE, ({ cursor, activeFileId, activeFileName, isEditing, status }) => {
      if (currentWorkspaceId && currentUser) {
        if (cursor) currentUser.cursor = cursor;
        if (activeFileId !== undefined) currentUser.activeFileId = activeFileId;
        if (activeFileName !== undefined) currentUser.activeFileName = activeFileName;
        if (isEditing !== undefined) {
          currentUser.activity = isEditing ? 'EDITING' : 'VIEWING';
        }
        if (status) currentUser.status = status;
        currentUser.lastActive = new Date().toISOString();

        const roomMap = roomPresence.get(currentWorkspaceId);
        if (roomMap) {
          roomMap.set(socket.id, currentUser);
          broadcastRoomPresence(io, currentWorkspaceId);
        }
      }
    });

    socket.on(SOCKET_EVENTS.PRESENCE.SET_STATUS, ({ status }) => {
      if (currentWorkspaceId && currentUser) {
        currentUser.status = status;
        currentUser.lastActive = new Date().toISOString();
        broadcastRoomPresence(io, currentWorkspaceId);
      }
    });

    socket.on(SOCKET_EVENTS.PRESENCE.HEARTBEAT, () => {
      if (currentWorkspaceId && currentUser) {
        currentUser.lastActive = new Date().toISOString();
      }
    });

    // ─── WebRTC Voice Signaling Gateway ─────────────────────────────────────
    socket.on(SOCKET_EVENTS.VOICE.JOIN, () => {
      if (currentWorkspaceId && currentUser) {
        currentUser.isInVoice = true;
        currentUser.status = 'IN_VOICE';
        currentUser.lastActive = new Date().toISOString();

        // Get all existing peer socket IDs in the room (excluding joining socket)
        const roomMap = roomPresence.get(currentWorkspaceId);
        const peerSocketIds = roomMap
          ? Array.from(roomMap.values())
              .filter(u => u.socketId !== socket.id && u.isInVoice)
              .map(u => u.socketId)
          : [];

        // Notify joining user with existing voice peers
        socket.emit(SOCKET_EVENTS.VOICE.PEER_JOINED, { peers: peerSocketIds });

        // Notify existing voice peers that new user joined voice
        socket.to(currentWorkspaceId).emit(SOCKET_EVENTS.VOICE.PEER_JOINED, {
          peerSocketId: socket.id,
          userId: currentUser.userId,
          username: currentUser.username
        });

        broadcastRoomPresence(io, currentWorkspaceId);
      }
    });

    socket.on(SOCKET_EVENTS.VOICE.LEAVE, () => {
      if (currentWorkspaceId && currentUser) {
        currentUser.isInVoice = false;
        currentUser.status = 'ONLINE';
        currentUser.lastActive = new Date().toISOString();

        socket.to(currentWorkspaceId).emit(SOCKET_EVENTS.VOICE.PEER_LEFT, {
          peerSocketId: socket.id
        });

        broadcastRoomPresence(io, currentWorkspaceId);
      }
    });

    socket.on(SOCKET_EVENTS.VOICE.SIGNAL, ({ targetSocketId, signal }) => {
      // Direct peer-to-peer WebRTC SDP / ICE signaling relay (audio data NEVER touches server)
      io.to(targetSocketId).emit(SOCKET_EVENTS.VOICE.SIGNAL, {
        senderSocketId: socket.id,
        signal
      });
    });

    socket.on(SOCKET_EVENTS.VOICE.STATE_UPDATE, ({ isMuted, isSpeaking, volume }) => {
      if (currentWorkspaceId && currentUser) {
        socket.to(currentWorkspaceId).emit(SOCKET_EVENTS.VOICE.STATE_UPDATE, {
          socketId: socket.id,
          userId: currentUser.userId,
          username: currentUser.username,
          isMuted,
          isSpeaking,
          volume
        });
      }
    });

    // ─── WebRTC Video Signaling Gateway ─────────────────────────────────────
    socket.on(SOCKET_EVENTS.VIDEO.JOIN, () => {
      if (currentWorkspaceId && currentUser) {
        currentUser.isInVideo = true;
        currentUser.status = 'SHARING_SCREEN';
        currentUser.lastActive = new Date().toISOString();

        // Get all existing peer socket IDs in video conference
        const roomMap = roomPresence.get(currentWorkspaceId);
        const peerSocketIds = roomMap
          ? Array.from(roomMap.values())
              .filter(u => u.socketId !== socket.id && u.isInVideo)
              .map(u => u.socketId)
          : [];

        // Notify joining user with existing video peers
        socket.emit(SOCKET_EVENTS.VIDEO.PEER_JOINED, { peers: peerSocketIds });

        // Notify existing video peers that new user joined video
        socket.to(currentWorkspaceId).emit(SOCKET_EVENTS.VIDEO.PEER_JOINED, {
          peerSocketId: socket.id,
          userId: currentUser.userId,
          username: currentUser.username
        });

        broadcastRoomPresence(io, currentWorkspaceId);
      }
    });

    socket.on(SOCKET_EVENTS.VIDEO.LEAVE, () => {
      if (currentWorkspaceId && currentUser) {
        currentUser.isInVideo = false;
        if (currentUser.status === 'SHARING_SCREEN') {
          currentUser.status = 'ONLINE';
        }
        currentUser.lastActive = new Date().toISOString();

        socket.to(currentWorkspaceId).emit(SOCKET_EVENTS.VIDEO.PEER_LEFT, {
          peerSocketId: socket.id
        });

        broadcastRoomPresence(io, currentWorkspaceId);
      }
    });

    socket.on(SOCKET_EVENTS.VIDEO.SIGNAL, ({ targetSocketId, signal }) => {
      // Direct WebRTC SDP / ICE candidate relay for Video & Screen Sharing tracks
      io.to(targetSocketId).emit(SOCKET_EVENTS.VIDEO.SIGNAL, {
        senderSocketId: socket.id,
        signal
      });
    });

    socket.on(SOCKET_EVENTS.VIDEO.STATE_UPDATE, ({ isCameraOn, isMicOn, isScreenSharing, activeDeviceId }) => {
      if (currentWorkspaceId && currentUser) {
        socket.to(currentWorkspaceId).emit(SOCKET_EVENTS.VIDEO.STATE_UPDATE, {
          socketId: socket.id,
          userId: currentUser.userId,
          username: currentUser.username,
          isCameraOn,
          isMicOn,
          isScreenSharing,
          activeDeviceId
        });
      }
    });

    socket.on(SOCKET_EVENTS.VOICE.CALL_INCOMING, () => {
      if (currentWorkspaceId && currentUser) {
        socket.to(currentWorkspaceId).emit(SOCKET_EVENTS.VOICE.CALL_INCOMING, {
          callerSocketId: socket.id,
          callerUserId: currentUser.userId,
          callerUsername: currentUser.username,
          callType: 'VOICE'
        });
      }
    });

    socket.on(SOCKET_EVENTS.VIDEO.CALL_INCOMING, () => {
      if (currentWorkspaceId && currentUser) {
        socket.to(currentWorkspaceId).emit(SOCKET_EVENTS.VIDEO.CALL_INCOMING, {
          callerSocketId: socket.id,
          callerUserId: currentUser.userId,
          callerUsername: currentUser.username,
          callType: 'VIDEO'
        });
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
        const spawnAndStream = (cmd: string, args: string[], label: string, isFinalStep = true) => {
          return new Promise<number>((resolve) => {
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
              if (isFinalStep) {
                socket.emit(SOCKET_EVENTS.EXECUTION.COMPLETE, { executionId, exitCode: 1, durationMs: Date.now() - startTime });
              }
              resolve(1);
            });
            proc.on('close', (exitCode) => {
              clearTimeout(timer);
              runningProcesses.delete(executionId);
              const durationMs = Date.now() - startTime;
              if (isFinalStep || exitCode !== 0) {
                socket.emit(SOCKET_EVENTS.EXECUTION.COMPLETE, { executionId, exitCode: exitCode || 0, durationMs });
              }
              resolve(exitCode || 0);
            });
          });
        };

        switch (language) {
          case 'JAVASCRIPT':
            await spawnAndStream('node', [filePath], 'host runtime', true);
            break;
          case 'TYPESCRIPT':
            await spawnAndStream('npx', ['tsx', filePath], 'host runtime', true);
            break;
          case 'PYTHON':
            await spawnAndStream('python3', [filePath], 'host runtime', true);
            break;
          case 'CPP': {
            const compileCode = await spawnAndStream('g++', [filePath, '-o', `${tempDir}/app`], 'host compile', false);
            if (compileCode === 0) {
              await spawnAndStream(`${tempDir}/app`, [], 'host runtime', true);
            }
            break;
          }
          case 'GO':
            await spawnAndStream('go', ['run', filePath], 'host runtime', true);
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
      if (currentWorkspaceId) {
        // Clean up locks held by disconnecting socket
        const locksMap = roomFileLocks.get(currentWorkspaceId);
        if (locksMap) {
          const affectedFileIds = new Set<string>();
          for (const [lockId, lock] of locksMap.entries()) {
            if (lock.socketId === socket.id) {
              affectedFileIds.add(lock.fileId);
              locksMap.delete(lockId);
            }
          }
          affectedFileIds.forEach(fid => broadcastFileLocks(io, currentWorkspaceId!, fid));
        }

        if (roomPresence.has(currentWorkspaceId)) {
          const roomMap = roomPresence.get(currentWorkspaceId)!;
          roomMap.delete(socket.id);

          if (roomMap.size === 0) {
            roomPresence.delete(currentWorkspaceId);
            roomFileLocks.delete(currentWorkspaceId);
            roomWhiteboards.delete(currentWorkspaceId);
          } else {
            broadcastRoomPresence(io, currentWorkspaceId);
          }

        }
      }
    });

  });

  return io;
}
