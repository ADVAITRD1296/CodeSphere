import { prisma } from '../lib/prisma.js';

export interface SnapshotDto {
  id: string;
  fileId: string;
  workspaceId: string;
  message: string;
  content: string;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
  };
}

export class SnapshotService {
  /**
   * Create a named snapshot (checkpoint) of the current file content.
   * Enforced limit: max 50 snapshots per file (auto-prune oldest beyond limit).
   */
  static async createSnapshot(
    fileId: string,
    workspaceId: string,
    userId: string,
    message: string
  ): Promise<SnapshotDto> {
    // Verify file exists in this workspace
    const file = await prisma.projectFile.findFirst({
      where: { id: fileId, workspaceId },
    });

    if (!file) {
      throw new Error('File not found in this workspace');
    }

    // Create snapshot with current content
    const snapshot = await prisma.fileSnapshot.create({
      data: {
        fileId,
        workspaceId,
        createdById: userId,
        message: message.trim() || `Snapshot at ${new Date().toISOString()}`,
        content: file.content,
      },
      include: {
        createdBy: { select: { id: true, username: true } },
      },
    });

    // Enforce 50-snapshot limit per file: delete oldest beyond limit
    const allSnapshots = await prisma.fileSnapshot.findMany({
      where: { fileId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (allSnapshots.length > 50) {
      const toDelete = allSnapshots.slice(0, allSnapshots.length - 50).map((s) => s.id);
      await prisma.fileSnapshot.deleteMany({ where: { id: { in: toDelete } } });
    }

    return {
      id: snapshot.id,
      fileId: snapshot.fileId,
      workspaceId: snapshot.workspaceId,
      message: snapshot.message,
      content: snapshot.content,
      createdAt: snapshot.createdAt.toISOString(),
      createdBy: snapshot.createdBy,
    };
  }

  /**
   * List all snapshots for a file, newest first. Content is excluded for performance.
   */
  static async listSnapshots(fileId: string, workspaceId: string): Promise<Omit<SnapshotDto, 'content'>[]> {
    const file = await prisma.projectFile.findFirst({
      where: { id: fileId, workspaceId },
    });

    if (!file) throw new Error('File not found');

    const snapshots = await prisma.fileSnapshot.findMany({
      where: { fileId, workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, username: true } },
      },
    });

    return snapshots.map((s) => ({
      id: s.id,
      fileId: s.fileId,
      workspaceId: s.workspaceId,
      message: s.message,
      createdAt: s.createdAt.toISOString(),
      createdBy: s.createdBy,
    }));
  }

  /**
   * Get a single snapshot WITH its full content (for diff viewing).
   */
  static async getSnapshot(snapshotId: string, workspaceId: string): Promise<SnapshotDto> {
    const snapshot = await prisma.fileSnapshot.findFirst({
      where: { id: snapshotId, workspaceId },
      include: {
        createdBy: { select: { id: true, username: true } },
      },
    });

    if (!snapshot) throw new Error('Snapshot not found');

    return {
      id: snapshot.id,
      fileId: snapshot.fileId,
      workspaceId: snapshot.workspaceId,
      message: snapshot.message,
      content: snapshot.content,
      createdAt: snapshot.createdAt.toISOString(),
      createdBy: snapshot.createdBy,
    };
  }

  /**
   * Restore a file's content to a snapshot.
   * Returns the updated file content.
   */
  static async restoreSnapshot(
    snapshotId: string,
    workspaceId: string,
    restoredByUserId: string
  ): Promise<{ fileId: string; content: string }> {
    const snapshot = await prisma.fileSnapshot.findFirst({
      where: { id: snapshotId, workspaceId },
    });

    if (!snapshot) throw new Error('Snapshot not found');

    await prisma.projectFile.update({
      where: { id: snapshot.fileId },
      data: { content: snapshot.content },
    });

    // Log the restore action
    await prisma.activityLog.create({
      data: {
        workspaceId,
        userId: restoredByUserId,
        action: 'SNAPSHOT_RESTORED',
        metadata: JSON.stringify({ snapshotId, fileId: snapshot.fileId, message: snapshot.message }),
      },
    }).catch(() => {}); // non-fatal

    return { fileId: snapshot.fileId, content: snapshot.content };
  }

  /**
   * Delete a specific snapshot.
   */
  static async deleteSnapshot(snapshotId: string, workspaceId: string, requestingUserId: string): Promise<void> {
    const snapshot = await prisma.fileSnapshot.findFirst({
      where: { id: snapshotId, workspaceId },
    });

    if (!snapshot) throw new Error('Snapshot not found');

    // Only creator or workspace owner can delete
    const isCreator = snapshot.createdById === requestingUserId;
    const isOwner = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: requestingUserId, role: 'OWNER' },
    });

    if (!isCreator && !isOwner) {
      throw new Error('Not authorized to delete this snapshot');
    }

    await prisma.fileSnapshot.delete({ where: { id: snapshotId } });
  }
}
