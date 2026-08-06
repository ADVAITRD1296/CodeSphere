import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { WorkspaceService } from '../services/workspace.service.js';

export class WorkspaceController {
  static async createWorkspace(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { name, description, isPublic } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Workspace name is required' });
      }

      const workspace = await WorkspaceService.createWorkspace(userId, { name, description, isPublic });
      return res.status(201).json(workspace);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to create workspace' });
    }
  }

  static async getUserWorkspaces(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const workspaces = await WorkspaceService.getUserWorkspaces(userId);
      return res.json(workspaces);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch workspaces' });
    }
  }

  static async getWorkspaceDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const workspaceId = req.params.id;

      const workspace = await WorkspaceService.getWorkspaceDetails(workspaceId, userId);
      return res.json(workspace);
    } catch (err: any) {
      return res.status(404).json({ error: err.message || 'Workspace not found' });
    }
  }

  static async addMember(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const workspaceId = req.params.id;
      const { identifier, role } = req.body;

      if (!identifier) {
        return res.status(400).json({ error: 'User email or username is required' });
      }

      const member = await WorkspaceService.addMember(workspaceId, userId, identifier, role);
      return res.status(201).json(member);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to add member' });
    }
  }

  static async createFolder(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const workspaceId = req.params.id;
      const { name, parentId } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Folder name is required' });
      }

      const folder = await WorkspaceService.createFolder(workspaceId, userId, { name, parentId });
      return res.status(201).json(folder);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to create folder' });
    }
  }

  static async createFile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const workspaceId = req.params.id;
      const { name, language, folderId, content } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'File name is required' });
      }

      const file = await WorkspaceService.createFile(workspaceId, userId, { name, language, folderId, content });
      return res.status(201).json(file);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to create file' });
    }
  }

  static async updateFileContent(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const workspaceId = req.params.id;
      const fileId = req.params.fileId;
      const { content } = req.body;

      const file = await WorkspaceService.updateFileContent(workspaceId, fileId, userId, content || '');
      return res.json(file);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to update file' });
    }
  }

  static async deleteFile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const workspaceId = req.params.id;
      const fileId = req.params.fileId;

      await WorkspaceService.deleteFile(workspaceId, fileId, userId);
      return res.json({ message: 'File deleted successfully' });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to delete file' });
    }
  }

  static async deleteWorkspace(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const workspaceId = req.params.id;

      await WorkspaceService.deleteWorkspace(workspaceId, userId);
      return res.json({ message: 'Workspace deleted successfully' });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to delete workspace' });
    }
  }

  static async updateWorkspace(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const workspaceId = req.params.id;
      const { name, description, isPublic } = req.body;

      const workspace = await WorkspaceService.updateWorkspace(workspaceId, userId, { name, description, isPublic });
      return res.json(workspace);
    } catch (err: any) {
      const status = err.message.includes('Forbidden') ? 403 : 400;
      return res.status(status).json({ error: err.message });
    }
  }

  static async getAuditLog(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const workspaceId = req.params.id;
      const limit = parseInt(req.query.limit as string || '50', 10);

      const logs = await WorkspaceService.getAuditLog(workspaceId, userId, limit);
      return res.json(logs);
    } catch (err: any) {
      const status = err.message === 'Forbidden' ? 403 : 500;
      return res.status(status).json({ error: err.message });
    }
  }
}

