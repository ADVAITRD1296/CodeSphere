import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { SnapshotService } from '../services/snapshot.service.js';

export class SnapshotController {
  // POST /workspaces/:id/files/:fileId/snapshots
  static async createSnapshot(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id: workspaceId, fileId } = req.params;
      const { message } = req.body;

      const snapshot = await SnapshotService.createSnapshot(fileId, workspaceId, userId, message || '');
      return res.status(201).json(snapshot);
    } catch (err: any) {
      const status = err.message.includes('not found') ? 404 : 500;
      return res.status(status).json({ error: err.message });
    }
  }

  // GET /workspaces/:id/files/:fileId/snapshots
  static async listSnapshots(req: AuthenticatedRequest, res: Response) {
    try {
      const { id: workspaceId, fileId } = req.params;
      const snapshots = await SnapshotService.listSnapshots(fileId, workspaceId);
      return res.json(snapshots);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET /workspaces/:id/snapshots/:snapshotId
  static async getSnapshot(req: AuthenticatedRequest, res: Response) {
    try {
      const { id: workspaceId, snapshotId } = req.params;
      const snapshot = await SnapshotService.getSnapshot(snapshotId, workspaceId);
      return res.json(snapshot);
    } catch (err: any) {
      const status = err.message.includes('not found') ? 404 : 500;
      return res.status(status).json({ error: err.message });
    }
  }

  // POST /workspaces/:id/snapshots/:snapshotId/restore
  static async restoreSnapshot(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id: workspaceId, snapshotId } = req.params;
      const result = await SnapshotService.restoreSnapshot(snapshotId, workspaceId, userId);
      return res.json(result);
    } catch (err: any) {
      const status = err.message.includes('not found') ? 404 : 500;
      return res.status(status).json({ error: err.message });
    }
  }

  // DELETE /workspaces/:id/snapshots/:snapshotId
  static async deleteSnapshot(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id: workspaceId, snapshotId } = req.params;
      await SnapshotService.deleteSnapshot(snapshotId, workspaceId, userId);
      return res.status(204).send();
    } catch (err: any) {
      const status = err.message.includes('not found') ? 404
        : err.message.includes('Not authorized') ? 403 : 500;
      return res.status(status).json({ error: err.message });
    }
  }
}
