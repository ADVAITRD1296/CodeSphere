'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Code2,
  Plus,
  Search,
  LogOut,
  FolderGit2,
  Users,
  ExternalLink,
  Shield
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { apiFetch } from '../../lib/api';
import { WorkspaceDto } from '@codesphere/shared';

export default function DashboardPage() {
  const { user, checkAuth, logout, isLoading } = useAuthStore();
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFetching, setIsFetching] = useState(true);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [newWsPublic, setNewWsPublic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const router = useRouter();

  useEffect(() => {
    checkAuth().then((authenticated) => {
      if (!authenticated) {
        router.push('/login');
      } else {
        loadWorkspaces();
      }
    });
  }, []);

  const loadWorkspaces = async () => {
    setIsFetching(true);
    try {
      const data = await apiFetch<WorkspaceDto[]>('/workspaces');
      setWorkspaces(data);
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    setCreateError('');
    setIsCreating(true);

    try {
      const newWs = await apiFetch<WorkspaceDto>('/workspaces', {
        method: 'POST',
        body: JSON.stringify({
          name: newWsName.trim(),
          description: newWsDesc.trim(),
          isPublic: newWsPublic
        })
      });

      setShowCreateModal(false);
      setNewWsName('');
      setNewWsDesc('');
      setNewWsPublic(false);
      router.push(`/workspace/${newWs.id}`);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredWorkspaces = workspaces.filter(ws =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ws.description && ws.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading || isFetching) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--crust)', color: 'var(--subtext0)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.05rem', fontWeight: 500 }}>
          <span className="spinner" />
          <span>Loading Workspaces…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--crust)', color: 'var(--text)' }}>
      {/* Sticky Glassmorphism Navbar */}
      <header className="dash-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--blue), var(--mauve))',
            padding: '8px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(137, 180, 250, 0.25)'
          }}>
            <Code2 size={20} color="#11111b" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: '1.2rem', fontWeight: 800 }} className="gradient-text">
            CodeSphere
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--mauve), var(--pink))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.9rem', color: '#11111b',
                boxShadow: '0 2px 8px rgba(203, 166, 247, 0.3)'
              }}>
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--subtext1)' }}>{user.username}</span>
            </div>
          )}
          <button
            onClick={() => logout().then(() => router.push('/login'))}
            className="btn-secondary"
            style={{ padding: '7px 14px', fontSize: '0.82rem' }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '52px 28px' }}>
        {/* Page Title Row */}
        <div className="animate-slide-down" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text)' }}>
              Your Workspaces
            </h1>
            <p style={{ color: 'var(--subtext0)', fontSize: '0.93rem' }}>
              Collaborate live with real-time voice, video &amp; multiplayer editing
            </p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus size={17} /> Create Workspace
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '36px', maxWidth: '440px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--overlay0)', pointerEvents: 'none' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search workspaces…"
            style={{ paddingLeft: '42px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Workspace Grid */}
        {filteredWorkspaces.length === 0 ? (
          <div className="glass-panel animate-fade-in" style={{ padding: '56px', textAlign: 'center' }}>
            <FolderGit2 size={48} style={{ color: 'var(--surface1)', display: 'block', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>
              {searchQuery ? 'No workspaces match your search' : 'No workspaces yet'}
            </h3>
            <p style={{ color: 'var(--subtext0)', fontSize: '0.9rem', marginBottom: '24px' }}>
              {searchQuery
                ? 'Try a different search term.'
                : 'Create your first collaborative workspace to get started.'}
            </p>
            {!searchQuery && (
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                <Plus size={17} /> Create Workspace
              </button>
            )}
          </div>
        ) : (
          <div
            className="stagger-children"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}
          >
            {filteredWorkspaces.map((ws) => {
              const userMember = ws.members.find(m => m.userId === user?.id);
              const userRole = userMember?.role || 'EDITOR';

              return (
                <div key={ws.id} className="ws-card">
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <h3 style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--text)', flex: 1, marginRight: '10px' }}>
                        {ws.name}
                      </h3>
                      <span className={`badge badge-${userRole.toLowerCase()}`}>{userRole}</span>
                    </div>
                    <p style={{
                      color: 'var(--subtext0)', fontSize: '0.875rem', lineHeight: 1.55,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                    }}>
                      {ws.description || 'No description provided.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: 'var(--overlay0)', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={13} />
                        <span>{ws.members.length} member{ws.members.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FolderGit2 size={13} />
                        <span>{ws.files.length} file{ws.files.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <Link href={`/workspace/${ws.id}`} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', gap: '5px' }}>
                      Open <ExternalLink size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <div style={{ padding: '8px', background: 'linear-gradient(135deg, var(--blue), var(--mauve))', borderRadius: '10px', display: 'flex' }}>
                <Plus size={18} color="#11111b" />
              </div>
              <h3 style={{ margin: 0 }}>New Workspace</h3>
            </div>

            {createError && (
              <div className="alert-error">{createError}</div>
            )}

            <form onSubmit={handleCreateWorkspace} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Workspace Name</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Distributed System Algorithms"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Description (optional)</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Brief summary of the project room…"
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newWsPublic}
                  onChange={(e) => setNewWsPublic(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--blue)' }}
                />
                <label htmlFor="isPublic" style={{ fontSize: '0.85rem', color: 'var(--subtext1)', cursor: 'pointer' }}>
                  Make workspace publicly viewable via direct link
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={isCreating} className="btn-primary">
                  {isCreating ? (
                    <><span className="spinner" style={{ width: '14px', height: '14px' }} /> Creating…</>
                  ) : (
                    <><Plus size={15} /> Create &amp; Open</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
