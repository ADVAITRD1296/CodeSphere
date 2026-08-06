'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import {
  History,
  Plus,
  RotateCcw,
  Trash2,
  ChevronRight,
  X,
  Clock,
  User,
  GitBranch,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { ProgrammingLanguage } from '@codesphere/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SnapshotMeta {
  id: string;
  fileId: string;
  workspaceId: string;
  message: string;
  createdAt: string;
  createdBy: { id: string; username: string };
}

interface SnapshotFull extends SnapshotMeta {
  content: string;
}

// ─── Relative time helper ─────────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Monaco language mapping ──────────────────────────────────────────────────
function toMonacoLang(lang: ProgrammingLanguage): string {
  const map: Record<ProgrammingLanguage, string> = {
    JAVASCRIPT: 'javascript',
    TYPESCRIPT: 'typescript',
    PYTHON: 'python',
    CPP: 'cpp',
    GO: 'go',
  };
  return map[lang] || 'plaintext';
}

// ─── Props ─────────────────────────────────────────────────────────────────────
interface SnapshotPanelProps {
  workspaceId: string;
  fileId: string;
  fileName: string;
  language: ProgrammingLanguage;
  currentContent: string;
  isReadOnly: boolean;
  onRestored: (content: string) => void;
  onClose: () => void;
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export const SnapshotPanel: React.FC<SnapshotPanelProps> = ({
  workspaceId,
  fileId,
  fileName,
  language,
  currentContent,
  isReadOnly,
  onRestored,
  onClose,
}) => {
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotFull | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [message, setMessage] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const notify = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchSnapshots = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/files/${fileId}/snapshots`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      setSnapshots(await res.json());
    } catch (err: any) {
      notify('error', `Failed to load snapshots: ${err.message}`);
    } finally {
      setIsFetching(false);
    }
  }, [workspaceId, fileId]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/files/${fileId}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error(await res.text());
      notify('success', 'Snapshot created successfully');
      setMessage('');
      setShowCreateForm(false);
      await fetchSnapshots();
    } catch (err: any) {
      notify('error', err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelect = async (snap: SnapshotMeta) => {
    if (selectedSnapshot?.id === snap.id) {
      setSelectedSnapshot(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/snapshots/${snap.id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      setSelectedSnapshot(await res.json());
    } catch (err: any) {
      notify('error', `Failed to load snapshot: ${err.message}`);
    }
  };

  const handleRestore = async () => {
    if (!selectedSnapshot) return;
    const confirmed = window.confirm(
      `Restore to snapshot "${selectedSnapshot.message}"?\nThis will overwrite the current file content.`
    );
    if (!confirmed) return;

    setIsRestoring(true);
    try {
      const res = await fetch(
        `${API_BASE}/workspaces/${workspaceId}/snapshots/${selectedSnapshot.id}/restore`,
        { method: 'POST', credentials: 'include' }
      );
      if (!res.ok) throw new Error(await res.text());
      const { content } = await res.json();
      onRestored(content);
      notify('success', 'File restored to snapshot!');
      setSelectedSnapshot(null);
    } catch (err: any) {
      notify('error', err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDelete = async (snap: SnapshotMeta) => {
    const confirmed = window.confirm(`Delete snapshot "${snap.message}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/snapshots/${snap.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      if (selectedSnapshot?.id === snap.id) setSelectedSnapshot(null);
      notify('success', 'Snapshot deleted');
      await fetchSnapshots();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'flex-end',
        zIndex: 200,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 'min(95vw, 1100px)',
          height: '100%',
          backgroundColor: '#1e1e2e',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid rgba(137,180,250,0.15)',
        }}
      >
        {/* Panel Header */}
        <div
          style={{
            height: '54px',
            backgroundColor: '#181825',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GitBranch size={18} style={{ color: '#cba6f7' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Version History</div>
              <div style={{ fontSize: '0.75rem', color: '#585b70' }}>{fileName}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isReadOnly && (
              <button
                onClick={() => setShowCreateForm(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  backgroundColor: '#cba6f7',
                  color: '#1e1e2e',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Plus size={13} /> Save Snapshot
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6c7086',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#f38ba8')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#6c7086')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div
            style={{
              padding: '10px 20px',
              backgroundColor: notification.type === 'success' ? 'rgba(166,227,161,0.12)' : 'rgba(243,139,168,0.12)',
              borderBottom: `1px solid ${notification.type === 'success' ? 'rgba(166,227,161,0.25)' : 'rgba(243,139,168,0.25)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              color: notification.type === 'success' ? '#a6e3a1' : '#f38ba8',
            }}
          >
            {notification.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {notification.text}
          </div>
        )}

        {/* Create Snapshot Form */}
        {showCreateForm && (
          <form
            onSubmit={handleCreate}
            style={{
              padding: '16px 20px',
              backgroundColor: '#181825',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <input
              autoFocus
              type="text"
              placeholder="Snapshot message (e.g. 'Implemented auth logic')"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{
                flex: 1,
                backgroundColor: '#313244',
                border: '1px solid rgba(137,180,250,0.2)',
                borderRadius: '6px',
                padding: '8px 12px',
                color: '#cdd6f4',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={isCreating}
              style={{
                padding: '8px 16px',
                backgroundColor: isCreating ? '#313244' : '#cba6f7',
                color: '#1e1e2e',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                cursor: isCreating ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
              }}
            >
              {isCreating ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreateForm(false); setMessage(''); }}
              style={{
                padding: '8px',
                background: 'transparent',
                border: 'none',
                color: '#6c7086',
                cursor: 'pointer',
                borderRadius: '6px',
              }}
            >
              <X size={16} />
            </button>
          </form>
        )}

        {/* Body: List + Diff */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Snapshot List */}
          <div
            style={{
              width: '280px',
              flexShrink: 0,
              borderRight: '1px solid rgba(255,255,255,0.06)',
              overflowY: 'auto',
              backgroundColor: '#181825',
            }}
          >
            {isFetching ? (
              <div style={{ padding: '24px', color: '#585b70', fontSize: '0.85rem', textAlign: 'center' }}>
                Loading snapshots...
              </div>
            ) : snapshots.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <History size={32} style={{ color: '#313244', margin: '0 auto 12px' }} />
                <div style={{ color: '#585b70', fontSize: '0.85rem' }}>No snapshots yet.</div>
                {!isReadOnly && (
                  <div style={{ color: '#45475a', fontSize: '0.75rem', marginTop: '8px' }}>
                    Click "Save Snapshot" to checkpoint the current state.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '8px 0' }}>
                {snapshots.map((snap, idx) => {
                  const isSelected = selectedSnapshot?.id === snap.id;
                  return (
                    <div
                      key={snap.id}
                      onClick={() => handleSelect(snap)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderLeft: isSelected ? '3px solid #cba6f7' : '3px solid transparent',
                        backgroundColor: isSelected ? 'rgba(203,166,247,0.08)' : 'transparent',
                        transition: 'all 0.1s ease',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: idx === 0 ? '#a6e3a1' : '#45475a',
                            marginTop: '5px',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              color: isSelected ? '#cba6f7' : '#cdd6f4',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {snap.message}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', color: '#585b70', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={10} /> {relativeTime(snap.createdAt)}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#585b70', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <User size={10} /> {snap.createdBy.username}
                            </span>
                          </div>
                        </div>

                        {/* Delete button */}
                        {!isReadOnly && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(snap); }}
                            title="Delete snapshot"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#45475a',
                              cursor: 'pointer',
                              padding: '2px',
                              borderRadius: '3px',
                              display: 'flex',
                              alignItems: 'center',
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#f38ba8')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#45475a')}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Diff Viewer */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selectedSnapshot ? (
              <>
                {/* Diff Header */}
                <div
                  style={{
                    height: '44px',
                    backgroundColor: '#181825',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 16px',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8rem', color: '#9399b2' }}>
                    <span style={{ color: '#f38ba8' }}>← {selectedSnapshot.message}</span>
                    <ChevronRight size={14} />
                    <span style={{ color: '#a6e3a1' }}>Current version →</span>
                  </div>

                  {!isReadOnly && (
                    <button
                      onClick={handleRestore}
                      disabled={isRestoring}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        backgroundColor: isRestoring ? '#313244' : '#fab387',
                        color: '#1e1e2e',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: isRestoring ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <RotateCcw size={13} />
                      {isRestoring ? 'Restoring...' : 'Restore This Version'}
                    </button>
                  )}
                </div>

                {/* Monaco Diff Editor */}
                <div style={{ flex: 1 }}>
                  <DiffEditor
                    height="100%"
                    language={toMonacoLang(language)}
                    original={selectedSnapshot.content}
                    modified={currentContent}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      renderSideBySide: true,
                      fontSize: 13,
                      fontFamily: "'Fira Code', 'Cascadia Code', Consolas, Monaco, monospace",
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      diffWordWrap: 'on',
                      automaticLayout: true,
                      renderIndicators: true,
                    }}
                  />
                </div>
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#45475a',
                  gap: '12px',
                }}
              >
                <History size={48} style={{ opacity: 0.4 }} />
                <div style={{ fontSize: '0.9rem' }}>Select a snapshot to compare</div>
                <div style={{ fontSize: '0.75rem', color: '#313244', maxWidth: '280px', textAlign: 'center' }}>
                  Click any snapshot from the list to see a side-by-side diff with the current file state.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
