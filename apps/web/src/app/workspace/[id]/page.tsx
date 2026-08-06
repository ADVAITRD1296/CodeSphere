'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { 
  Code2, 
  Play, 
  UserPlus, 
  ArrowLeft, 
  Terminal, 
  History, 
  MessageSquare,
  ShieldAlert,
  Copy,
  Check,
  Settings
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';
import { FileTree } from '../../../components/file-tree/FileTree';
import { MonacoEditorComponent } from '../../../components/editor/MonacoEditor';
import { TerminalPanel } from '../../../components/terminal/Terminal';
import { SnapshotPanel } from '../../../components/snapshot/SnapshotPanel';
import { ChatPanel } from '../../../components/chat/ChatPanel';
import { WorkspaceSettingsModal } from '../../../components/settings/WorkspaceSettings';
import { useTerminal } from '../../../hooks/useTerminal';
import { WorkspaceRole, SOCKET_EVENTS, ProgrammingLanguage } from '@codesphere/shared';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
const MIN_TERMINAL_HEIGHT = 38;
const MAX_TERMINAL_HEIGHT = 600;
const DEFAULT_TERMINAL_HEIGHT = 220;

export default function WorkspaceIDEPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const router = useRouter();

  const { user, checkAuth } = useAuthStore();
  const { 
    activeWorkspace, 
    activeFileId, 
    openFileIds, 
    fetchWorkspace, 
    setActiveFileId, 
    closeFileTab,
    updateLocalFileContent,
    addMember,
    isLoading,
    error
  } = useWorkspaceStore();

  // Socket.io connection (shared for presence + execution)
  const [socket, setSocket] = useState<Socket | null>(null);

  // Terminal state
  const { lines, session, runCode, clearTerminal, isRunning } = useTerminal(socket);
  const [terminalCollapsed, setTerminalCollapsed] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(DEFAULT_TERMINAL_HEIGHT);

  // Snapshot panel state
  const [showSnapshot, setShowSnapshot] = useState(false);

  // Chat panel state
  const [showChat, setShowChat] = useState(false);

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);

  // Resize logic
  const resizeStateRef = useRef({ isResizing: false, startY: 0, startHeight: 0 });

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizeStateRef.current = {
      isResizing: true,
      startY: e.clientY,
      startHeight: terminalHeight,
    };
  }, [terminalHeight]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizeStateRef.current.isResizing) return;
      const deltaY = resizeStateRef.current.startY - e.clientY; // dragging up = bigger
      const newHeight = Math.min(
        MAX_TERMINAL_HEIGHT,
        Math.max(MIN_TERMINAL_HEIGHT, resizeStateRef.current.startHeight + deltaY)
      );
      setTerminalHeight(newHeight);
    };

    const onMouseUp = () => {
      resizeStateRef.current.isResizing = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('EDITOR');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    checkAuth().then((authenticated) => {
      if (!authenticated) {
        router.push('/login');
      } else if (workspaceId) {
        fetchWorkspace(workspaceId);
      }
    });
  }, [workspaceId]);

  // Setup shared Socket.io connection
  useEffect(() => {
    if (!user || !workspaceId) return;

    const sock = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'],
    });

    sock.on('connect', () => {
      sock.emit(SOCKET_EVENTS.COLLABORATION.JOIN_ROOM, {
        workspaceId,
        userId: user.id,
        username: user.username,
        activeFileId,
      });
    });

    sock.on(SOCKET_EVENTS.PRESENCE.ROOM_STATE, (users: any[]) => {
      setOnlineCount(users.length);
    });

    setSocket(sock);

    return () => {
      sock.disconnect();
      setSocket(null);
    };
  }, [user?.id, workspaceId]);

  if (isLoading || !activeWorkspace) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#94a3b8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem' }}>
          <Code2 size={28} style={{ color: '#3b82f6' }} />
          <span>Loading Collaborative IDE Room...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#f87171' }}>
        <ShieldAlert size={48} style={{ marginBottom: '16px' }} />
        <h2>Workspace Error</h2>
        <p style={{ color: '#94a3b8', margin: '12px 0 24px 0' }}>{error}</p>
        <Link href="/dashboard" className="btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const currentUserMember = activeWorkspace.members.find(m => m.userId === user?.id);
  const userRole = currentUserMember?.role || (activeWorkspace.isPublic ? 'VIEWER' : 'VIEWER');
  const isReadOnly = userRole === 'VIEWER';

  const activeFile = activeWorkspace.files.find(f => f.id === activeFileId) || null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteSuccess('');
    setInviteError('');

    try {
      await addMember(workspaceId, inviteIdentifier.trim(), inviteRole);
      setInviteSuccess(`Successfully added ${inviteIdentifier} as ${inviteRole}`);
      setInviteIdentifier('');
    } catch (err: any) {
      setInviteError(err.message || 'Failed to add member');
    }
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRunCode = (language: ProgrammingLanguage, code: string) => {
    if (terminalCollapsed) setTerminalCollapsed(false);
    runCode(language, code);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', overflow: 'hidden' }}>
      {/* IDE Top Header */}
      <header style={{ height: '50px', backgroundColor: '#181825', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', userSelect: 'none', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/dashboard" style={{ color: '#9399b2', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <div style={{ height: '16px', width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code2 size={20} color="#3b82f6" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{activeWorkspace.name}</span>
            <span className={`badge badge-${userRole.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>
              {userRole}
            </span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Member Avatars */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {activeWorkspace.members.map((m) => (
              <div
                key={m.id}
                title={`${m.user.username} (${m.role})`}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: '2px solid #181825',
                  marginLeft: '-6px',
                }}
              >
                {m.user.username.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>

          {/* Quick Run Button in Header */}
          {!isReadOnly && activeFile && (
            <button
              onClick={() => handleRunCode(activeFile.language, activeFile.content)}
              disabled={isRunning}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: isRunning ? '#313244' : '#a6e3a1',
                color: isRunning ? '#9399b2' : '#1e1e2e',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: isRunning ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Play size={13} fill="currentColor" />
              {isRunning ? 'Running...' : 'Run'}
            </button>
          )}

          {/* History Toggle */}
          {activeFile && (
            <button
              onClick={() => setShowSnapshot(true)}
              title="Version History"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: 'transparent',
                color: '#9399b2',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <History size={14} />
            </button>
          )}

          {/* Terminal Toggle */}
          <button
            onClick={() => setTerminalCollapsed((v) => !v)}
            title="Toggle Terminal"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: terminalCollapsed ? 'transparent' : 'rgba(137,180,250,0.12)',
              color: '#9399b2',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            <Terminal size={14} />
          </button>

          {/* Settings Button */}
          {userRole === 'OWNER' && (
            <button
              onClick={() => setShowSettings(true)}
              title="Workspace Settings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: 'transparent',
                color: '#9399b2',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <Settings size={14} />
            </button>
          )}

          {/* Chat Toggle */}
          <button
            onClick={() => setShowChat((v) => !v)}
            title="Room Chat"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: showChat ? 'rgba(137,180,250,0.12)' : 'transparent',
              color: '#9399b2',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            <MessageSquare size={14} />
          </button>

          {userRole === 'OWNER' && (
            <button onClick={() => setShowInviteModal(true)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <UserPlus size={14} /> Invite
            </button>
          )}

          <button onClick={copyRoomLink} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            {copiedLink ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            {copiedLink ? 'Copied' : 'Share Link'}
          </button>
        </div>
      </header>

      {/* Main IDE Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', flexDirection: 'column' }}>
        {/* Editor + Sidebar row */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Sidebar File Tree */}
          <div style={{ width: '260px', height: '100%', flexShrink: 0 }}>
            <FileTree workspaceId={workspaceId} userRole={userRole} />
          </div>

          {/* Main Editor Pane */}
          <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <MonacoEditorComponent
              activeFile={activeFile}
              openFileIds={openFileIds}
              allFiles={activeWorkspace.files}
              onSelectTab={(id) => setActiveFileId(id)}
              onCloseTab={(id) => closeFileTab(id)}
              onChangeContent={(val) => activeFile && updateLocalFileContent(activeFile.id, val)}
              isReadOnly={isReadOnly}
              username={user?.username}
            />
          </div>
        </div>

        {/* Terminal Panel */}
        <TerminalPanel
          lines={lines}
          session={session}
          isRunning={isRunning}
          onRun={handleRunCode}
          onClear={clearTerminal}
          activeFileContent={activeFile?.content}
          activeFileLanguage={activeFile?.language}
          isCollapsed={terminalCollapsed}
          onToggleCollapse={() => setTerminalCollapsed((v) => !v)}
          height={terminalHeight}
          onResizeStart={handleResizeStart}
        />
      </div>

      {/* Snapshot Version History Panel */}
      {showSnapshot && activeFile && (
        <SnapshotPanel
          workspaceId={workspaceId}
          fileId={activeFile.id}
          fileName={activeFile.name}
          language={activeFile.language}
          currentContent={activeFile.content}
          isReadOnly={isReadOnly}
          onRestored={(content) => {
            updateLocalFileContent(activeFile.id, content);
            setShowSnapshot(false);
          }}
          onClose={() => setShowSnapshot(false)}
        />
      )}

      {/* Chat Panel */}
      {showChat && (
        <ChatPanel
          socket={socket}
          workspaceId={workspaceId}
          currentUserId={user?.id || ''}
          onlineCount={onlineCount}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* Workspace Settings Modal */}
      {showSettings && (
        <WorkspaceSettingsModal
          workspaceId={workspaceId}
          initialName={activeWorkspace.name}
          initialDescription={activeWorkspace.description ?? null}
          initialIsPublic={activeWorkspace.isPublic}
          isOwner={userRole === 'OWNER'}
          onClose={() => setShowSettings(false)}
          onDeleted={() => router.push('/dashboard')}
          onUpdated={() => {
            fetchWorkspace(workspaceId);
            setShowSettings(false);
          }}
        />
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '420px', padding: '28px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>Invite Collaborator</h3>

            {inviteSuccess && (
              <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem' }}>
                {inviteSuccess}
              </div>
            )}
            {inviteError && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem' }}>
                {inviteError}
              </div>
            )}

            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9399b2', marginBottom: '6px' }}>User Email or Username</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="collaborator_username"
                  value={inviteIdentifier}
                  onChange={(e) => setInviteIdentifier(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9399b2', marginBottom: '6px' }}>Assigned Role</label>
                <select
                  className="input-field"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                  style={{ backgroundColor: '#1e1e2e' }}
                >
                  <option value="EDITOR">Editor (Read &amp; Write)</option>
                  <option value="VIEWER">Viewer (Read Only)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowInviteModal(false)} className="btn-secondary">
                  Done
                </button>
                <button type="submit" className="btn-primary">
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
