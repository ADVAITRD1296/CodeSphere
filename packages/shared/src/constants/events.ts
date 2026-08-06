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
} as const;
