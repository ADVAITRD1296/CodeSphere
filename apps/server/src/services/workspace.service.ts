import { prisma } from '../lib/prisma.js';
import { CreateWorkspaceDto, CreateFileDto, CreateFolderDto, WorkspaceRole, ProgrammingLanguage } from '@codesphere/shared';

export class WorkspaceService {
  static async createWorkspace(userId: string, dto: CreateWorkspaceDto) {
    const workspace = await prisma.workspace.create({
      data: {
        name: dto.name,
        description: dto.description,
        isPublic: dto.isPublic || false,
        members: {
          create: {
            userId,
            role: 'OWNER'
          }
        },
        files: {
          create: {
            name: 'index.js',
            language: 'JAVASCRIPT',
            content: '// Welcome to CodeSphere!\nconsole.log("Hello World from Collaborative CodeSphere!");\n'
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true, avatarUrl: true }
            }
          }
        },
        folders: true,
        files: true
      }
    });

    return workspace;
  }

  static async getUserWorkspaces(userId: string) {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, username: true, email: true, avatarUrl: true }
                }
              }
            },
            files: true
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    });

    return memberships.map(m => m.workspace);
  }

  static async getWorkspaceDetails(workspaceId: string, userId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId }
      }
    });

    if (!member) {
      // Check if workspace is public
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId }
      });
      if (!workspace || !workspace.isPublic) {
        throw new Error('Workspace not found or access denied');
      }
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true, avatarUrl: true }
            }
          }
        },
        folders: true,
        files: true
      }
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    return workspace;
  }

  static async addMember(workspaceId: string, requesterUserId: string, targetIdentifier: string, role: WorkspaceRole = 'EDITOR') {
    // Verify requester is OWNER
    const requester = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: requesterUserId }
      }
    });

    if (!requester || requester.role !== 'OWNER') {
      throw new Error('Forbidden: Only the workspace owner can add new members');
    }

    // Lookup target user
    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: targetIdentifier.toLowerCase() },
          { username: targetIdentifier }
        ]
      }
    });

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    // Check if already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: targetUser.id }
      }
    });

    if (existingMember) {
      throw new Error('User is already a member of this workspace');
    }

    const newMember = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: targetUser.id,
        role
      },
      include: {
        user: {
          select: { id: true, username: true, email: true, avatarUrl: true }
        }
      }
    });

    return newMember;
  }

  static async createFolder(workspaceId: string, userId: string, dto: CreateFolderDto) {
    await this.verifyEditPermission(workspaceId, userId);

    const folder = await prisma.projectFolder.create({
      data: {
        name: dto.name,
        workspaceId,
        parentId: dto.parentId || null
      }
    });

    return folder;
  }

  static async createFile(workspaceId: string, userId: string, dto: CreateFileDto) {
    await this.verifyEditPermission(workspaceId, userId);

    const file = await prisma.projectFile.create({
      data: {
        name: dto.name,
        language: dto.language || 'JAVASCRIPT',
        workspaceId,
        folderId: dto.folderId || null,
        content: dto.content || ''
      }
    });

    return file;
  }

  static async updateFileContent(workspaceId: string, fileId: string, userId: string, content: string) {
    await this.verifyEditPermission(workspaceId, userId);

    const file = await prisma.projectFile.update({
      where: { id: fileId },
      data: { content }
    });

    return file;
  }

  static async deleteFile(workspaceId: string, fileId: string, userId: string) {
    await this.verifyEditPermission(workspaceId, userId);

    await prisma.projectFile.delete({
      where: { id: fileId }
    });
  }

  static async deleteWorkspace(workspaceId: string, userId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId }
      }
    });

    if (!member || member.role !== 'OWNER') {
      throw new Error('Forbidden: Only the workspace owner can delete this workspace');
    }

    await prisma.workspace.delete({
      where: { id: workspaceId }
    });
  }

  private static async verifyEditPermission(workspaceId: string, userId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId }
      }
    });

    if (!member || member.role === 'VIEWER') {
      throw new Error('Forbidden: You do not have write permissions for this workspace');
    }
  }

  static async updateWorkspace(
    workspaceId: string,
    userId: string,
    dto: { name?: string; description?: string; isPublic?: boolean }
  ) {
    // Only OWNER can change workspace settings
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    });

    if (!member || member.role !== 'OWNER') {
      throw new Error('Forbidden: Only the workspace owner can update settings');
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
      },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, email: true, avatarUrl: true } } }
        },
        folders: true,
        files: true
      }
    });

    // Log settings change
    await prisma.activityLog.create({
      data: {
        workspaceId,
        userId,
        action: 'WORKSPACE_UPDATED',
        metadata: JSON.stringify(dto)
      }
    }).catch(() => {});

    return updated;
  }

  static async getAuditLog(workspaceId: string, userId: string, limit = 50) {
    // Must be a member to view audit log
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    });

    if (!member) throw new Error('Forbidden');

    const logs = await prisma.activityLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, username: true } }
      }
    });

    return logs.map(l => ({
      id: l.id,
      action: l.action,
      metadata: l.metadata ? JSON.parse(l.metadata) : null,
      createdAt: l.createdAt.toISOString(),
      user: l.user
    }));
  }
}

