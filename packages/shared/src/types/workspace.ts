export type WorkspaceRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export type ProgrammingLanguage = 'JAVASCRIPT' | 'TYPESCRIPT' | 'PYTHON' | 'CPP' | 'GO';

export interface WorkspaceMemberDto {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface ProjectFileDto {
  id: string;
  name: string;
  language: ProgrammingLanguage;
  workspaceId: string;
  folderId?: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFolderDto {
  id: string;
  name: string;
  workspaceId: string;
  parentId?: string | null;
  createdAt: string;
  children?: ProjectFolderDto[];
  files?: ProjectFileDto[];
}

export interface WorkspaceDto {
  id: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  members: WorkspaceMemberDto[];
  folders: ProjectFolderDto[];
  files: ProjectFileDto[];
}

export interface CreateWorkspaceDto {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface CreateFileDto {
  name: string;
  language: ProgrammingLanguage;
  folderId?: string;
  content?: string;
}

export interface CreateFolderDto {
  name: string;
  parentId?: string;
}
