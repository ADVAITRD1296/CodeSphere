import { create } from 'zustand';
import { WorkspaceDto, ProjectFileDto, ProjectFolderDto, ProgrammingLanguage } from '@codesphere/shared';
import { apiFetch } from '../lib/api';

interface WorkspaceState {
  activeWorkspace: WorkspaceDto | null;
  activeFileId: string | null;
  openFileIds: string[];
  isLoading: boolean;
  error: string | null;

  fetchWorkspace: (workspaceId: string) => Promise<void>;
  setActiveFileId: (fileId: string) => void;
  openFileTab: (fileId: string) => void;
  closeFileTab: (fileId: string) => void;
  
  createFile: (workspaceId: string, name: string, language: ProgrammingLanguage, folderId?: string) => Promise<ProjectFileDto>;
  createFolder: (workspaceId: string, name: string, parentId?: string) => Promise<ProjectFolderDto>;
  deleteFile: (workspaceId: string, fileId: string) => Promise<void>;
  updateLocalFileContent: (fileId: string, content: string) => void;
  addMember: (workspaceId: string, identifier: string, role: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activeWorkspace: null,
  activeFileId: null,
  openFileIds: [],
  isLoading: false,
  error: null,

  fetchWorkspace: async (workspaceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const workspace: WorkspaceDto = await apiFetch(`/workspaces/${workspaceId}`);
      
      let initialActiveFileId = get().activeFileId;
      let initialOpenFiles = get().openFileIds;

      if (!initialActiveFileId && workspace.files.length > 0) {
        initialActiveFileId = workspace.files[0].id;
        initialOpenFiles = [workspace.files[0].id];
      }

      set({
        activeWorkspace: workspace,
        activeFileId: initialActiveFileId,
        openFileIds: initialOpenFiles,
        isLoading: false
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load workspace', isLoading: false });
    }
  },

  setActiveFileId: (fileId: string) => {
    const openFiles = get().openFileIds;
    if (!openFiles.includes(fileId)) {
      set({ openFileIds: [...openFiles, fileId], activeFileId: fileId });
    } else {
      set({ activeFileId: fileId });
    }
  },

  openFileTab: (fileId: string) => {
    const openFiles = get().openFileIds;
    if (!openFiles.includes(fileId)) {
      set({ openFileIds: [...openFiles, fileId], activeFileId: fileId });
    } else {
      set({ activeFileId: fileId });
    }
  },

  closeFileTab: (fileId: string) => {
    const openFiles = get().openFileIds.filter(id => id !== fileId);
    let nextActiveId = get().activeFileId;

    if (nextActiveId === fileId) {
      nextActiveId = openFiles.length > 0 ? openFiles[openFiles.length - 1] : null;
    }

    set({ openFileIds: openFiles, activeFileId: nextActiveId });
  },

  createFile: async (workspaceId, name, language, folderId) => {
    const file: ProjectFileDto = await apiFetch(`/workspaces/${workspaceId}/files`, {
      method: 'POST',
      body: JSON.stringify({ name, language, folderId })
    });

    const workspace = get().activeWorkspace;
    if (workspace) {
      set({
        activeWorkspace: {
          ...workspace,
          files: [...workspace.files, file]
        },
        activeFileId: file.id,
        openFileIds: [...get().openFileIds, file.id]
      });
    }

    return file;
  },

  createFolder: async (workspaceId, name, parentId) => {
    const folder: ProjectFolderDto = await apiFetch(`/workspaces/${workspaceId}/folders`, {
      method: 'POST',
      body: JSON.stringify({ name, parentId })
    });

    const workspace = get().activeWorkspace;
    if (workspace) {
      set({
        activeWorkspace: {
          ...workspace,
          folders: [...workspace.folders, folder]
        }
      });
    }

    return folder;
  },

  deleteFile: async (workspaceId, fileId) => {
    await apiFetch(`/workspaces/${workspaceId}/files/${fileId}`, {
      method: 'DELETE'
    });

    const workspace = get().activeWorkspace;
    if (workspace) {
      get().closeFileTab(fileId);
      set({
        activeWorkspace: {
          ...workspace,
          files: workspace.files.filter(f => f.id !== fileId)
        }
      });
    }
  },

  updateLocalFileContent: (fileId: string, content: string) => {
    const workspace = get().activeWorkspace;
    if (!workspace) return;

    set({
      activeWorkspace: {
        ...workspace,
        files: workspace.files.map(f => f.id === fileId ? { ...f, content } : f)
      }
    });
  },

  addMember: async (workspaceId, identifier, role) => {
    const member = await apiFetch(`/workspaces/${workspaceId}/members`, {
      method: 'POST',
      body: JSON.stringify({ identifier, role })
    });

    const workspace = get().activeWorkspace;
    if (workspace) {
      set({
        activeWorkspace: {
          ...workspace,
          members: [...workspace.members, member]
        }
      });
    }
  }
}));
