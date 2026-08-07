'use client';

import React, { useState, memo } from 'react';
import { 
  FolderGit2, 
  History, 
  Palette, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  FileCode,
  Sparkles
} from 'lucide-react';
import { FileTree } from '../file-tree/FileTree';

export type LeftSidebarSection = 'files' | 'history' | 'whiteboard' | 'settings';

interface LeftSidebarProps {
  workspaceId: string;
  userRole: string;
  activeFileName?: string;
  onOpenSnapshot: () => void;
  onOpenWhiteboard: () => void;
  onOpenSettings: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = memo(({
  workspaceId,
  userRole,
  activeFileName,
  onOpenSnapshot,
  onOpenWhiteboard,
  onOpenSettings,
}) => {
  const [activeSection, setActiveSection] = useState<LeftSidebarSection>('files');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleNavClick = (section: LeftSidebarSection) => {
    if (activeSection === section && !isCollapsed) {
      setIsCollapsed(true);
    } else {
      setActiveSection(section);
      setIsCollapsed(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: 'var(--mantle)', borderRight: '1px solid var(--border)', flexShrink: 0 }}>
      {/* ─── 1. Icon Rail Column (48px) ────────────────────────────────── */}
      <div
        style={{
          width: '48px',
          height: '100%',
          backgroundColor: '#13131e',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '10px 0',
          gap: '8px',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {/* Files Explorer */}
        <button
          onClick={() => handleNavClick('files')}
          className={`ide-icon-btn${activeSection === 'files' && !isCollapsed ? ' active' : ''}`}
          title="Explorer (Files & Folders)"
          style={{ width: '36px', height: '36px' }}
        >
          <FolderGit2 size={18} />
        </button>

        {/* Version History */}
        <button
          onClick={() => {
            setActiveSection('history');
            setIsCollapsed(false);
            onOpenSnapshot();
          }}
          className={`ide-icon-btn${activeSection === 'history' && !isCollapsed ? ' active' : ''}`}
          title="Version History Snapshots"
          style={{ width: '36px', height: '36px' }}
        >
          <History size={18} />
        </button>

        {/* Whiteboard */}
        <button
          onClick={() => {
            setActiveSection('whiteboard');
            setIsCollapsed(false);
            onOpenWhiteboard();
          }}
          className={`ide-icon-btn${activeSection === 'whiteboard' && !isCollapsed ? ' active' : ''}`}
          title="Collaborative Whiteboard"
          style={{ width: '36px', height: '36px' }}
        >
          <Palette size={18} color="var(--mauve)" />
        </button>

        {/* Settings (if owner/editor) */}
        <button
          onClick={() => {
            setActiveSection('settings');
            setIsCollapsed(false);
            onOpenSettings();
          }}
          className={`ide-icon-btn${activeSection === 'settings' && !isCollapsed ? ' active' : ''}`}
          title="Workspace Settings"
          style={{ width: '36px', height: '36px', marginTop: 'auto' }}
        >
          <Settings size={18} />
        </button>

        {/* Collapse Rail Toggle */}
        <button
          onClick={() => setIsCollapsed((v) => !v)}
          className="ide-icon-btn"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          style={{ width: '36px', height: '36px' }}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* ─── 2. Expandable Panel (240px) ───────────────────────────────── */}
      {!isCollapsed && (
        <div style={{ width: '235px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeSection === 'files' && (
            <div style={{ width: '100%', height: '100%' }}>
              <FileTree workspaceId={workspaceId} userRole={userRole} />
            </div>
          )}

          {activeSection === 'history' && (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--subtext0)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Version History
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text)' }}>
                Viewing snapshots for {activeFileName || 'active file'}.
              </div>
              <button onClick={onOpenSnapshot} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '8px' }}>
                <History size={14} /> Open Timeline
              </button>
            </div>
          )}

          {activeSection === 'whiteboard' && (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--subtext0)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Whiteboard Canvas
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--subtext0)' }}>
                Draw diagrams and flowcharts live with your team.
              </div>
              <button onClick={onOpenWhiteboard} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '8px' }}>
                <Palette size={14} /> Launch Whiteboard
              </button>
            </div>
          )}

          {activeSection === 'settings' && (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--subtext0)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Workspace Info
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--subtext0)' }}>
                Role: <span className={`badge badge-${userRole.toLowerCase()}`}>{userRole}</span>
              </div>
              <button onClick={onOpenSettings} className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '8px' }}>
                <Settings size={14} /> Manage Settings
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

LeftSidebar.displayName = 'LeftSidebar';
