import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Video, 
  MessageSquare, 
  Users, 
  AlertCircle,
  CheckCircle2,
  Zap
} from 'lucide-react';

const Login = () => {
  const [identifier, setIdentifier] = useState(''); // username, email, or phone
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Load remembered username if present
  useEffect(() => {
    const saved = localStorage.getItem('chatera_remembered_user');
    if (saved) {
      setIdentifier(saved);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter your username/email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await login(identifier.trim(), password);
      if (res.success) {
        if (rememberMe) {
          localStorage.setItem('chatera_remembered_user', identifier.trim());
        } else {
          localStorage.removeItem('chatera_remembered_user');
        }
        navigate('/');
      } else {
        setError(res.message || 'Invalid username or password.');
      }
    } catch (err) {
      setError('Connection failed. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill demo credentials for effortless testing
  const handleQuickFill = (demoUser, demoPass) => {
    setIdentifier(demoUser);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="auth-page" style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      
      {/* Dark tint backdrop layer */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(10, 15, 30, 0.72)',
        backdropFilter: 'blur(8px)',
        zIndex: 1
      }} />

      {/* Main Glassmorphic Container (Split Card Layout) */}
      <div 
        className="glass-panel animate-fade-in" 
        style={{ 
          position: 'relative',
          zIndex: 3,
          width: '100%', 
          maxWidth: '920px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          borderRadius: '24px',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(59, 130, 246, 0.15)'
        }}
      >
        
        {/* Left Side: Brand & Feature Highlights */}
        <div style={{
          padding: '3rem 2.5rem',
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            {/* Brand Logo & Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.5)'
              }}>
                <Sparkles size={24} />
              </div>
              <div>
                <span className="brand" style={{ fontSize: '1.85rem', lineHeight: 1 }}>Chatera</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Next-Gen Communication
                </div>
              </div>
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.75rem', lineHeight: 1.25 }}>
              Connect with Anyone, <span style={{ background: 'linear-gradient(135deg, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Anywhere.</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Real-time video conferencing, instant messaging, community networking, and 3D customizable profile avatars.
            </p>

            {/* Feature Badges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
                  <Video size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>HD Peer-to-Peer Calls</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Instant room meetings & direct 1-on-1 calls</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
                  <MessageSquare size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Direct Messaging & Emojis</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Rich chat, media sharing & live presence</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                  <Users size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Global Community Discovery</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Discover new people or search registered users</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security Pill */}
          <div style={{ 
            marginTop: '2.5rem', 
            padding: '0.65rem 1rem', 
            borderRadius: '12px', 
            backgroundColor: 'rgba(255, 255, 255, 0.04)', 
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}>
            <ShieldCheck size={16} color="var(--success)" />
            <span>End-to-End Encrypted Session Authentication</span>
          </div>
        </div>

        {/* Right Side: Sign In Form */}
        <div style={{
          padding: '3rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.85)'
        }}>
          
          {/* Header Switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>Welcome Back</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                Sign in to your Chatera account
              </p>
            </div>
            
            <Link 
              to="/register" 
              style={{
                fontSize: '0.85rem',
                color: 'var(--primary-color)',
                textDecoration: 'none',
                fontWeight: 600,
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                transition: 'all 0.2s'
              }}
            >
              Sign Up
            </Link>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--danger)',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              animation: 'shake 0.35s ease'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            
            {/* Username / Email / Phone input */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Account Identity</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Username, email, or phone</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User 
                  size={18} 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '1rem',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)'
                  }}
                />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Enter username, email or phone"
                  value={identifier} 
                  onChange={(e) => setIdentifier(e.target.value)} 
                  style={{ paddingLeft: '2.75rem' }}
                  required 
                  autoFocus
                />
              </div>
            </div>

            {/* Password input */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Password</label>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock 
                  size={18} 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '1rem',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)'
                  }}
                />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="form-input" 
                  placeholder="Enter your password"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: '0.75rem',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                />
                Remember my username
              </label>

              <button
                type="button"
                onClick={() => handleQuickFill('naveen', 'password123')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-color)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
                title="Fill with test account"
              >
                <Zap size={13} /> Quick Test Fill
              </button>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '0.85rem', 
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                borderRadius: '10px'
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid white', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer Register Link */}
          <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Don't have an account yet?{' '}
            <Link to="/register" style={{ color: 'var(--primary-color)', fontWeight: 600, textDecoration: 'none' }}>
              Create Account
            </Link>
          </div>

        </div>

      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;
