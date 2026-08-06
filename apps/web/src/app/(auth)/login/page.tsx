'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Code2, LogIn, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { apiFetch } from '../../../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const setAuth = useAuthStore((state) => state.setAuth);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setAuth(data.user, data.accessToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="glass-panel animate-scale-in" style={{ width: '100%', maxWidth: '440px', padding: '44px 40px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            display: 'inline-flex',
            background: 'linear-gradient(135deg, var(--blue), var(--mauve))',
            padding: '14px',
            borderRadius: '18px',
            marginBottom: '18px',
            boxShadow: '0 8px 24px rgba(137, 180, 250, 0.25)'
          }}>
            <Code2 size={34} color="#11111b" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text)' }}>
            Welcome back
          </h1>
          <p style={{ color: 'var(--subtext0)', fontSize: '0.93rem' }}>
            Sign in to your CodeSphere workspaces
          </p>
        </div>

        {error && (
          <div className="alert-error">
            <AlertCircle size={16} strokeWidth={2.5} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label className="form-label">Email Address</label>
            <input
              type="email"
              required
              className="input-field"
              placeholder="developer@codesphere.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '13px' }}
          >
            {isSubmitting ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px' }} />
                Signing in…
              </>
            ) : (
              <>Sign In <LogIn size={16} /></>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--overlay1)', fontSize: '0.88rem', marginTop: '28px' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: 'var(--blue)', fontWeight: 600, transition: 'color var(--ease-fast)' }}>
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
