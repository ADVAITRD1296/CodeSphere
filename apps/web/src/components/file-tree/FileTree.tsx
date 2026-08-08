'use client';

import React, { useState } from 'react';
import { 
  FileCode, 
  Folder, 
  FolderOpen, 
  FilePlus, 
  FolderPlus, 
  Trash2, 
  ChevronRight, 
  ChevronDown 
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { ProjectFileDto, ProjectFolderDto, ProgrammingLanguage } from '@codesphere/shared';

interface FileTreeProps {
  workspaceId: string;
  userRole?: string;
}

export const FileTree: React.FC<FileTreeProps> = ({ workspaceId, userRole }) => {
  const { activeWorkspace, activeFileId, openFileTab, createFile, createFolder, deleteFile } = useWorkspaceStore();
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  
  // New File/Folder modal states
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileLang, setNewFileLang] = useState<ProgrammingLanguage>('JAVASCRIPT');
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(undefined);

  const isReadOnly = userRole === 'VIEWER';

  if (!activeWorkspace) return null;

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    try {
      await createFile(workspaceId, newFileName.trim(), newFileLang, selectedFolderId);
      setNewFileName('');
      setShowNewFileModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create file');
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await createFolder(workspaceId, newFolderName.trim(), selectedFolderId);
      setNewFolderName('');
      setShowNewFolderModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create folder');
    }
  };

  const handleDeleteFile = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this file?')) {
      await deleteFile(workspaceId, fileId);
    }
  };

  // Root level files (not in any folder)
  const rootFiles = activeWorkspace.files.filter(f => !f.folderId);
  const rootFolders = activeWorkspace.folders.filter(f => !f.parentId);

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--mantle)', color: 'var(--text)', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
      {/* Sidebar Header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--subtext0)' }}>
          Explorer
        </span>

        {!isReadOnly && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { setSelectedFolderId(undefined); setShowNewFileModal(true); }}
              title="New File"
              className="ide-icon-btn"
              style={{ width: '26px', height: '26px' }}
            >
              <FilePlus size={15} />
            </button>
            <button
              onClick={() => { setSelectedFolderId(undefined); setShowNewFolderModal(true); }}
              title="New Folder"
              className="ide-icon-btn"
              style={{ width: '26px', height: '26px' }}
            >
              <FolderPlus size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Tree Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {/* Render Root Folders */}
        {rootFolders.map(folder => (
          <FolderNode
            key={folder.id}
            folder={folder}
            workspace={activeWorkspace}
            activeFileId={activeFileId}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
            onSelectFile={(id) => openFileTab(id)}
            onDeleteFile={handleDeleteFile}
            isReadOnly={isReadOnly}
          />
        ))}

        {/* Render Root Files */}
        {rootFiles.map(file => (
          <FileNode
            key={file.id}
            file={file}
            isActive={file.id === activeFileId}
            onSelect={() => openFileTab(file.id)}
            onDelete={(e) => handleDeleteFile(e, file.id)}
            isReadOnly={isReadOnly}
          />
        ))}
      </div>

      {/* New File Modal */}
      {showNewFileModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '360px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Create New File</h3>
            <form onSubmit={handleCreateFile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9399b2', marginBottom: '6px' }}>File Name</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="script.js"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--subtext0)', marginBottom: '6px' }}>Language</label>
                <select
                  className="input-field"
                  value={newFileLang}
                  onChange={(e) => setNewFileLang(e.target.value as ProgrammingLanguage)}
                  style={{ backgroundColor: 'var(--crust)', color: 'var(--text)' }}
                >
                  <option value="JAVASCRIPT">JavaScript</option>
                  <option value="TYPESCRIPT">TypeScript</option>
                  <option value="PYTHON">Python</option>
                  <option value="CPP">C++</option>
                  <option value="GO">Go</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowNewFileModal(false)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface FolderNodeProps {
  folder: ProjectFolderDto;
  workspace: any;
  activeFileId: string | null;
  expandedFolders: Record<string, boolean>;
  toggleFolder: (id: string) => void;
  onSelectFile: (id: string) => void;
  onDeleteFile: (e: any, id: string) => void;
  isReadOnly: boolean;
}

const FolderNode: React.FC<FolderNodeProps> = ({
  folder,
  workspace,
  activeFileId,
  expandedFolders,
  toggleFolder,
  onSelectFile,
  onDeleteFile,
  isReadOnly
}) => {
  const isExpanded = expandedFolders[folder.id];
  const folderFiles = workspace.files.filter((f: ProjectFileDto) => f.folderId === folder.id);
  const childFolders = workspace.folders.filter((f: ProjectFolderDto) => f.parentId === folder.id);

  return (
    <div>
      <div
        onClick={() => toggleFolder(folder.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 16px',
          cursor: 'pointer',
          fontSize: '0.88rem',
          color: 'var(--text)',
          userSelect: 'none'
        }}
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {isExpanded ? <FolderOpen size={16} color="var(--blue)" /> : <Folder size={16} color="var(--blue)" />}
        <span>{folder.name}</span>
      </div>

      {isExpanded && (
        <div style={{ paddingLeft: '16px' }}>
          {childFolders.map((cf: ProjectFolderDto) => (
            <FolderNode
              key={cf.id}
              folder={cf}
              workspace={workspace}
              activeFileId={activeFileId}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              onSelectFile={onSelectFile}
              onDeleteFile={onDeleteFile}
              isReadOnly={isReadOnly}
            />
          ))}
          {folderFiles.map((file: ProjectFileDto) => (
            <FileNode
              key={file.id}
              file={file}
              isActive={file.id === activeFileId}
              onSelect={() => onSelectFile(file.id)}
              onDelete={(e) => onDeleteFile(e, file.id)}
              isReadOnly={isReadOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface FileNodeProps {
  file: ProjectFileDto;
  isActive: boolean;
  onSelect: () => void;
  onDelete: (e: any) => void;
  isReadOnly: boolean;
}

const FileNode: React.FC<FileNodeProps> = ({ file, isActive, onSelect, onDelete, isReadOnly }) => {
  const getLanguageColor = (lang: string) => {
    switch (lang) {
      case 'JAVASCRIPT': return '#f7df1e';
      case 'TYPESCRIPT': return '#3178c6';
      case 'PYTHON': return '#3572A5';
      case 'CPP': return '#f34b7d';
      case 'GO': return '#00ADD8';
      default: return 'var(--blue)';
    }
  };

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 16px',
        cursor: 'pointer',
        fontSize: '0.88rem',
        backgroundColor: isActive ? 'rgba(137, 180, 250, 0.15)' : 'transparent',
        borderLeft: isActive ? '3px solid var(--blue)' : '3px solid transparent',
        color: isActive ? 'var(--text)' : 'var(--subtext0)',
        transition: 'all 0.15s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FileCode size={16} color={getLanguageColor(file.language)} />
        <span style={{ fontWeight: isActive ? 600 : 400 }}>{file.name}</span>
      </div>

      {!isReadOnly && (
        <button
          onClick={onDelete}
          title="Delete file"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--red)',
            opacity: 0.6,
            cursor: 'pointer',
            padding: '2px'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
};
