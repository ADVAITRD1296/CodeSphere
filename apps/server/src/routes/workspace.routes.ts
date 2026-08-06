import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspace.controller.js';
import { ExecutionController } from '../controllers/execution.controller.js';
import { SnapshotController } from '../controllers/snapshot.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateJwt);

router.post('/', WorkspaceController.createWorkspace);
router.get('/', WorkspaceController.getUserWorkspaces);
router.get('/:id', WorkspaceController.getWorkspaceDetails);
router.patch('/:id', WorkspaceController.updateWorkspace);
router.delete('/:id', WorkspaceController.deleteWorkspace);
router.get('/:id/audit-log', WorkspaceController.getAuditLog);

router.post('/:id/execute', ExecutionController.executeCode);
router.post('/:id/members', WorkspaceController.addMember);
router.post('/:id/folders', WorkspaceController.createFolder);
router.post('/:id/files', WorkspaceController.createFile);
router.put('/:id/files/:fileId', WorkspaceController.updateFileContent);
router.delete('/:id/files/:fileId', WorkspaceController.deleteFile);

// Snapshot (Version History) routes
router.post('/:id/files/:fileId/snapshots', SnapshotController.createSnapshot);
router.get('/:id/files/:fileId/snapshots', SnapshotController.listSnapshots);
router.get('/:id/snapshots/:snapshotId', SnapshotController.getSnapshot);
router.post('/:id/snapshots/:snapshotId/restore', SnapshotController.restoreSnapshot);
router.delete('/:id/snapshots/:snapshotId', SnapshotController.deleteSnapshot);

export default router;
