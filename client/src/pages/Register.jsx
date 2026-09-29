import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  XCircle,
  ShieldCheck, 
  AlertCircle,
  Smile,
  Zap,
  Globe
} from 'lucide-react';
import { BUILTIN_AVATARS } from '../utils/avatarGallery';

const STARTER_AVATARS = [
  BUILTIN_AVATARS[0], // Alex (3D)
  BUILTIN_AVATARS[1], // Maya (3D)
  BUILTIN_AVATARS[8], // Cyber Bot (Bottts)
  BUILTIN_AVATARS[14], // Luna (Lorelei)
  BUILTIN_AVATARS[20], // Cosmic Violet (Gradient)
  BUILTIN_AVATARS[21], // Solar Flare (Gradient)
];

const Register = () => {
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    avatar: STARTER_AVATARS[0]?.url || ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  // Password strength calculator
  const calculateStrength = (pass) => {
    if (!pass) return { score: 0, text: 'Empty', color: '#64748b' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { score: 1, text: 'Weak', color: '#ef4444' };
    if (score <= 4) return { score: 2, text: 'Medium', color: '#f59e0b' };
    return { score: 3, text: 'Strong', color: '#10b981' };
  };

  const strength = calculateStrength(formData.password);
  const passwordsMatch = formData.password && formData.password === formData.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!formData.username.trim() || !formData.email.trim() || !formData.phoneNumber.trim() || !formData.password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    if (!agreeTerms) {
      setError('You must agree to the Terms of Service to create an account.');
      return;
    }

    setLoading(true);

    try {
      const res = await register(
        formData.username.toLowerCase().trim(),
        formData.email.trim(),
        formData.phoneNumber.trim(),
        formData.password,
        formData.displayName.trim() || formData.username.trim(),
        formData.avatar
      );

      if (res.success) {
        navigate('/');
      } else {
        setError(res.message || 'Registration failed.');
      }
    } catch (err) {
      setError('Connection error. Please check if the server is active.');
    } finally {
      setLoading(false);
    }
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
          maxWidth: '1020px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          borderRadius: '24px',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(139, 92, 246, 0.15)',
          margin: '1.5rem 0'
        }}
      >
        
        {/* Left Side: Registration Perks & Visual Welcome */}
        <div style={{
          padding: '3rem 2.5rem',
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
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
                background: 'linear-gradient(135deg, var(--accent-color), var(--primary-color))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.5)'
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

            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginBottom: '0.75rem', lineHeight: 1.25 }}>
              Join the Global <span style={{ background: 'linear-gradient(135deg, #c084fc, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Community.</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Get your personalized account in seconds with zero fees. Video call, chat, and connect instantly.
            </p>

            {/* Registration Benefits List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', flexShrink: 0 }}>
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Instant Profile & Handle</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Claim your unique @username and customize your status</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)', flexShrink: 0 }}>
                  <Smile size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>3D Avatars & WebCam DP</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pick from 26+ built-in characters or snap a webcam photo</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)', flexShrink: 0 }}>
                  <Zap size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Ultra-Fast WebRTC Meetings</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Zero download required — works directly in any modern browser</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security Note */}
          <div style={{ 
            marginTop: '2.5rem', 
            padding: '0.75rem 1rem', 
            borderRadius: '12px', 
            backgroundColor: 'rgba(255, 255, 255, 0.04)', 
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}>
            <ShieldCheck size={18} color="var(--success)" />
            <span>Your credentials are encrypted using bcrypt & JWT standards</span>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div style={{
          padding: '2.5rem',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          overflowY: 'auto',
          maxHeight: '90vh'
        }}>
          
          {/* Header Switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>Create Account</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                Join Chatera today — it takes less than a minute
              </p>
            </div>
            
            <Link 
              to="/login" 
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
              Sign In
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
              marginBottom: '1.25rem',
              animation: 'shake 0.35s ease'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            
            {/* Starter Avatar Picker Strip */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ marginBottom: '0.4rem' }}>
                Pick a Starter Avatar (Optional)
              </label>
              <div style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.4rem' }}>
                {STARTER_AVATARS.map((av, idx) => {
                  const isSelected = formData.avatar === av.url;
                  return (
                    <div
                      key={idx}
                      onClick={() => setFormData({ ...formData, avatar: av.url })}
                      style={{
                        position: 'relative',
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        flexShrink: 0,
                        border: isSelected ? '3px solid var(--primary-color)' : '2px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: isSelected ? '0 0 12px rgba(59, 130, 246, 0.6)' : 'none',
                        transition: 'transform 0.2s ease',
                        transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                        overflow: 'hidden'
                      }}
                      title={av.name}
                    >
                      <img src={av.url} alt={av.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Row 1: Full Name & Username */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', top: '50%', left: '0.9rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Naveen Kumar"
                    value={formData.displayName} 
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })} 
                    style={{ paddingLeft: '2.5rem', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Username <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', top: '50%', left: '0.9rem', transform: 'translateY(-50%)', color: 'var(--primary-color)', fontWeight: 600, fontSize: '0.9rem' }}>@</span>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="handle"
                    value={formData.username} 
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })} 
                    style={{ paddingLeft: '2.5rem', fontSize: '0.9rem' }}
                    required 
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Email & Phone Number */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email Address <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', top: '50%', left: '0.9rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="name@domain.com"
                    value={formData.email} 
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                    style={{ paddingLeft: '2.5rem', fontSize: '0.9rem' }}
                    required 
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Phone Number <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', top: '50%', left: '0.9rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input 
                    type="tel" 
                    className="form-input" 
                    placeholder="+91 9876543210"
                    value={formData.phoneNumber} 
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} 
                    style={{ paddingLeft: '2.5rem', fontSize: '0.9rem' }}
                    required 
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Password & Confirm Password */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Password <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', top: '50%', left: '0.9rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    className="form-input" 
                    placeholder="At least 6 characters"
                    value={formData.password} 
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.25rem', fontSize: '0.9rem' }}
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', top: '50%', right: '0.5rem', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Confirm Password <span style={{ color: 'var(--danger)' }}>*</span></span>
                  {passwordsMatch && (
                    <span style={{ color: 'var(--success)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <CheckCircle2 size={12} /> Matched
                    </span>
                  )}
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', top: '50%', left: '0.9rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    className="form-input" 
                    placeholder="Re-enter password"
                    value={formData.confirmPassword} 
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} 
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.25rem', fontSize: '0.9rem' }}
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ position: 'absolute', top: '50%', right: '0.5rem', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Strength Meter */}
            {formData.password && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Password Strength</span>
                  <span style={{ color: strength.color, fontWeight: 600 }}>{strength.text}</span>
                </div>
                <div style={{ display: 'flex', gap: '4px', height: '4px' }}>
                  <div style={{ flex: 1, backgroundColor: strength.score >= 1 ? strength.color : '#334155', borderRadius: '2px', transition: 'all 0.3s' }} />
                  <div style={{ flex: 1, backgroundColor: strength.score >= 2 ? strength.color : '#334155', borderRadius: '2px', transition: 'all 0.3s' }} />
                  <div style={{ flex: 1, backgroundColor: strength.score >= 3 ? strength.color : '#334155', borderRadius: '2px', transition: 'all 0.3s' }} />
                </div>
              </div>
            )}

            {/* Agree Terms Checkbox */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <input 
                type="checkbox" 
                id="terms"
                checked={agreeTerms} 
                onChange={(e) => setAgreeTerms(e.target.checked)} 
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)', cursor: 'pointer', marginTop: '2px' }}
              />
              <label htmlFor="terms" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: 1.4 }}>
                I agree to the <span style={{ color: 'var(--primary-color)' }}>Terms of Service</span> and <span style={{ color: 'var(--primary-color)' }}>Privacy Policy</span>.
              </label>
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
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer Login Link */}
          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary-color)', fontWeight: 600, textDecoration: 'none' }}>
              Sign In
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

export default Register;
