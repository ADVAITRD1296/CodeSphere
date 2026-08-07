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
  Settings,
  Users,
  Video,
  Palette
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';
import { FileTree } from '../../../components/file-tree/FileTree';
import { MonacoEditorComponent } from '../../../components/editor/MonacoEditor';
import { TerminalPanel } from '../../../components/terminal/Terminal';
import { SnapshotPanel } from '../../../components/snapshot/SnapshotPanel';
import { ChatPanel } from '../../../components/chat/ChatPanel';
import { WorkspaceSettingsModal } from '../../../components/settings/WorkspaceSettings';
import { PresenceSidebar } from '../../../components/presence/PresenceSidebar';
import { UserAvatars } from '../../../components/editor/UserAvatars';
import { VoiceCallControl } from '../../../components/voice/VoiceCallControl';
import { VideoConferenceModal } from '../../../components/video/VideoConferenceModal';
import { WhiteboardModal } from '../../../components/whiteboard/WhiteboardModal';
import { RightCollabPanel, CollabTab } from '../../../components/layout/RightCollabPanel';
import { LeftSidebar } from '../../../components/layout/LeftSidebar';
import { IncomingCallToast, IncomingCallData } from '../../../components/calls/IncomingCallToast';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { useTerminal } from '../../../hooks/useTerminal';
import { usePresence } from '../../../hooks/usePresence';
import { useVoiceCall } from '../../../hooks/useVoiceCall';
import { useVideoCall } from '../../../hooks/useVideoCall';
import { useLineLocking } from '../../../hooks/useLineLocking';
import { useWhiteboard } from '../../../hooks/useWhiteboard';
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

  const activeFile = activeWorkspace?.files.find(f => f.id === activeFileId) || null;
  const currentUserMember = activeWorkspace?.members.find(m => m.userId === user?.id);
  const userRole = currentUserMember?.role || (activeWorkspace?.isPublic ? 'VIEWER' : 'VIEWER');

  // Rich presence hook
  const { onlineUsers, presenceSummary, socket } = usePresence(
    workspaceId,
    user?.id,
    user?.username,
    activeFileId || undefined,
    activeFile?.name || undefined,
    null,
    userRole
  );

  // WebRTC Voice Call hook
  const {
    isInVoice,
    isMuted,
    isSpeaking,
    voicePeers,
    permissionError: voicePermissionError,
    joinVoiceCall,
    leaveVoiceCall,
    toggleMute
  } = useVoiceCall(socket, workspaceId);

  // WebRTC Video Conference hook
  const {
    isInVideo,
    isCameraOn,
    isMicOn,
    isScreenSharing,
    localStream,
    videoPeers,
    videoDevices,
    selectedDeviceId,
    permissionError: videoPermissionError,
    startCameraPreview,
    joinVideoCall,
    leaveVideoCall,
    toggleCamera,
    toggleMic,
    switchCameraDevice,
    toggleScreenShare
  } = useVideoCall(socket, workspaceId);

  // Granular Line Locking hook
  const {
    locks,
    myLocks,
    lockError,
    requestLock,
    releaseLock,
    forceReleaseLock,
    isRangeLockedByOther
  } = useLineLocking(workspaceId, activeFile?.id || null, socket, user?.id);

  // Collaborative Whiteboard hook
  const {
    elements: whiteboardElements,
    addElement: addWhiteboardElement,
    clearWhiteboard
  } = useWhiteboard(workspaceId, socket);

  // Terminal state
  const { lines, session, runCode, clearTerminal, sendInput, killExecution, isRunning } = useTerminal(socket);
  const [terminalCollapsed, setTerminalCollapsed] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(DEFAULT_TERMINAL_HEIGHT);

  // Panel Toggles
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showPresenceSidebar, setShowPresenceSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showWhiteboardModal, setShowWhiteboardModal] = useState(false);

  // Persistent Right Collaboration Panel (4-Panel Layout)
  const [showRightCollabPanel, setShowRightCollabPanel] = useState(true);
  const [activeCollabTab, setActiveCollabTab] = useState<CollabTab>('members');
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; content: string; timestamp: number; isSelf: boolean }>>([]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (msg: any) => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: msg.id || Math.random().toString(),
          sender: msg.username || 'User',
          content: msg.message || msg.content || '',
          timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now(),
          isSelf: msg.userId === user?.id,
        },
      ]);
    };
    socket.on(SOCKET_EVENTS.CHAT.NEW_MESSAGE, handleNewMessage);
    return () => {
      socket.off(SOCKET_EVENTS.CHAT.NEW_MESSAGE, handleNewMessage);
    };
  }, [socket, user?.id]);

  // Incoming Call State
  const [incomingCallData, setIncomingCallData] = useState<IncomingCallData | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleVoiceIncoming = (data: IncomingCallData) => {
      if (data.callerUserId !== user?.id && !isInVoice && !isInVideo) {
        setIncomingCallData(data);
      }
    };

    const handleVideoIncoming = (data: IncomingCallData) => {
      if (data.callerUserId !== user?.id && !isInVoice && !isInVideo) {
        setIncomingCallData(data);
      }
    };

    socket.on(SOCKET_EVENTS.VOICE.CALL_INCOMING, handleVoiceIncoming);
    socket.on(SOCKET_EVENTS.VIDEO.CALL_INCOMING, handleVideoIncoming);

    return () => {
      socket.off(SOCKET_EVENTS.VOICE.CALL_INCOMING, handleVoiceIncoming);
      socket.off(SOCKET_EVENTS.VIDEO.CALL_INCOMING, handleVideoIncoming);
    };
  }, [socket, user?.id, isInVoice, isInVideo]);

  const handleAcceptCall = useCallback(() => {
    if (!incomingCallData) return;
    if (incomingCallData.callType === 'VOICE') {
      joinVoiceCall();
      setActiveCollabTab('voice');
      setShowRightCollabPanel(true);
    } else {
      joinVideoCall();
      setActiveCollabTab('video');
      setShowRightCollabPanel(true);
    }
    setIncomingCallData(null);
  }, [incomingCallData, joinVoiceCall, joinVideoCall]);

  const handleDeclineCall = useCallback(() => {
    setIncomingCallData(null);
  }, []);


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
      const deltaY = resizeStateRef.current.startY - e.clientY;
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

  const handleInvite = useCallback(async (e: React.FormEvent) => {
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
  }, [addMember, workspaceId, inviteIdentifier, inviteRole]);

  const copyRoomLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, []);

  const handleRunCode = useCallback((language: ProgrammingLanguage, code: string) => {
    if (terminalCollapsed) setTerminalCollapsed(false);
    runCode(language, code);
  }, [terminalCollapsed, runCode]);

  const handleSendChatMessage = useCallback((content: string) => {
    if (!socket || !workspaceId) return;
    socket.emit(SOCKET_EVENTS.CHAT.SEND_MESSAGE, {
      workspaceId,
      message: content,
    });
  }, [socket, workspaceId]);

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

  const isReadOnly = userRole === 'VIEWER';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--crust)', color: 'var(--text)', overflow: 'hidden' }}>
      {/* IDE Top Header */}
      <header className="ide-header">
        {/* Left: Nav + Workspace Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--overlay1)', fontSize: '0.82rem', transition: 'color var(--ease-fast)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--overlay1)')}>
            <ArrowLeft size={15} /> Dashboard
          </Link>
          <span className="divider-v" style={{ height: '16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '5px', background: 'linear-gradient(135deg, var(--blue), var(--mauve))', borderRadius: '7px', display: 'flex', alignItems: 'center' }}>
              <Code2 size={15} color="#11111b" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>{activeWorkspace.name}</span>
            <span className={`badge badge-${userRole.toLowerCase()}`}>{userRole}</span>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* WebRTC Voice Call Control */}
          <VoiceCallControl
            isInVoice={isInVoice}
            isMuted={isMuted}
            isSpeaking={isSpeaking}
            voicePeers={voicePeers}
            permissionError={voicePermissionError}
            onJoin={joinVoiceCall}
            onLeave={leaveVoiceCall}
            onToggleMute={toggleMute}
            currentUsername={user?.username}
          />

          {/* Video Call Button */}
          <button
            onClick={() => setShowVideoModal(true)}
            className={`ide-pill-btn${isInVideo ? ' video-active' : ''}`}
            title="Open Video Conference"
          >
            <Video size={13} /> {isInVideo ? 'In Meeting' : 'Video'}
          </button>

          {/* Whiteboard Button */}
          <button
            onClick={() => setShowWhiteboardModal(true)}
            className={`ide-pill-btn${showWhiteboardModal ? ' active' : ''}`}
            title="Open Collaborative Whiteboard"
          >
            <Palette size={13} color="var(--mauve)" /> Whiteboard
          </button>

          {/* Theme Toggle (Dark / Light Mode) */}
          <ThemeToggle />

          <span className="divider-v" style={{ height: '20px', margin: '0 2px' }} />


          {/* Member Presence Avatars */}
          <UserAvatars
            onlineUsers={onlineUsers}
            currentUserId={user?.id}
            onTogglePresenceSidebar={() => setShowPresenceSidebar(v => !v)}
          />

          {/* Collab Panel Toggle Button */}
          <button
            onClick={() => setShowRightCollabPanel(v => !v)}
            className={`ide-pill-btn${showRightCollabPanel ? ' active' : ''}`}
            title="Toggle Right Collaboration Panel"
          >
            <Users size={13} /> Collab ({presenceSummary.totalOnline})
          </button>

          <span className="divider-v" style={{ height: '20px', margin: '0 2px' }} />

          {/* Quick Run */}
          {!isReadOnly && activeFile && (
            <button
              onClick={() => handleRunCode(activeFile.language, activeFile.content)}
              disabled={isRunning}
              className="ide-pill-btn run-btn"
              title="Run Code"
            >
              <Play size={12} fill="currentColor" />
              {isRunning ? 'Running…' : 'Run'}
            </button>
          )}

          {/* History */}
          {activeFile && (
            <button onClick={() => setShowSnapshot(true)} className="ide-icon-btn" title="Version History">
              <History size={14} />
            </button>
          )}

          {/* Terminal Toggle */}
          <button
            onClick={() => setTerminalCollapsed(v => !v)}
            className={`ide-icon-btn${!terminalCollapsed ? ' active' : ''}`}
            title="Toggle Terminal"
          >
            <Terminal size={14} />
          </button>

          {/* Settings (Owner only) */}
          {userRole === 'OWNER' && (
            <button onClick={() => setShowSettings(true)} className="ide-icon-btn" title="Workspace Settings">
              <Settings size={14} />
            </button>
          )}

          <span className="divider-v" style={{ height: '20px', margin: '0 2px' }} />

          {userRole === 'OWNER' && (
            <button onClick={() => setShowInviteModal(true)} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.78rem', gap: '5px' }}>
              <UserPlus size={13} /> Invite
            </button>
          )}

          <button onClick={copyRoomLink} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.78rem', gap: '5px' }}>
            {copiedLink ? <Check size={13} color="var(--green)" /> : <Copy size={13} />}
            {copiedLink ? 'Copied!' : 'Share'}
          </button>
        </div>
      </header>


      {/* Main IDE 4-Panel Layout Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 1. Left Sidebar Navigation + File Tree */}
        <LeftSidebar
          workspaceId={workspaceId}
          userRole={userRole}
          activeFileName={activeFile?.name}
          onOpenSnapshot={() => setShowSnapshot(true)}
          onOpenWhiteboard={() => setShowWhiteboardModal(true)}
          onOpenSettings={() => setShowSettings(true)}
        />

        {/* 2 & 3. Center Column: Monaco Code Editor + Bottom Terminal */}
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
            currentUserId={user?.id}
            userRole={userRole}
            locks={locks}
            myLocks={myLocks}
            lockError={lockError}
            onRequestLock={requestLock}
            onReleaseLock={releaseLock}
            onForceReleaseLock={forceReleaseLock}
            isRangeLockedByOther={isRangeLockedByOther}
          />

          <TerminalPanel
            lines={lines}
            session={session}
            isRunning={isRunning}
            onRun={handleRunCode}
            onClear={clearTerminal}
            onSendInput={sendInput}
            onKillExecution={killExecution}
            activeFileContent={activeFile?.content}
            activeFileLanguage={activeFile?.language}
            isCollapsed={terminalCollapsed}
            onToggleCollapse={() => setTerminalCollapsed((v) => !v)}
            height={terminalHeight}
            onResizeStart={handleResizeStart}
          />
        </div>

        {/* 4. Right Persistent Collaboration Panel (Voice, Video, Chat, Members) */}
        {showRightCollabPanel && (
          <RightCollabPanel
            activeTab={activeCollabTab}
            onSelectTab={(tab) => setActiveCollabTab(tab)}
            onClose={() => setShowRightCollabPanel(false)}
            presenceSummary={presenceSummary}
            currentUserId={user?.id}
            isInVoice={isInVoice}
            isMuted={isMuted}
            isSpeaking={isSpeaking}
            voicePeers={voicePeers}
            onJoinVoice={joinVoiceCall}
            onLeaveVoice={leaveVoiceCall}
            onToggleMute={toggleMute}
            isInVideo={isInVideo}
            isCameraOn={isCameraOn}
            isMicOn={isMicOn}
            isScreenSharing={isScreenSharing}
            localStream={localStream}
            videoPeers={videoPeers}
            onJoinVideo={joinVideoCall}
            onLeaveVideo={leaveVideoCall}
            onToggleCamera={toggleCamera}
            onToggleVideoMic={toggleMic}
            onToggleScreenShare={toggleScreenShare}
            chatMessages={chatMessages}
            onSendMessage={handleSendChatMessage}
          />
        )}
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
          onlineCount={presenceSummary.totalOnline}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* Workspace Settings Modal */}
      {showSettings && (
        <WorkspaceSettingsModal
          workspaceId={workspaceId}
          initialName={activeWorkspace.name}
          initialDescription={activeWorkspace.description || ''}
          initialIsPublic={activeWorkspace.isPublic}
          isOwner={userRole === 'OWNER'}
          onClose={() => setShowSettings(false)}
          onDeleted={() => router.push('/dashboard')}
          onUpdated={() => fetchWorkspace(workspaceId)}
        />
      )}

      {/* Video Conference Modal */}
      {showVideoModal && (
        <VideoConferenceModal
          isOpen={showVideoModal}
          isInVideo={isInVideo}
          isCameraOn={isCameraOn}
          isMicOn={isMicOn}
          isScreenSharing={isScreenSharing}
          localStream={localStream}
          videoPeers={videoPeers}
          videoDevices={videoDevices}
          selectedDeviceId={selectedDeviceId}
          permissionError={videoPermissionError}
          currentUsername={user?.username || 'You'}
          onJoin={joinVideoCall}
          onLeave={leaveVideoCall}
          onToggleCamera={toggleCamera}
          onToggleMic={toggleMic}
          onSwitchDevice={switchCameraDevice}
          onToggleScreenShare={toggleScreenShare}
          onStartPreview={startCameraPreview}
          onClose={() => setShowVideoModal(false)}
        />
      )}

      {/* Collaborative Whiteboard Modal */}
      {showWhiteboardModal && (
        <WhiteboardModal
          isOpen={showWhiteboardModal}
          elements={whiteboardElements}
          currentUserId={user?.id || ''}
          currentUsername={user?.username || 'You'}
          onAddElement={addWhiteboardElement}
          onClear={clearWhiteboard}
          onClose={() => setShowWhiteboardModal(false)}
        />
      )}


      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} color="#3b82f6" /> Add Workspace Member
            </h3>

            {inviteSuccess && (
              <div style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>
                {inviteSuccess}
              </div>
            )}

            {inviteError && (
              <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>
                {inviteError}
              </div>
            )}

            <form onSubmit={handleInvite}>
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Email or Username</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. alex@example.com or alex"
                  value={inviteIdentifier}
                  onChange={(e) => setInviteIdentifier(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className="form-label">Role Permission</label>
                <select
                  className="input-field"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                >
                  <option value="EDITOR">Editor (Can edit code & execute)</option>
                  <option value="VIEWER">Viewer (Read-only access)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowInviteModal(false)}>
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

      {/* ─── Incoming Call Toast Notification ──────────────────────────────── */}
      <IncomingCallToast
        callData={incomingCallData}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
      />
    </div>
  );
}
