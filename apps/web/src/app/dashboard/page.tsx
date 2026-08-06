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
  Clock, 
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
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#94a3b8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem' }}>
          <Code2 size={28} style={{ color: '#3b82f6' }} />
          <span>Loading Workspaces...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc' }}>
      {/* Top Navbar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 40px', borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Code2 size={22} color="#ffffff" />
          </div>
          <span style={{ fontSize: '1.3rem', fontWeight: 800 }} className="gradient-text">
            CodeSphere
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.95rem' }}>
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{user.username}</span>
            </div>
          )}

          <button onClick={() => logout().then(() => router.push('/login'))} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '6px' }}>Your Workspaces</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Collaborate live on code rooms in real-time</p>
          </div>

          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus size={18} /> Create Workspace
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '32px', maxWidth: '480px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search workspaces by name..."
            style={{ paddingLeft: '44px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Workspace Grid */}
        {filteredWorkspaces.length === 0 ? (
          <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
            <FolderGit2 size={48} style={{ color: '#64748b', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>No workspaces found</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '20px' }}>
              {searchQuery ? 'No workspaces match your search term.' : 'Get started by creating your first collaborative workspace.'}
            </p>
            {!searchQuery && (
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                <Plus size={18} /> Create Workspace
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
            {filteredWorkspaces.map((ws) => {
              const userMember = ws.members.find(m => m.userId === user?.id);
              const userRole = userMember?.role || 'EDITOR';

              return (
                <div key={ws.id} className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '220px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>{ws.name}</h3>
                      <span className={`badge badge-${userRole.toLowerCase()}`}>
                        {userRole}
                      </span>
                    </div>

                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.4, marginBottom: '16px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {ws.description || 'No description provided.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={14} />
                        <span>{ws.members.length} member{ws.members.length > 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FolderGit2 size={14} />
                        <span>{ws.files.length} file{ws.files.length > 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <Link href={`/workspace/${ws.id}`} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                      Open Room <ExternalLink size={14} />
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '440px', padding: '32px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '20px' }}>Create New Workspace</h2>

            {createError && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem' }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateWorkspace} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Workspace Name</label>
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
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Description (Optional)</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Brief summary of the project room..."
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newWsPublic}
                  onChange={(e) => setNewWsPublic(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="isPublic" style={{ fontSize: '0.85rem', color: '#cbd5e1', cursor: 'pointer' }}>
                  Make workspace publicly viewable via direct link
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isCreating} className="btn-primary">
                  {isCreating ? 'Creating...' : 'Create & Open'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
