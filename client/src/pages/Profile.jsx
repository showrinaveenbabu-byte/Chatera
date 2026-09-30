import React, { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import api, { getErrorMessage } from '../utils/api';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Camera, 
  Save, 
  Edit3, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Check, 
  Copy, 
  Sparkles, 
  UploadCloud, 
  Link as LinkIcon, 
  X, 
  ShieldCheck, 
  Smile, 
  Trash2, 
  Info,
  Video,
  RefreshCw,
  AlertTriangle,
  Clipboard
} from 'lucide-react';
import { BUILTIN_AVATARS, AVATAR_CATEGORIES, compressAvatarFile } from '../utils/avatarGallery';

const STATUS_OPTIONS = [
  { value: 'online', label: 'Online', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  { value: 'away', label: 'Away', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  { value: 'busy', label: 'Busy (Do Not Disturb)', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  { value: 'offline', label: 'Offline / Invisible', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' },
];

const PRESET_STATUS_MESSAGES = [
  '💬 Available to chat',
  '💻 In a deep coding flow',
  '🎧 Listening to music',
  '☕ Grabbing a coffee break',
  '🚀 Working on exciting projects',
  '🔕 Busy, will reply later',
  '🌴 Out of office',
  '✨ Exploring new ideas'
];

const isValidAvatar = (url) => {
  if (!url || typeof url !== 'string') return false;
  if (url.includes('placeholder.com') || url.trim() === '') return false;
  return url.startsWith('http') || url.startsWith('data:image');
};

const Profile = () => {
  const { user, updateUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Feedback alerts
  const [toastMessage, setToastMessage] = useState('');
  const [copiedField, setCopiedField] = useState(null);

  // Avatar Modal State
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarTab, setAvatarTab] = useState('inbuilt'); // 'inbuilt' | 'camera' | 'upload' | 'url'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [tempAvatar, setTempAvatar] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    email: '',
    phoneNumber: '',
    bio: '',
    location: '',
    occupation: '',
    status: 'online',
    statusMessage: '',
    avatar: ''
  });

  // Fetch full profile from API
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/users/profile');
      const data = res.data;
      setProfile(data);
      setFormData({
        username: data.username || '',
        displayName: data.displayName || data.username || '',
        email: data.email || '',
        phoneNumber: data.phoneNumber || '',
        bio: data.bio || '',
        location: data.location || '',
        occupation: data.occupation || '',
        status: data.status || 'online',
        statusMessage: data.statusMessage || '',
        avatar: data.avatar || ''
      });
      setTempAvatar(data.avatar || '');
    } catch (err) {
      console.error('Error fetching profile:', err);
      showToast('Could not load profile. Using local profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchProfile();
    }
  }, [user?.token]);

  // Clipboard Paste (Ctrl + V) Handler for Instant Avatar Selection
  useEffect(() => {
    if (!isAvatarModalOpen) return;

    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            try {
              setIsProcessingImage(true);
              setUploadError('');
              const compressed = await compressAvatarFile(file, 400, 0.88);
              setTempAvatar(compressed);
              showToast('Image pasted directly from clipboard!');
            } catch (err) {
              setUploadError(err.message || 'Failed to process pasted image.');
            } finally {
              setIsProcessingImage(false);
            }
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isAvatarModalOpen]);

  // Clean up camera stream on unmount or modal close
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showToast(`Copied ${fieldName} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Webcam Controls
  const startWebcam = async () => {
    try {
      setCameraError('');
      stopWebcam();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error('Webcam start error:', err);
      setCameraError('Unable to access camera. Please allow camera permissions or try another method.');
      setIsCameraActive(false);
    }
  };

  const stopWebcam = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureWebcamPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError('Camera stream not ready yet. Please wait a second.');
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      const size = Math.min(video.videoWidth, video.videoHeight);
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');

      // Center crop square from video feed
      const startX = (video.videoWidth - size) / 2;
      const startY = (video.videoHeight - size) / 2;

      // Mirror for natural selfie look
      ctx.translate(400, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, startX, startY, size, size, 0, 0, 400, 400);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setTempAvatar(dataUrl);
      showToast('Snapshot captured! Click "Apply Avatar" to save.');
      stopWebcam();
    } catch (err) {
      console.error('Failed to capture photo:', err);
      setCameraError('Failed to capture snapshot.');
    }
  };

  // Handle Full Profile Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/api/users/profile', formData);
      
      const updatedUser = res.data;
      setProfile(updatedUser);
      setEditMode(false);

      // Reactively sync AuthContext & LocalStorage
      updateUser({
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        phoneNumber: updatedUser.phoneNumber,
        avatar: updatedUser.avatar,
        status: updatedUser.status
      });

      showToast('Profile updated successfully!');
    } catch (err) {
      console.error('Error saving profile:', err);
      showToast(getErrorMessage(err, 'Failed to update profile. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  // Avatar Modal Handlers
  const openAvatarModal = () => {
    setTempAvatar(profile?.avatar || formData.avatar || '');
    setCustomUrlInput(isValidAvatar(profile?.avatar) ? profile.avatar : '');
    setUploadError('');
    setCameraError('');
    setIsAvatarModalOpen(true);
  };

  const closeAvatarModal = () => {
    stopWebcam();
    setIsAvatarModalOpen(false);
    setUploadError('');
    setCameraError('');
  };

  const handleTabChange = (newTab) => {
    if (avatarTab === 'camera' && newTab !== 'camera') {
      stopWebcam();
    }
    setAvatarTab(newTab);
    setUploadError('');
    setCameraError('');

    if (newTab === 'camera') {
      setTimeout(() => startWebcam(), 150);
    }
  };

  const handleSelectInbuilt = (url) => {
    setTempAvatar(url);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WEBP, GIF)');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Image size exceeds 8MB. Please select a smaller photo.');
      return;
    }

    try {
      setIsProcessingImage(true);
      setUploadError('');
      const compressedDataUrl = await compressAvatarFile(file, 400, 0.88);
      setTempAvatar(compressedDataUrl);
      showToast('Photo loaded and compressed successfully!');
    } catch (err) {
      console.error('Image compression failed:', err);
      setUploadError(err.message || 'Failed to read image. If using OneDrive, ensure the file is downloaded to this device.');
    } finally {
      setIsProcessingImage(false);
      // Reset input value so same file can be chosen again if needed
      e.target.value = '';
    }
  };

  const handleApplyUrl = () => {
    if (!customUrlInput.trim()) {
      setUploadError('Please enter a valid image URL');
      return;
    }
    setTempAvatar(customUrlInput.trim());
    setUploadError('');
  };

  const handleRemoveAvatar = () => {
    setTempAvatar('');
  };

  const handleSaveAvatar = async () => {
    setFormData(prev => ({ ...prev, avatar: tempAvatar }));
    closeAvatarModal();

    // Save directly to backend if not currently editing other fields
    if (!editMode) {
      try {
        setSaving(true);
        const res = await api.put('/api/users/profile', { avatar: tempAvatar });
        setProfile(res.data);
        updateUser({ avatar: tempAvatar });
        showToast('Profile picture updated successfully!');
      } catch (err) {
        console.error('Error saving avatar:', err);
        showToast(getErrorMessage(err, 'Error saving avatar to server.'));
      } finally {
        setSaving(false);
      }
    } else {
      showToast('Avatar selected! Click "Save Changes" to apply all updates.');
    }
  };

  // Filter inbuilt avatars by category
  const filteredAvatars = selectedCategory === 'All'
    ? BUILTIN_AVATARS
    : BUILTIN_AVATARS.filter(a => a.category === selectedCategory);

  // Status badge config
  const currentStatusConfig = STATUS_OPTIONS.find(s => s.value === (profile?.status || 'online')) || STATUS_OPTIONS[0];

  if (loading && !profile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: '1rem', color: 'var(--text-secondary)' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid var(--border-color)', borderTopColor: 'var(--primary-color)', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: '1.1rem' }}>Loading your profile...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const effectiveAvatar = editMode ? formData.avatar : profile?.avatar;
  const hasAvatar = isValidAvatar(effectiveAvatar);
  const initials = (profile?.displayName || profile?.username || user?.username || 'U')[0].toUpperCase();

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1000px', margin: '0 auto', minHeight: '100%' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: 'var(--bg-dark-secondary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--primary-color)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          padding: '0.85rem 1.5rem',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          zIndex: 9999,
          animation: 'fadeInUp 0.3s ease-out'
        }}>
          <Check size={18} color="var(--success)" />
          <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{toastMessage}</span>
        </div>
      )}

      {/* Main Profile Container */}
      <div className="glass-panel" style={{ overflow: 'hidden', border: '1px solid var(--border-color)', borderRadius: '20px' }}>
        
        {/* Hero Cover Banner */}
        <div style={{
          height: '190px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 35%, #2563eb 70%, #8b5cf6 100%)',
          position: 'relative',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
          padding: '1.25rem'
        }}>
          {/* Subtle geometric overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(139,92,246,0.3) 0%, transparent 60%)',
            pointerEvents: 'none'
          }} />

          {/* Quick Edit toggle top right */}
          <button 
            onClick={() => setEditMode(!editMode)} 
            className={editMode ? "btn btn-outline" : "btn btn-primary"}
            style={{ 
              position: 'relative', 
              zIndex: 2, 
              backdropFilter: 'blur(8px)',
              padding: '0.6rem 1.25rem',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: '10px'
            }}
          >
            {editMode ? <X size={16} /> : <Edit3 size={16} />}
            {editMode ? 'Cancel Editing' : 'Edit Profile'}
          </button>
        </div>

        {/* Profile Info Bar with Floating Avatar */}
        <div style={{ padding: '0 2rem 2rem 2rem', position: 'relative' }}>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-end', 
            flexWrap: 'wrap', 
            gap: '1.5rem',
            marginTop: '-65px',
            marginBottom: '1.75rem'
          }}>
            {/* Avatar with Camera Trigger */}
            <div style={{ position: 'relative', zIndex: 3 }}>
              <div 
                onClick={openAvatarModal}
                style={{
                  width: '130px',
                  height: '130px',
                  borderRadius: '50%',
                  border: '5px solid var(--bg-dark-secondary)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 0 2px rgba(59, 130, 246, 0.4)',
                  position: 'relative',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-dark-secondary)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 12px 35px rgba(59, 130, 246, 0.5), 0 0 0 3px var(--primary-color)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 0 2px rgba(59, 130, 246, 0.4)';
                }}
                title="Click to change your display picture"
              >
                {hasAvatar ? (
                  <img 
                    src={effectiveAvatar} 
                    alt="Profile Avatar" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    color: 'white', 
                    fontWeight: 700, 
                    fontSize: '3rem' 
                  }}>
                    {initials}
                  </div>
                )}

                {/* Hover overlay hint */}
                <div 
                  className="avatar-hover-overlay"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                    gap: '4px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                >
                  <Camera size={26} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Change DP</span>
                </div>
              </div>

              {/* Status Indicator Dot on Avatar */}
              <div 
                style={{
                  position: 'absolute',
                  bottom: '6px',
                  right: '6px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: '3px solid var(--bg-dark-secondary)',
                  backgroundColor: currentStatusConfig.color,
                  boxShadow: `0 0 10px ${currentStatusConfig.color}`
                }}
                title={`Status: ${currentStatusConfig.label}`}
              />
            </div>

            {/* Quick Actions & Change DP Button */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button 
                type="button" 
                onClick={openAvatarModal} 
                className="btn btn-outline"
                style={{ 
                  borderRadius: '10px', 
                  fontSize: '0.85rem', 
                  padding: '0.6rem 1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderColor: 'var(--primary-color)',
                  color: 'var(--text-primary)'
                }}
              >
                <Sparkles size={16} color="var(--accent-color)" /> Choose DP / Avatar
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(profile?._id || user?.id, 'User ID')}
                className="btn btn-outline"
                style={{ 
                  borderRadius: '10px', 
                  fontSize: '0.85rem', 
                  padding: '0.6rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
                title="Copy your unique User ID"
              >
                {copiedField === 'User ID' ? <Check size={15} color="var(--success)" /> : <Copy size={15} />}
                {copiedField === 'User ID' ? 'Copied ID' : 'Copy ID'}
              </button>
            </div>
          </div>

          {/* User Identification Header */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
              <h1 style={{ fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                {profile?.displayName || profile?.username || 'Chatera User'}
              </h1>
              <span 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.3rem', 
                  padding: '0.2rem 0.65rem', 
                  borderRadius: '16px', 
                  backgroundColor: 'rgba(59, 130, 246, 0.15)', 
                  color: 'var(--primary-color)',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                <ShieldCheck size={14} /> Verified Member
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', color: 'var(--text-secondary)', flexWrap: 'wrap', fontSize: '0.95rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                @{profile?.username || user?.username}
              </span>

              {profile?.occupation && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Briefcase size={15} /> {profile.occupation}
                </span>
              )}

              {profile?.location && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={15} /> {profile.location}
                </span>
              )}

              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={15} /> Joined {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Recently'}
              </span>
            </div>

            {/* Custom Status Message Pill */}
            {(profile?.statusMessage || currentStatusConfig) && (
              <div style={{
                marginTop: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.4rem 1rem',
                borderRadius: '30px',
                backgroundColor: currentStatusConfig.bg,
                border: `1px solid ${currentStatusConfig.color}40`,
                fontSize: '0.875rem'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: currentStatusConfig.color }} />
                <span style={{ fontWeight: 600, color: currentStatusConfig.color, textTransform: 'capitalize' }}>
                  {currentStatusConfig.label}
                </span>
                {profile?.statusMessage && (
                  <>
                    <span style={{ color: 'var(--border-color)' }}>|</span>
                    <span style={{ color: 'var(--text-primary)' }}>{profile.statusMessage}</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '1.75rem 0' }} />

          {/* VIEW MODE vs EDIT MODE */}
          {!editMode ? (
            /* VIEW MODE CARDS */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              
              {/* Bio Card */}
              <div style={{ 
                gridColumn: '1 / -1',
                padding: '1.5rem', 
                backgroundColor: 'rgba(15, 23, 42, 0.5)', 
                borderRadius: '16px', 
                border: '1px solid var(--border-color)' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Info size={18} color="var(--primary-color)" /> About & Bio
                  </h3>
                  <button 
                    onClick={() => setEditMode(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                </div>
                <p style={{ 
                  lineHeight: '1.7', 
                  fontSize: '1rem', 
                  color: profile?.bio ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontStyle: profile?.bio ? 'normal' : 'italic',
                  margin: 0
                }}>
                  {profile?.bio || 'No bio provided yet. Click "Edit Profile" to tell other users about yourself, your hobbies, or what you work on!'}
                </p>
              </div>

              {/* Personal & Contact Details */}
              <div style={{ 
                padding: '1.5rem', 
                backgroundColor: 'rgba(15, 23, 42, 0.5)', 
                borderRadius: '16px', 
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}>
                <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserIcon size={18} color="var(--primary-color)" /> Contact Information
                </h3>

                {/* Email */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Email Address</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                      <Mail size={16} color="var(--primary-color)" /> {profile?.email || 'Not specified'}
                    </span>
                    {profile?.email && (
                      <button 
                        onClick={() => copyToClipboard(profile.email, 'Email')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        title="Copy email"
                      >
                        <Copy size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Phone Number</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                      <Phone size={16} color="var(--success)" /> {profile?.phoneNumber || 'No phone number attached'}
                    </span>
                    {profile?.phoneNumber && (
                      <button 
                        onClick={() => copyToClipboard(profile.phoneNumber, 'Phone')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        title="Copy phone number"
                      >
                        <Copy size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Location / City</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                    <MapPin size={16} color="#ec4899" /> {profile?.location || 'Not provided'}
                  </div>
                </div>

                {/* Occupation */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Occupation / Role</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                    <Briefcase size={16} color="var(--accent-color)" /> {profile?.occupation || 'Not specified'}
                  </div>
                </div>
              </div>

              {/* Status & App Presence Card */}
              <div style={{ 
                padding: '1.5rem', 
                backgroundColor: 'rgba(15, 23, 42, 0.5)', 
                borderRadius: '16px', 
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}>
                <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Smile size={18} color="var(--accent-color)" /> Presence & Activity
                </h3>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Current Status</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.85rem', borderRadius: '8px', backgroundColor: currentStatusConfig.bg, color: currentStatusConfig.color, fontWeight: 600, fontSize: '0.9rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: currentStatusConfig.color }} />
                    {currentStatusConfig.label}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Custom Status Message</div>
                  <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                    {profile?.statusMessage || 'No status message set.'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Account ID</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: '0.8rem', padding: '0.5rem 0.75rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?._id}</span>
                    <button 
                      onClick={() => copyToClipboard(profile?._id, 'User ID')} 
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginLeft: '0.5rem' }}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* EDIT MODE FORM */
            <form onSubmit={handleSubmit} style={{ animation: 'fadeIn 0.3s ease-in' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.4rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Edit3 size={20} color="var(--primary-color)" /> Edit Profile Details
                </h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>All changes will be saved to your account</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                
                {/* Display Name */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Display Name / Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Naveen Kumar"
                    value={formData.displayName} 
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })} 
                  />
                </div>

                {/* Username handle */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Username (@handle)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. naveen_24"
                    value={formData.username} 
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })} 
                    required 
                  />
                </div>

                {/* Phone Number */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Phone Number</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    placeholder="+91 9876543210"
                    value={formData.phoneNumber} 
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} 
                  />
                </div>

                {/* Occupation */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Occupation / Headline</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Senior Software Engineer"
                    value={formData.occupation} 
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })} 
                  />
                </div>

                {/* Location */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Location / City</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Bangalore, India"
                    value={formData.location} 
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                  />
                </div>

                {/* Status Dropdown */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Active Presence Status</label>
                  <select 
                    className="form-input" 
                    value={formData.status} 
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ cursor: 'pointer' }}
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Status Message with Quick Preset Chips */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Custom Status Message</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="What are you up to right now? e.g. 💻 In a meeting"
                  value={formData.statusMessage} 
                  onChange={(e) => setFormData({ ...formData, statusMessage: e.target.value })}
                  style={{ marginBottom: '0.6rem' }} 
                />
                
                {/* Preset Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {PRESET_STATUS_MESSAGES.map((msg, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormData({ ...formData, statusMessage: msg })}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '20px',
                        backgroundColor: formData.statusMessage === msg ? 'var(--primary-color)' : 'rgba(255, 255, 255, 0.06)',
                        color: formData.statusMessage === msg ? 'white' : 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {msg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bio textarea */}
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label className="form-label">About You / Bio</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formData.bio.length} / 500</span>
                </div>
                <textarea 
                  className="form-input" 
                  rows={4} 
                  maxLength={500}
                  placeholder="Share a short summary about your background, interests, or project focus..."
                  value={formData.bio} 
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })} 
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setEditMode(false)} 
                  className="btn btn-outline"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px' }}
                >
                  <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

      {/* ========================================================= */}
      {/* DISPLAY PICTURE / AVATAR SELECTION MODAL */}
      {/* ========================================================= */}
      {isAvatarModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div 
            className="glass-panel" 
            style={{ 
              width: '100%', 
              maxWidth: '720px', 
              maxHeight: '92vh', 
              display: 'flex', 
              flexDirection: 'column',
              backgroundColor: 'var(--bg-dark-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)'
            }}
          >
            {/* Modal Header */}
            <div style={{ 
              padding: '1.25rem 1.5rem', 
              borderBottom: '1px solid var(--border-color)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={20} color="var(--primary-color)" /> Choose Your Display Picture
                </h2>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Pick from built-in avatars, take a photo with your camera, or upload from device
                </p>
              </div>
              <button 
                onClick={closeAvatarModal}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.4rem', borderRadius: '8px' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Live Preview Bar */}
            <div style={{ 
              padding: '0.85rem 1.5rem', 
              backgroundColor: 'rgba(15, 23, 42, 0.6)', 
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem'
            }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: '3px solid var(--primary-color)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--bg-dark)'
                }}>
                  {isValidAvatar(tempAvatar) ? (
                    <img src={tempAvatar} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'white', 
                      fontWeight: 700, 
                      fontSize: '1.5rem' 
                    }}>
                      {initials}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Active Selection Preview</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {isValidAvatar(tempAvatar) 
                    ? 'Looks sharp! Click "Apply Avatar" to set this as your DP.' 
                    : 'Currently using your initial letter gradient.'}
                </div>
              </div>

              {isValidAvatar(tempAvatar) && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: 'var(--danger)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                  title="Remove avatar and use default"
                >
                  <Trash2 size={14} /> Reset
                </button>
              )}
            </div>

            {/* Modal Navigation Tabs (4 Options) */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(15, 23, 42, 0.4)', overflowX: 'auto' }}>
              <button
                type="button"
                onClick={() => handleTabChange('inbuilt')}
                style={{
                  flex: 1,
                  minWidth: '130px',
                  padding: '0.85rem 0.5rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: avatarTab === 'inbuilt' ? '2px solid var(--primary-color)' : '2px solid transparent',
                  color: avatarTab === 'inbuilt' ? 'var(--primary-color)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s'
                }}
              >
                <Sparkles size={15} /> Inbuilt Avatars ({BUILTIN_AVATARS.length})
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('camera')}
                style={{
                  flex: 1,
                  minWidth: '130px',
                  padding: '0.85rem 0.5rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: avatarTab === 'camera' ? '2px solid var(--primary-color)' : '2px solid transparent',
                  color: avatarTab === 'camera' ? 'var(--primary-color)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s'
                }}
              >
                <Camera size={15} /> Take Photo (Webcam)
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('upload')}
                style={{
                  flex: 1,
                  minWidth: '130px',
                  padding: '0.85rem 0.5rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: avatarTab === 'upload' ? '2px solid var(--primary-color)' : '2px solid transparent',
                  color: avatarTab === 'upload' ? 'var(--primary-color)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s'
                }}
              >
                <UploadCloud size={15} /> Upload / Paste
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('url')}
                style={{
                  flex: 1,
                  minWidth: '110px',
                  padding: '0.85rem 0.5rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: avatarTab === 'url' ? '2px solid var(--primary-color)' : '2px solid transparent',
                  color: avatarTab === 'url' ? 'var(--primary-color)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s'
                }}
              >
                <LinkIcon size={15} /> Image URL
              </button>
            </div>

            {/* Modal Body / Tab Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
              
              {/* TAB 1: INBUILT AVATARS */}
              {avatarTab === 'inbuilt' && (
                <div>
                  {/* Category Filter Pills */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                    {AVATAR_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '20px',
                          backgroundColor: selectedCategory === cat ? 'var(--primary-color)' : 'rgba(255,255,255,0.06)',
                          color: selectedCategory === cat ? 'white' : 'var(--text-secondary)',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Avatars Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                    gap: '1rem',
                    maxHeight: '340px',
                    overflowY: 'auto',
                    paddingRight: '0.25rem'
                  }}>
                    {filteredAvatars.map(avatar => {
                      const isSelected = tempAvatar === avatar.url;
                      return (
                        <div
                          key={avatar.id}
                          onClick={() => handleSelectInbuilt(avatar.url)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.35rem',
                            cursor: 'pointer',
                            padding: '0.4rem',
                            borderRadius: '12px',
                            backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                            border: isSelected ? '2px solid var(--primary-color)' : '2px solid transparent',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div style={{
                            width: '68px',
                            height: '68px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            position: 'relative',
                            boxShadow: isSelected ? '0 0 15px rgba(59, 130, 246, 0.6)' : '0 2px 8px rgba(0,0,0,0.3)',
                            border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--border-color)'
                          }}>
                            <img 
                              src={avatar.url} 
                              alt={avatar.name} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                            {isSelected && (
                              <div style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundColor: 'rgba(59, 130, 246, 0.35)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <div style={{ backgroundColor: 'var(--primary-color)', borderRadius: '50%', padding: '3px' }}>
                                  <Check size={14} color="white" />
                                </div>
                              </div>
                            )}
                          </div>
                          <span style={{ 
                            fontSize: '0.72rem', 
                            color: isSelected ? 'var(--primary-color)' : 'var(--text-secondary)',
                            fontWeight: isSelected ? 600 : 400,
                            textAlign: 'center',
                            maxWidth: '75px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {avatar.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: TAKE PHOTO WITH WEBCAM */}
              {avatarTab === 'camera' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
                  <div style={{ 
                    width: '320px', 
                    height: '320px', 
                    borderRadius: '50%', 
                    overflow: 'hidden', 
                    border: '4px solid var(--primary-color)', 
                    position: 'relative',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    boxShadow: '0 0 25px rgba(59, 130, 246, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        transform: 'scaleX(-1)' // Mirror view
                      }} 
                    />

                    {!isCameraActive && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: '1rem', textAlign: 'center' }}>
                        <Camera size={36} color="var(--primary-color)" />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Camera is not running</span>
                        <button 
                          type="button" 
                          onClick={startWebcam} 
                          className="btn btn-primary"
                          style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                        >
                          Turn On Camera
                        </button>
                      </div>
                    )}
                  </div>

                  {cameraError && (
                    <div style={{ color: 'var(--danger)', fontSize: '0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem 1rem', borderRadius: '8px', textAlign: 'center' }}>
                      {cameraError}
                    </div>
                  )}

                  {isCameraActive && (
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <button 
                        type="button" 
                        onClick={captureWebcamPhoto} 
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem', borderRadius: '30px', fontSize: '0.95rem' }}
                      >
                        <Camera size={18} /> Smile & Take Snapshot
                      </button>
                      <button 
                        type="button" 
                        onClick={startWebcam} 
                        className="btn btn-outline"
                        style={{ padding: '0.65rem', borderRadius: '50%' }}
                        title="Restart camera"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: UPLOAD FROM DEVICE & CLIPBOARD PASTE */}
              {avatarTab === 'upload' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
                  
                  {/* Drag & Drop / Click Zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%',
                      border: '2px dashed var(--primary-color)',
                      borderRadius: '16px',
                      padding: '2rem 1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      backgroundColor: 'rgba(59, 130, 246, 0.04)',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.04)'}
                  >
                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UploadCloud size={26} color="var(--primary-color)" />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                        Click to select an image from your device
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Supports JPG, PNG, WEBP or GIF (automatically centered & compressed to 400x400)
                      </div>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                    />
                  </div>

                  {/* Clipboard Paste Hint */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px dashed var(--border-color)',
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)'
                  }}>
                    <Clipboard size={15} color="var(--accent-color)" />
                    <span><strong>Pro Tip:</strong> Copy any image to your clipboard and press <kbd style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: 'white' }}>Ctrl + V</kbd> to paste it here directly!</span>
                  </div>

                  {/* OneDrive / Cloud Provider Guidance Box */}
                  <div style={{ 
                    padding: '0.85rem 1rem', 
                    borderRadius: '12px', 
                    backgroundColor: 'rgba(245, 158, 11, 0.08)', 
                    border: '1px solid rgba(245, 158, 11, 0.25)', 
                    fontSize: '0.82rem', 
                    color: 'var(--text-secondary)',
                    lineHeight: '1.5'
                  }}>
                    <div style={{ fontWeight: 600, color: '#fbbf24', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <AlertTriangle size={15} color="#fbbf24" /> OneDrive Cloud File Notice (Error 0x8007016A):
                    </div>
                    If your photo is marked with a cloud icon (<strong>"Available when online"</strong>), Windows blocks apps from opening it until downloaded.
                    <div style={{ marginTop: '0.35rem', color: 'var(--text-primary)' }}>
                      <strong>How to use it:</strong> Right-click the photo in Windows File Explorer ➜ select <strong>"Always keep on this device"</strong> (wait for green checkmark), or pick a photo from your local Downloads folder, or switch to the <strong>Take Photo (Webcam)</strong> tab above!
                    </div>
                  </div>

                  {isProcessingImage && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--primary-color)', fontSize: '0.9rem' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid var(--primary-color)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                      Optimizing and cropping image...
                    </div>
                  )}

                  {uploadError && (
                    <div style={{ color: 'var(--danger)', fontSize: '0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                      {uploadError}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: IMAGE WEB URL */}
              {avatarTab === 'url' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem 0' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Image Link (HTTPS)</label>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <input 
                        type="url" 
                        className="form-input" 
                        placeholder="https://images.unsplash.com/photo-..." 
                        value={customUrlInput}
                        onChange={(e) => setCustomUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyUrl();
                          }
                        }}
                      />
                      <button 
                        type="button" 
                        onClick={handleApplyUrl} 
                        className="btn btn-outline"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Preview URL
                      </button>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                      Enter a direct link to any publicly accessible photo or graphic.
                    </div>
                  </div>

                  {uploadError && (
                    <div style={{ color: 'var(--danger)', fontSize: '0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                      {uploadError}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer Actions */}
            <div style={{ 
              padding: '1rem 1.5rem', 
              borderTop: '1px solid var(--border-color)', 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: '0.75rem',
              backgroundColor: 'rgba(15, 23, 42, 0.5)' 
            }}>
              <button 
                type="button" 
                onClick={closeAvatarModal} 
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSaveAvatar} 
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Check size={18} /> Apply Avatar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Style Inject for Keyframe Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Profile;
