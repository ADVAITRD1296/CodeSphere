'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Code2, Users, Cpu, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export default function LandingPage() {
  const { user, checkAuth, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#94a3b8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem' }}>
          <Code2 size={28} style={{ color: '#3b82f6' }} />
          <span>Loading CodeSphere...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 48px', borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Code2 size={24} color="#ffffff" />
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }} className="gradient-text">
            CodeSphere
          </span>
        </div>

        <nav style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {user ? (
            <Link href="/dashboard" className="btn-primary">
              Go to Workspace Dashboard <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">
                Sign In
              </Link>
              <Link href="/register" className="btn-primary">
                Get Started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', marginBottom: '24px', fontSize: '0.9rem', fontWeight: 600 }}>
          <Zap size={16} /> Real-Time Multiplayer IDE + Sandboxed Execution
        </div>

        <h1 style={{ fontSize: '3.75rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '24px' }}>
          Real-Time Collaborative Coding <br />
          <span className="gradient-text">Built for High-Stakes Engineering</span>
        </h1>

        <p style={{ fontSize: '1.25rem', color: '#94a3b8', maxWidth: '780px', margin: '0 auto 40px auto', lineHeight: 1.6 }}>
          CodeSphere brings Google Docs-style conflict-free multiplayer editing to VS Code with Yjs CRDTs, paired with isolated Docker multi-language code execution.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <Link href={user ? '/dashboard' : '/register'} className="btn-primary" style={{ padding: '14px 32px', fontSize: '1.1rem' }}>
            {user ? 'Open Workspaces' : 'Start Coding Live'} <ArrowRight size={20} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', marginTop: '90px' }}>
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'left' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', color: '#60a5fa' }}>
              <Users size={24} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '12px' }}>CRDT Multiplayer Sync</h3>
            <p style={{ color: '#94a3b8', lineHeight: 1.5 }}>
              Yjs state vectors ensure sub-50ms synchronization across connected clients with zero text collision or race conditions.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '32px', textAlign: 'left' }}>
            <div style={{ background: 'rgba(139, 92, 246, 0.15)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', color: '#c084fc' }}>
              <Cpu size={24} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '12px' }}>Docker Container Sandboxes</h3>
            <p style={{ color: '#94a3b8', lineHeight: 1.5 }}>
              Isolated execution environments for Node.js, Python, C++, and Go with hard CPU, RAM, network, and timeout constraints.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '32px', textAlign: 'left' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', color: '#34d399' }}>
              <ShieldCheck size={24} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '12px' }}>Granular Role Control</h3>
            <p style={{ color: '#94a3b8', lineHeight: 1.5 }}>
              Role-Based Access Control (Owner, Editor, Viewer) backed by JWT authentication and refresh token rotation.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
