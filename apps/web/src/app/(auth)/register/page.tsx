'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Code2, UserPlus, AlertCircle, X } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { apiFetch } from '../../../lib/api';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
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
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, username, password }),
      });

      setAuth(data.user, data.accessToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="glass-panel animate-scale-in" style={{ width: '100%', maxWidth: '440px', padding: '44px 40px', position: 'relative' }}>

        {/* Close button — goes back to home page */}
        <Link
          href="/"
          aria-label="Back to home"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            color: 'var(--overlay1)',
            backgroundColor: 'transparent',
            border: '1px solid var(--border)',
            transition: 'all 0.15s ease',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--surface0)';
            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--overlay1)';
          }}
        >
          <X size={16} strokeWidth={2.5} />
        </Link>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            display: 'inline-flex',
            background: 'linear-gradient(135deg, var(--mauve), var(--pink))',
            padding: '14px',
            borderRadius: '18px',
            marginBottom: '18px',
            boxShadow: '0 8px 24px rgba(203, 166, 247, 0.25)'
          }}>
            <Code2 size={34} color="#11111b" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text)' }}>
            Create Account
          </h1>
          <p style={{ color: 'var(--subtext0)', fontSize: '0.93rem' }}>
            Join CodeSphere to collaborate live on code
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
            <label className="form-label">Username</label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="alex_dev"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

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
                Creating account…
              </>
            ) : (
              <>Create Account <UserPlus size={16} /></>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--overlay1)', fontSize: '0.88rem', marginTop: '28px' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--blue)', fontWeight: 600 }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
