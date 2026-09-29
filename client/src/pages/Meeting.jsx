import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidV4 } from 'uuid';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  RefreshCw,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import {
  requestUserMedia,
  getConnectedMediaDevices,
  getPreferredCameraId,
  getPreferredAudioId,
  ensureStreamAudio,
  stopMediaStream,
} from '../utils/mediaUtils';

const Meeting = () => {
  const [roomIdToJoin, setRoomIdToJoin] = useState('');
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Camera & Mic preview states
  const videoRef = useRef(null);
  const previewStreamRef = useRef(null);
  const [previewStream, setPreviewStream] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isMicActive, setIsMicActive] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('loading'); // 'loading' | 'active' | 'error' | 'fallback'
  const [errorMessage, setErrorMessage] = useState(null);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');

  // Start preview camera stream
  const startPreview = async (videoDeviceId = selectedVideoDevice) => {
    setCameraStatus('loading');
    setErrorMessage(null);

    if (previewStreamRef.current) {
      stopMediaStream(previewStreamRef.current);
      previewStreamRef.current = null;
    }

    const { videoDevices: vDevs, audioDevices: aDevs } = await getConnectedMediaDevices();
    setVideoDevices(vDevs);

    const chosenCam = videoDeviceId || (vDevs.length > 0 ? getPreferredCameraId(vDevs) : null);
    const chosenMic = aDevs.length > 0 ? getPreferredAudioId(aDevs) : null;
    if (chosenCam && !selectedVideoDevice) {
      setSelectedVideoDevice(chosenCam);
    }

    const res = await requestUserMedia({
      videoDeviceId: chosenCam,
      audioDeviceId: chosenMic,
      videoEnabled: isCameraActive,
      audioEnabled: isMicActive,
      fallbackLabel: user?.username || 'You',
    });

    if (res.stream) {
      await ensureStreamAudio(res.stream);
    }

    previewStreamRef.current = res.stream;
    setPreviewStream(res.stream);

    if (res.error) {
      setErrorMessage(res.error);
      setCameraStatus(res.isFallback ? 'fallback' : 'error');
    } else {
      setCameraStatus('active');
    }
  };

  useEffect(() => {
    startPreview();

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (previewStreamRef.current) {
          stopMediaStream(previewStreamRef.current);
          previewStreamRef.current = null;
          setPreviewStream(null);
        }
      } else if (document.visibilityState === 'visible' && !previewStreamRef.current) {
        startPreview();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (previewStreamRef.current) {
        stopMediaStream(previewStreamRef.current);
        previewStreamRef.current = null;
        setPreviewStream(null);
      }
    };
  }, []);

  // Connect stream to video preview element
  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream;
      videoRef.current.muted = true;
      videoRef.current.play().catch((e) => console.warn('Preview video play warning:', e));
    }
  }, [previewStream]);

  // Audio level monitoring in preview
  useEffect(() => {
    if (!previewStream) return;
    const aTracks = previewStream.getAudioTracks();
    if (aTracks.length === 0) {
      setIsSpeaking(false);
      return;
    }

    let audioCtx = null;
    let analyser = null;
    let source = null;
    let animId = null;

    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        const micStream = new MediaStream([aTracks[0]]);
        source = audioCtx.createMediaStreamSource(micStream);
        source.connect(analyser);

        const dataArr = new Uint8Array(analyser.frequencyBinCount);
        const monitorPreviewAudio = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArr);
          let sum = 0;
          for (let i = 0; i < dataArr.length; i++) {
            sum += dataArr[i];
          }
          const avg = sum / dataArr.length;
          setIsSpeaking(avg > 14);
          animId = requestAnimationFrame(monitorPreviewAudio);
        };
        monitorPreviewAudio();
      }
    } catch (_) {}

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (source) {
        try { source.disconnect(); } catch (_) {}
      }
      if (audioCtx && audioCtx.state !== 'closed') {
        try { audioCtx.close(); } catch (_) {}
      }
    };
  }, [previewStream]);

  // Toggle Camera in preview
  const toggleCamera = () => {
    if (previewStreamRef.current) {
      const vTracks = previewStreamRef.current.getVideoTracks();
      if (vTracks.length > 0) {
        const next = !isCameraActive;
        vTracks.forEach((t) => (t.enabled = next));
        setIsCameraActive(next);
      }
    }
  };

  // Toggle Mic in preview
  const toggleMic = async () => {
    if (previewStreamRef.current) {
      let aTracks = previewStreamRef.current.getAudioTracks();
      if (aTracks.length === 0) {
        try {
          const mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          const newTrack = mic.getAudioTracks()[0];
          if (newTrack) {
            newTrack.enabled = true;
            previewStreamRef.current.addTrack(newTrack);
            setIsMicActive(true);
            return;
          }
        } catch (_) {}
      }

      aTracks = previewStreamRef.current.getAudioTracks();
      if (aTracks.length > 0) {
        const next = !isMicActive;
        aTracks.forEach((t) => (t.enabled = next));
        setIsMicActive(next);
      }
    }
  };

  // Switch video camera source
  const handleCameraChange = async (deviceId) => {
    setSelectedVideoDevice(deviceId);
    await startPreview(deviceId);
  };

  const createRoom = () => {
    // Release preview stream before entering the room
    if (previewStreamRef.current) {
      stopMediaStream(previewStreamRef.current);
      previewStreamRef.current = null;
    }
    const newRoomId = uuidV4();
    navigate(`/room/${newRoomId}`);
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (roomIdToJoin.trim()) {
      if (previewStreamRef.current) {
        stopMediaStream(previewStreamRef.current);
        previewStreamRef.current = null;
      }
      navigate(`/room/${roomIdToJoin.trim()}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '850px' }}>
        {/* Title Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <Sparkles style={{ color: 'var(--accent-color)' }} /> Start Collaborating
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
            Verify your camera & microphone, then create or join an encrypted WebRTC room.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem', alignItems: 'stretch' }}>
          {/* Live Camera & Mic Preview Box */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Camera size={20} style={{ color: 'var(--primary-color)' }} /> Camera Check
              </h3>

              <div
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '20px',
                  backgroundColor: cameraStatus === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                  color: cameraStatus === 'active' ? '#34d399' : '#facc15',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                {cameraStatus === 'active' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                <span>{cameraStatus === 'active' ? 'Camera Live' : cameraStatus === 'loading' ? 'Testing...' : 'Camera Issue'}</span>
              </div>
            </div>

            {/* Video Preview Frame */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                paddingTop: '56.25%', // 16:9
                backgroundColor: '#0a0f1d',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                border: '1px solid var(--border-color)',
              }}
            >
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)', // Mirror preview
                  display: isCameraActive ? 'block' : 'none',
                }}
              />

              {!isCameraActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#111827',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <VideoOff size={40} style={{ marginBottom: '0.5rem', opacity: 0.6 }} />
                  <span style={{ fontSize: '0.9rem' }}>Camera preview muted</span>
                </div>
              )}
            </div>

            {/* Error / Warning Notice */}
            {errorMessage && (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#fca5a5',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{errorMessage}</span>
                <button
                  onClick={() => startPreview()}
                  className="btn btn-primary"
                  style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Quick Preview Controls & Device Select */}
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                onClick={toggleCamera}
                className={`btn ${isCameraActive ? 'btn-outline' : 'btn-danger'}`}
                style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', display: 'flex', gap: '0.4rem' }}
              >
                {isCameraActive ? <Video size={16} /> : <VideoOff size={16} />}
                {isCameraActive ? 'Cam On' : 'Cam Off'}
              </button>

              <button
                onClick={toggleMic}
                className={`btn ${isMicActive ? 'btn-outline' : 'btn-danger'}`}
                style={{
                  padding: '0.5rem 0.85rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  borderColor: isSpeaking && isMicActive ? '#22c55e' : undefined,
                }}
              >
                {isMicActive ? <Mic size={16} style={{ color: isSpeaking ? '#22c55e' : undefined }} /> : <MicOff size={16} />}
                <span>{isMicActive ? 'Mic On' : 'Mic Off'}</span>
                {isMicActive && isSpeaking && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', height: '12px' }}>
                    <span className="audio-wave-bar" style={{ animationDelay: '0ms' }} />
                    <span className="audio-wave-bar" style={{ animationDelay: '150ms' }} />
                    <span className="audio-wave-bar" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </button>

              {videoDevices.length > 1 && (
                <select
                  className="form-input"
                  value={selectedVideoDevice}
                  onChange={(e) => handleCameraChange(e.target.value)}
                  style={{ flex: 1, padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}
                >
                  {videoDevices.map((dev, idx) => (
                    <option key={dev.deviceId || idx} value={dev.deviceId}>
                      {dev.label || `Camera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={() => startPreview()}
                className="btn btn-outline"
                style={{ padding: '0.5rem', borderRadius: '8px' }}
                title="Refresh Camera"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Meeting Entry Options (New Room / Join Room) */}
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '1.25rem' }}>Join or Create Room</h3>

            <button
              onClick={createRoom}
              className="btn btn-primary"
              style={{
                padding: '1.1rem 1.5rem',
                fontSize: '1.1rem',
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
              }}
            >
              <Video size={22} /> Create Instant Meeting
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '1.75rem 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
              <span style={{ padding: '0 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                or join via code
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
            </div>

            <form onSubmit={joinRoom} style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                placeholder="Enter Room Code (e.g. room-123)"
                className="form-input"
                value={roomIdToJoin}
                onChange={(e) => setRoomIdToJoin(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="submit"
                className="btn btn-outline"
                style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}
              >
                Join <ArrowRight size={16} />
              </button>
            </form>

            <div style={{ marginTop: '1.5rem', fontSize: '0.825rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              🔒 End-to-end peer-to-peer WebRTC encryption enabled
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Meeting;
