export interface CursorPosition {
  line: number;
  column: number;
}

export type PresenceStatus = 'ONLINE' | 'IDLE' | 'OFFLINE' | 'IN_VOICE' | 'SHARING_SCREEN';
export type UserActivityType = 'EDITING' | 'VIEWING' | 'IDLE';

export interface UserPresence {
  userId: string;
  username: string;
  color: string;
  status: PresenceStatus;
  activity: UserActivityType;
  cursor?: CursorPosition;
  activeFileId?: string;
  activeFileName?: string;
  role?: string;
  lastActive?: string;
  avatarUrl?: string;
  isInVoice?: boolean;
  isInVideo?: boolean;
}

export interface RoomPresenceSummary {
  workspaceId: string;
  totalOnline: number;
  totalOffline: number;
  editingCount: number;
  viewingCount: number;
  voiceCount: number;
  videoCount: number;
  users: UserPresence[];
  offlineUsers?: { userId: string; username: string; role?: string; avatarUrl?: string }[];
}

export interface ChatMessageDto {
  id: string;
  workspaceId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: string;
}
