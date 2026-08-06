export interface CursorPosition {
  line: number;
  column: number;
}

export interface UserPresence {
  userId: string;
  username: string;
  color: string;
  cursor?: CursorPosition;
  activeFileId?: string;
}

export interface ChatMessageDto {
  id: string;
  workspaceId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: string;
}
