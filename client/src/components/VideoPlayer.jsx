import React, { useEffect, useRef, useState } from 'react';
import { VideoOff, Mic, MicOff, User, AlertTriangle, Volume2, VolumeX } from 'lucide-react';

const VideoPlayer = ({ peer, isLocal = false, stream = null, label = 'User' }) => {
  const videoRef = useRef(null);
  const [remoteStream, setRemoteStream] = useState(stream);
  const [isVideoLive, setIsVideoLive] = useState(true);
  const [isAudioLive, setIsAudioLive] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasReceivedFrames, setHasReceivedFrames] = useState(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);

  // Sync external stream prop when it changes
  useEffect(() => {
    if (stream) {
      setRemoteStream(stream);
      setHasReceivedFrames(false);
    }
  }, [stream]);

  // Handle incoming simple-peer streams
  useEffect(() => {
    if (!peer) return;

    if (peer._remoteStreams && peer._remoteStreams.length > 0 && peer._remoteStreams[0]) {
      setRemoteStream(peer._remoteStreams[0]);
    }

    const onStream = (incomingStream) => {
      setRemoteStream(incomingStream);
    };

    peer.on('stream', onStream);

    return () => {
      if (typeof peer.off === 'function') {
        peer.off('stream', onStream);
      } else if (typeof peer.removeListener === 'function') {
        peer.removeListener('stream', onStream);
      }
    };
  }, [peer]);

  // Real-time voice volume detection via Web Audio API
  useEffect(() => {
    if (!remoteStream) return;
    const aTracks = remoteStream.getAudioTracks();
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
        analyser.smoothingTimeConstant = 0.3;

        // Use only the audio track for analysis
        const micStream = new MediaStream([aTracks[0]]);
        source = audioCtx.createMediaStreamSource(micStream);
        source.connect(analyser);

        const dataArr = new Uint8Array(analyser.frequencyBinCount);

        const monitorAudio = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArr);
          let sum = 0;
          for (let i = 0; i < dataArr.length; i++) {
            sum += dataArr[i];
          }
          const avg = sum / dataArr.length;
          // Threshold for human speech activity
          setIsSpeaking(avg > 14);
          animId = requestAnimationFrame(monitorAudio);
        };

        monitorAudio();
      }
    } catch (e) {
      console.warn('Web Audio speaking detection not available:', e);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (source) {
        try { source.disconnect(); } catch (_) {}
      }
      if (audioCtx && audioCtx.state !== 'closed') {
        try { audioCtx.close(); } catch (_) {}
      }
    };
  }, [remoteStream]);

  // Bind stream to video element and trigger auto audio/video playback
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !remoteStream) return;

    if (isLocal) {
      // Local stream: must be muted to avoid self-echo feedback
      videoEl.muted = true;
      videoEl.defaultMuted = true;
      videoEl.setAttribute('muted', '');
    } else {
      // Remote stream: AUTO-ENABLED AUDIO AT 100% VOLUME
      videoEl.muted = false;
      videoEl.defaultMuted = false;
      videoEl.removeAttribute('muted');
      videoEl.volume = 1.0;
    }

    videoEl.playsInline = true;
    videoEl.setAttribute('playsinline', '');

    if (videoEl.srcObject !== remoteStream) {
      videoEl.srcObject = remoteStream;
    }

    const checkTrackStatus = () => {
      const vTracks = remoteStream.getVideoTracks();
      const aTracks = remoteStream.getAudioTracks();

      const vLive = vTracks.length > 0 && vTracks.some((t) => t.enabled && t.readyState === 'live');
      const aLive = aTracks.length > 0 && aTracks.some((t) => t.enabled && t.readyState === 'live');

      setIsVideoLive(vLive);
      setIsAudioLive(aLive);

      if (videoEl.videoWidth > 0 && videoEl.currentTime > 0) {
        setHasReceivedFrames(true);
      }
    };

    checkTrackStatus();

    // Listen for track changes
    remoteStream.getTracks().forEach((track) => {
      track.onmute = checkTrackStatus;
      track.onunmute = checkTrackStatus;
      track.onended = checkTrackStatus;
    });

    const triggerPlay = () => {
      if (!videoEl) return;
      const promise = videoEl.play();
      if (promise !== undefined) {
        promise
          .then(() => {
            setIsAutoplayBlocked(false);
          })
          .catch((err) => {
            console.warn('Video play warning:', err.message);
            // If browser blocked unmuted autoplay, play muted first then auto-unmute on first user touch
            if (!isLocal) {
              setIsAutoplayBlocked(true);
              videoEl.muted = true;
              videoEl.play().catch(() => {});

              const unmuteOnGesture = () => {
                if (videoEl) {
                  videoEl.muted = false;
                  videoEl.volume = 1.0;
                  setIsAutoplayBlocked(false);
                }
                window.removeEventListener('click', unmuteOnGesture);
                window.removeEventListener('keydown', unmuteOnGesture);
              };

              window.addEventListener('click', unmuteOnGesture, { once: true });
              window.addEventListener('keydown', unmuteOnGesture, { once: true });
            }
          });
      }
    };

    const handleTimeUpdate = () => {
      if (videoEl && videoEl.videoWidth > 0) {
        setHasReceivedFrames(true);
      }
    };

    videoEl.addEventListener('timeupdate', handleTimeUpdate);
    videoEl.addEventListener('playing', handleTimeUpdate);
    videoEl.addEventListener('loadedmetadata', triggerPlay);
    videoEl.addEventListener('canplay', triggerPlay);

    triggerPlay();

    return () => {
      if (videoEl) {
        videoEl.removeEventListener('timeupdate', handleTimeUpdate);
        videoEl.removeEventListener('playing', handleTimeUpdate);
        videoEl.removeEventListener('loadedmetadata', triggerPlay);
        videoEl.removeEventListener('canplay', triggerPlay);
      }
    };
  }, [remoteStream, isLocal]);

  // Handle manual click to unmute if browser had blocked autoplay
  const handleUnmuteClick = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1.0;
      setIsAutoplayBlocked(false);
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div
      className={`video-container ${isSpeaking ? 'speaking-glow' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        backgroundColor: '#0a0f1d',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: isSpeaking ? '0 0 20px rgba(34, 197, 94, 0.4)' : '0 4px 20px rgba(0,0,0,0.4)',
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
      }}
    >
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted={isLocal}
        onClick={() => {
          if (videoRef.current) {
            if (!isLocal) {
              videoRef.current.muted = false;
              videoRef.current.volume = 1.0;
              setIsAutoplayBlocked(false);
            }
            videoRef.current.play().catch(() => {});
          }
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: isVideoLive ? 'block' : 'none',
          transform: isLocal ? 'scaleX(-1)' : 'none',
          cursor: 'pointer',
        }}
      />

      {/* Autoplay blocked banner for remote peer sound */}
      {isAutoplayBlocked && !isLocal && (
        <button
          onClick={handleUnmuteClick}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.9)',
            backdropFilter: 'blur(6px)',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            padding: '6px 12px',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
            zIndex: 5,
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
          }}
        >
          <VolumeX size={15} /> Click to Unmute Audio
        </button>
      )}

      {/* Notice if camera driver is attached but shutter/sensor is physically closed */}
      {!hasReceivedFrames && isLocal && isVideoLive && (
        <div
          style={{
            position: 'absolute',
            bottom: '45px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            color: '#fef08a',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            zIndex: 4,
            maxWidth: '90%',
            textAlign: 'center',
            animation: 'fadeIn 0.5s ease-in',
          }}
        >
          <AlertTriangle size={16} style={{ color: '#eab308', flexShrink: 0 }} />
          <span>If buffering on HP: slide open the camera privacy shutter switch above your screen lens!</span>
        </div>
      )}

      {/* Fallback avatar view when video track is disabled, muted, or camera is off */}
      {!isVideoLive && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle, #1e293b 0%, #0f172a 100%)',
            color: 'var(--text-secondary)',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              border: '2px solid rgba(59, 130, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-color)',
              marginBottom: '0.5rem',
            }}
          >
            <User size={36} />
          </div>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Camera is off</span>
        </div>
      )}

      {/* Video Overlay Label with Live Voice Wave & Audio Status */}
      <div
        className="video-label"
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '0.825rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          zIndex: 2,
          border: isSpeaking ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid transparent',
        }}
      >
        <span>{isLocal ? 'You' : label}</span>

        {/* Video state indicator */}
        {!isVideoLive && <VideoOff size={13} style={{ color: '#f87171' }} />}

        {/* Audio state and real-time voice indicator */}
        {isAudioLive ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Mic size={13} style={{ color: isSpeaking ? '#22c55e' : '#38bdf8' }} />
            {isSpeaking && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', height: '14px', marginLeft: '2px' }}>
                <span className="audio-wave-bar" style={{ animationDelay: '0ms' }} />
                <span className="audio-wave-bar" style={{ animationDelay: '150ms' }} />
                <span className="audio-wave-bar" style={{ animationDelay: '300ms' }} />
              </span>
            )}
          </div>
        ) : (
          <MicOff size={13} style={{ color: '#f87171' }} />
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
