import React, { useState } from 'react';
import useAuthStore from '../../stores/useAuthStore';

export default function AuthModal() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');

  const signIn = useAuthStore(s => s.signIn);
  const signUp = useAuthStore(s => s.signUp);
  const signInWithGoogle = useAuthStore(s => s.signInWithGoogle);
  const isLoading = useAuthStore(s => s.isLoading);
  const error = useAuthStore(s => s.error);
  const clearError = useAuthStore(s => s.clearError);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccess('');
    clearError();

    if (!email.trim() || !password.trim()) {
      setLocalError('Please fill in all fields');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match');
        return;
      }
      try {
        const data = await signUp(email, password);
        if (data && !data.session) {
          setSuccess('Check your email to confirm your account!');
        }
      } catch {}
    } else {
      try {
        await signIn(email, password);
      } catch {}
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError('');
    setSuccess('');
    clearError();
    try {
      await signInWithGoogle();
    } catch {}
  };

  const switchMode = () => {
    setMode(m => m === 'signin' ? 'signup' : 'signin');
    setLocalError('');
    setSuccess('');
    clearError();
  };

  const displayError = localError || error;

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: 420, overflow: 'visible' }}>
        <div style={{ padding: '32px 32px 28px' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 20, marginBottom: 8 }}>
              <img src="/logo.png" alt="SnapVerse" style={{ height: 48 }} />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: 'var(--color-text-primary)' }}>
                SnapVerse
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
              AI-powered reel editor
            </p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-pill)', padding: 3 }}>
            <button
              className={`pill-tab ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => switchMode()}
              style={{ flex: 1, justifyContent: 'center', padding: '8px 0' }}
            >
              Sign In
            </button>
            <button
              className={`pill-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => switchMode()}
              style={{ flex: 1, justifyContent: 'center', padding: '8px 0' }}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                style={{ height: 40 }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ height: 40 }}
              />
            </div>

            {mode === 'signup' && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  className="input-field"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ height: 40 }}
                />
              </div>
            )}

            {/* Error */}
            {displayError && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-default)',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: 12,
                marginBottom: 14,
              }}>
                {displayError}
              </div>
            )}

            {/* Success */}
            {success && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-default)',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#16a34a',
                fontSize: 12,
                marginBottom: 14,
              }}>
                {success}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px 0',
                fontSize: 14,
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <div style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              ) : (
                mode === 'signin' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-outline-variant)' }}></div>
            <span style={{ margin: '0 12px', fontSize: 12, color: 'var(--color-text-muted)' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-outline-variant)' }}></div>
          </div>

          {/* Google OAuth Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '12px 0',
              fontSize: 14,
              backgroundColor: 'white',
              border: '1px solid var(--color-outline-variant)',
              borderRadius: 'var(--radius-default)',
              color: 'var(--color-text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              transition: 'all 0.2s',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = 'var(--color-surface-container-lowest)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = 'white';
              }
            }}
          >
            {isLoading ? (
              <div style={{ width: 16, height: 16, border: '2px solid var(--color-text-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M16.51 9.2c0-.6-.05-1.2-.15-1.8H9v3.4h4.1c-.2 1-.7 1.8-1.5 2.4v2.2h2.4c1.4-1.3 2.2-3.2 2.2-5.2z"/>
                  <path fill="#34A853" d="M9 17c2 0 3.6-.7 4.8-1.8l-2.4-2.2c-.7.5-1.5.7-2.4.7-1.8 0-3.4-1.2-3.9-2.9H2.6v2.3C3.8 15.5 6.2 17 9 17z"/>
                  <path fill="#FBBC05" d="M5.1 10.8c-.1-.4-.2-.8-.2-1.3s.1-.9.2-1.3V6H2.6C2.2 6.8 2 7.8 2 8.8s.2 2 .6 2.8l2.5-1.8z"/>
                  <path fill="#EA4335" d="M9 3.8c1 0 1.9.3 2.6.9l2.1-2.1C12.6 1.5 11 1 9 1 6.2 1 3.8 2.5 2.6 4.8l2.5 2.3c.5-1.7 2.1-2.9 3.9-2.9z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Footer */}
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 20 }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={switchMode}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-accent-primary)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 12,
                padding: 0,
              }}
            >
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
