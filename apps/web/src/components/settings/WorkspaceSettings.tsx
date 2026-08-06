'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  X,
  Save,
  Trash2,
  Shield,
  Globe,
  Lock,
  Activity,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuditLogEntry {
  id: string;
  action: string;
  metadata: Record<string, any> | null;
  createdAt: string;
  user: { id: string; username: string };
}

// ─── Action display names ─────────────────────────────────────────────────────
const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  WORKSPACE_UPDATED: { label: 'Settings Updated', color: '#89b4fa' },
  SNAPSHOT_RESTORED: { label: 'Snapshot Restored', color: '#fab387' },
  FILE_CREATED:      { label: 'File Created',      color: '#a6e3a1' },
  FILE_DELETED:      { label: 'File Deleted',      color: '#f38ba8' },
  FOLDER_CREATED:    { label: 'Folder Created',    color: '#a6e3a1' },
  MEMBER_ADDED:      { label: 'Member Added',      color: '#cba6f7' },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Props ─────────────────────────────────────────────────────────────────────
interface WorkspaceSettingsProps {
  workspaceId: string;
  initialName: string;
  initialDescription: string | null;
  initialIsPublic: boolean;
  isOwner: boolean;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: (data: { name: string; description: string; isPublic: boolean }) => void;
}

// ─── Settings Modal ────────────────────────────────────────────────────────────
export const WorkspaceSettingsModal: React.FC<WorkspaceSettingsProps> = ({
  workspaceId,
  initialName,
  initialDescription,
  initialIsPublic,
  isOwner,
  onClose,
  onDeleted,
  onUpdated,
}) => {
  const [tab, setTab] = useState<'general' | 'audit'>('general');
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription || '');
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const notify = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchAuditLog = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/audit-log?limit=50`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      setAuditLogs(await res.json());
    } catch (err: any) {
      notify('error', `Failed to load audit log: ${err.message}`);
    } finally {
      setAuditLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (tab === 'audit') fetchAuditLog();
  }, [tab, fetchAuditLog]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), description: description.trim(), isPublic }),
      });
      if (!res.ok) throw new Error(await res.text());
      onUpdated({ name: name.trim(), description: description.trim(), isPublic });
      notify('success', 'Workspace settings saved!');
    } catch (err: any) {
      notify('error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== name) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      onDeleted();
    } catch (err: any) {
      notify('error', err.message);
      setIsDeleting(false);
    }
  };

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    backgroundColor: active ? '#313244' : 'transparent',
    color: active ? '#cdd6f4' : '#6c7086',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: active ? 600 : 400,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s',
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 'min(90vw, 700px)',
          maxHeight: '85vh',
          backgroundColor: '#1e1e2e',
          borderRadius: '12px',
          border: '1px solid rgba(137,180,250,0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            height: '56px',
            backgroundColor: '#181825',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={18} style={{ color: '#89b4fa' }} />
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Workspace Settings</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#6c7086', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#f38ba8')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#6c7086')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Bar */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            backgroundColor: '#181825',
            flexShrink: 0,
          }}
        >
          <button style={TAB_STYLE(tab === 'general')} onClick={() => setTab('general')}>
            <Settings size={14} /> General
          </button>
          <button style={TAB_STYLE(tab === 'audit')} onClick={() => setTab('audit')}>
            <Activity size={14} /> Audit Log
          </button>
        </div>

        {/* Notification */}
        {notification && (
          <div
            style={{
              padding: '10px 20px',
              backgroundColor: notification.type === 'success' ? 'rgba(166,227,161,0.1)' : 'rgba(243,139,168,0.1)',
              borderBottom: `1px solid ${notification.type === 'success' ? 'rgba(166,227,161,0.2)' : 'rgba(243,139,168,0.2)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              color: notification.type === 'success' ? '#a6e3a1' : '#f38ba8',
              flexShrink: 0,
            }}
          >
            {notification.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {notification.text}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
          {tab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* General Settings Form */}
              {isOwner ? (
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#9399b2', letterSpacing: '0.08em', margin: 0 }}>
                    GENERAL
                  </h3>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#9399b2', marginBottom: '6px' }}>
                      Workspace Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#313244',
                        border: '1px solid rgba(137,180,250,0.2)',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        color: '#cdd6f4',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#9399b2', marginBottom: '6px' }}>
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Optional workspace description..."
                      style={{
                        width: '100%',
                        backgroundColor: '#313244',
                        border: '1px solid rgba(137,180,250,0.2)',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        color: '#cdd6f4',
                        fontSize: '0.9rem',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Visibility Toggle */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#9399b2', marginBottom: '10px' }}>
                      Visibility
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {[
                        { value: false, label: 'Private', icon: <Lock size={14} />, desc: 'Only members can access' },
                        { value: true, label: 'Public', icon: <Globe size={14} />, desc: 'Anyone with the link can view' },
                      ].map(({ value, label, icon, desc }) => (
                        <div
                          key={String(value)}
                          onClick={() => setIsPublic(value)}
                          style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '8px',
                            border: `2px solid ${isPublic === value ? '#89b4fa' : 'rgba(255,255,255,0.08)'}`,
                            backgroundColor: isPublic === value ? 'rgba(137,180,250,0.08)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isPublic === value ? '#89b4fa' : '#9399b2', fontWeight: 600, fontSize: '0.85rem' }}>
                            {icon} {label}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#585b70', marginTop: '4px' }}>{desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={isSaving || !name.trim()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 20px',
                        backgroundColor: isSaving ? '#313244' : '#89b4fa',
                        color: '#1e1e2e',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Save size={14} />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ color: '#9399b2', fontSize: '0.85rem', padding: '8px', backgroundColor: 'rgba(137,180,250,0.05)', borderRadius: '6px', border: '1px solid rgba(137,180,250,0.1)' }}>
                  <Shield size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Only the workspace owner can modify settings.
                </div>
              )}

              {/* Danger Zone */}
              {isOwner && (
                <div
                  style={{
                    border: '1px solid rgba(243,139,168,0.2)',
                    borderRadius: '8px',
                    padding: '16px',
                    backgroundColor: 'rgba(243,139,168,0.04)',
                  }}
                >
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f38ba8', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 12px' }}>
                    <AlertTriangle size={15} /> Danger Zone
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#9399b2', margin: '0 0 12px' }}>
                    Permanently delete this workspace and all its files, snapshots, and history.
                    Type <strong style={{ color: '#f38ba8' }}>{name}</strong> to confirm.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder={`Type "${name}" to confirm`}
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      style={{
                        flex: 1,
                        backgroundColor: '#313244',
                        border: '1px solid rgba(243,139,168,0.2)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#cdd6f4',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={handleDelete}
                      disabled={deleteConfirm !== name || isDeleting}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        backgroundColor: deleteConfirm === name && !isDeleting ? '#f38ba8' : '#313244',
                        color: deleteConfirm === name ? '#1e1e2e' : '#6c7086',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: deleteConfirm !== name || isDeleting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s',
                        flexShrink: 0,
                      }}
                    >
                      <Trash2 size={13} />
                      {isDeleting ? 'Deleting...' : 'Delete Workspace'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'audit' && (
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#9399b2', letterSpacing: '0.08em', margin: '0 0 16px' }}>
                ACTIVITY LOG (Last 50)
              </h3>

              {auditLoading ? (
                <div style={{ color: '#585b70', fontSize: '0.85rem', textAlign: 'center', padding: '24px' }}>
                  Loading activity log...
                </div>
              ) : auditLogs.length === 0 ? (
                <div style={{ color: '#45475a', fontSize: '0.85rem', textAlign: 'center', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Activity size={32} style={{ opacity: 0.4 }} />
                  No activity logged yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {auditLogs.map((log) => {
                    const display = ACTION_LABELS[log.action] || { label: log.action, color: '#9399b2' };
                    const isExpanded = expandedLog === log.id;

                    return (
                      <div
                        key={log.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          backgroundColor: isExpanded ? 'rgba(255,255,255,0.04)' : 'transparent',
                          cursor: log.metadata ? 'pointer' : 'default',
                          transition: 'background 0.1s',
                        }}
                        onClick={() => log.metadata && setExpandedLog(isExpanded ? null : log.id)}
                        onMouseEnter={(e) => { if (!isExpanded) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.02)'; }}
                        onMouseLeave={(e) => { if (!isExpanded) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: display.color,
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ fontSize: '0.85rem', color: display.color, fontWeight: 600 }}>
                              {display.label}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#585b70', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <User size={10} /> {log.user.username}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.7rem', color: '#45475a', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={10} /> {relativeTime(log.createdAt)}
                            </span>
                            {log.metadata && (
                              isExpanded ? <ChevronDown size={12} style={{ color: '#585b70' }} /> : <ChevronRight size={12} style={{ color: '#585b70' }} />
                            )}
                          </div>
                        </div>

                        {isExpanded && log.metadata && (
                          <pre
                            style={{
                              marginTop: '8px',
                              padding: '8px',
                              backgroundColor: '#181825',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              color: '#9399b2',
                              overflow: 'auto',
                              fontFamily: 'monospace',
                            }}
                          >
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
