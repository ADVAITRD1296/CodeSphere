export const SOCKET_EVENTS = {
  COLLABORATION: {
    JOIN_ROOM: 'collaboration:join-room',
    LEAVE_ROOM: 'collaboration:leave-room',
    SYNC_UPDATE: 'collaboration:sync-update',
  },
  PRESENCE: {
    UPDATE: 'presence:update',
    ROOM_STATE: 'presence:room-state',
    USER_JOINED: 'presence:user-joined',
    USER_LEFT: 'presence:user-left',
    SET_STATUS: 'presence:set-status',
    HEARTBEAT: 'presence:heartbeat',
  },
  VOICE: {
    JOIN: 'voice:join',
    LEAVE: 'voice:leave',
    SIGNAL: 'voice:signal',
    STATE_UPDATE: 'voice:state-update',
    PEER_JOINED: 'voice:peer-joined',
    PEER_LEFT: 'voice:peer-left',
    CALL_INCOMING: 'voice:call-incoming',
    CALL_DECLINED: 'voice:call-declined',
  },
  VIDEO: {
    JOIN: 'video:join',
    LEAVE: 'video:leave',
    SIGNAL: 'video:signal',
    STATE_UPDATE: 'video:state-update',
    PEER_JOINED: 'video:peer-joined',
    PEER_LEFT: 'video:peer-left',
    CALL_INCOMING: 'video:call-incoming',
    CALL_DECLINED: 'video:call-declined',
  },
  EXECUTION: {
    SUBMIT: 'execution:submit',
    STDOUT: 'execution:stdout',
    STDERR: 'execution:stderr',
    COMPLETE: 'execution:complete',
    INPUT: 'execution:input',
    KILL: 'execution:kill',
  },
  CHAT: {
    SEND_MESSAGE: 'chat:send-message',
    NEW_MESSAGE: 'chat:new-message',
  },
  LOCK: {
    REQUEST: 'lock:request',
    RELEASE: 'lock:release',
    FORCE_RELEASE: 'lock:force-release',
    SYNC: 'lock:sync',
    ERROR: 'lock:error',
  },
  WHITEBOARD: {
    DRAW: 'whiteboard:draw',
    SYNC: 'whiteboard:sync',
    CLEAR: 'whiteboard:clear',
  },
} as const;


