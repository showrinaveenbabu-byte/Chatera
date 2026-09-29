// Utility for robust camera and microphone access with fallbacks and device enumeration

/**
 * Creates a synthetic canvas video stream with a stylish animated avatar/fallback.
 * This ensures WebRTC connections and room functionality continue working even if
 * the physical webcam is unavailable or permission is denied.
 */
export function createFallbackStream(label = 'User', width = 640, height = 480) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  let frame = 0;

  const draw = () => {
    frame++;
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle animated grid/pulse
    const pulse = Math.sin(frame * 0.05) * 5;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 70 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 55, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();

    // Initials / Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initials = label.slice(0, 2).toUpperCase() || 'U';
    ctx.fillText(initials, width / 2, height / 2);

    // Camera off indicator text
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Camera Inactive / Off', width / 2, height / 2 + 85);
  };

  draw();
  const intervalId = setInterval(draw, 100);

  // Capture canvas stream at 15 fps
  const canvasStream = canvas.captureStream(15);

  // Create a silent audio track using Web Audio API
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const audioCtx = new AudioContext();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0; // completely silent
      osc.connect(gain);
      const dest = audioCtx.createMediaStreamDestination();
      gain.connect(dest);
      osc.start();
      const audioTrack = dest.stream.getAudioTracks()[0];
      if (audioTrack) {
        canvasStream.addTrack(audioTrack);
      }
    }
  } catch (err) {
    console.warn('Could not generate synthetic audio track:', err);
  }

  // Hook track stop to clear canvas drawing interval
  const origStop = canvasStream.getTracks()[0]?.stop;
  if (origStop) {
    canvasStream.getTracks()[0].stop = function () {
      clearInterval(intervalId);
      origStop.call(this);
    };
  }

  canvasStream._isSynthetic = true;
  return canvasStream;
}

/**
 * Enumerates available video and audio devices.
 */
export async function getConnectedMediaDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return { videoDevices: [], audioDevices: [] };
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((d) => d.kind === 'videoinput');
    const audioDevices = devices.filter((d) => d.kind === 'audioinput');
    return { videoDevices, audioDevices };
  } catch (err) {
    console.error('Error enumerating devices:', err);
    return { videoDevices: [], audioDevices: [] };
  }
}

/**
 * Identifies the best color RGB webcam device ID from an enumerated list.
 * CRITICAL: Excludes Infrared / Windows Hello cameras (e.g. 'HP IR Camera')
 * which output no color frames and cause perpetual buffering.
 */
export function getPreferredCameraId(videoDevices) {
  if (!videoDevices || videoDevices.length === 0) return null;

  // Filter out IR (Infrared) cameras, Phone Link, and Virtual cameras
  const isExcluded = (label) => {
    const name = (label || '').toLowerCase();
    return (
      name.includes('ir camera') ||
      name.includes('infrared') ||
      name.includes('ir ') ||
      name.includes('depth') ||
      name.includes('windows hello') ||
      name.includes('phone') ||
      name.includes('virtual') ||
      name.includes('droid') ||
      name.includes('obs') ||
      name.includes('iriun') ||
      name.includes('camo') ||
      name.includes('link')
    );
  };

  // 1st Priority: Devices explicitly with color/RGB indicators like 5MP, HD, Webcam, Integrated
  const bestColorCam = videoDevices.find((d) => {
    const name = (d.label || '').toLowerCase();
    if (isExcluded(name)) return false;
    return (
      name.includes('5mp') ||
      name.includes('hd') ||
      name.includes('camera') ||
      name.includes('webcam') ||
      name.includes('integrated') ||
      name.includes('usb')
    );
  });
  if (bestColorCam) return bestColorCam.deviceId;

  // 2nd Priority: Any non-excluded camera
  const anyNonIr = videoDevices.find((d) => !isExcluded(d.label));
  if (anyNonIr) return anyNonIr.deviceId;

  // Fallback to first
  return videoDevices[0].deviceId;
}

/**
 * Safely stops all tracks on a MediaStream to release camera/mic hardware locks.
 */
export function stopMediaStream(stream) {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (e) {
        console.warn('Error stopping track:', e);
      }
    });
  } catch (err) {
    console.warn('Error stopping media stream:', err);
  }
}

/**
 * Identifies the best audio input device ID from an enumerated list.
 * Prefers Headset / Bluetooth, then Microphone Array / Internal Mic.
 */
export function getPreferredAudioId(audioDevices) {
  if (!audioDevices || audioDevices.length === 0) return null;

  // 1st Priority: Headset, Bluetooth, or External USB mic
  const headset = audioDevices.find((d) => {
    const name = (d.label || '').toLowerCase();
    return (
      name.includes('headset') ||
      name.includes('buds') ||
      name.includes('usb') ||
      name.includes('bluetooth') ||
      name.includes('airpods')
    );
  });
  if (headset) return headset.deviceId;

  // 2nd Priority: Microphone Array (Intel Smart Sound, etc.)
  const micArray = audioDevices.find((d) => {
    const name = (d.label || '').toLowerCase();
    return (
      name.includes('array') ||
      name.includes('microphone') ||
      name.includes('intel') ||
      name.includes('realtek')
    );
  });
  if (micArray) return micArray.deviceId;

  return audioDevices[0].deviceId;
}

/**
 * Robustly requests user media with auto-enabled audio and video.
 * If requesting both together fails (driver conflict), it acquires video and audio
 * independently and combines them so audio is ALWAYS enabled automatically.
 *
 * @param {Object} options
 * @param {string} [options.videoDeviceId]
 * @param {string} [options.audioDeviceId]
 * @param {boolean} [options.videoEnabled=true]
 * @param {boolean} [options.audioEnabled=true]
 * @param {string} [options.fallbackLabel='You']
 * @returns {Promise<{ stream: MediaStream, error: null|string, isFallback: boolean, hasVideo: boolean, hasAudio: boolean }>}
 */
export async function requestUserMedia({
  videoDeviceId = null,
  audioDeviceId = null,
  videoEnabled = true,
  audioEnabled = true,
  fallbackLabel = 'You',
} = {}) {
  // Check browser capability / secure context
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const errMsg = window.isSecureContext === false
      ? 'Camera access requires a secure connection (HTTPS or localhost).'
      : 'Your browser does not support camera/microphone access.';
    const fallback = createFallbackStream(fallbackLabel);
    return {
      stream: fallback,
      error: errMsg,
      isFallback: true,
      hasVideo: false,
      hasAudio: false,
      errorType: 'NotSupported',
    };
  }

  // Camera constraints
  const videoConstraints = videoEnabled
    ? (videoDeviceId ? { deviceId: { ideal: videoDeviceId } } : true)
    : false;

  // Microphone constraints with auto-enhancements
  const audioConstraints = audioEnabled
    ? (audioDeviceId
        ? { deviceId: { ideal: audioDeviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        : { echoCancellation: true, noiseSuppression: true, autoGainControl: true })
    : false;

  let stream = null;

  // Strategy 1: Attempt direct simultaneous acquisition
  if (videoConstraints && audioConstraints) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints,
      });
    } catch (e1) {
      console.warn('Simultaneous getUserMedia failed, attempting separate acquisition:', e1.name, e1.message);

      // Strategy 2: Acquire video and audio independently and merge tracks
      let vStream = null;
      let aStream = null;

      try {
        vStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
      } catch (ve) {
        console.warn('Video individual request failed:', ve.name);
      }

      try {
        aStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      } catch (ae) {
        try {
          // Fallback to simple unconstrained audio: true
          aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (ae2) {
          console.warn('Audio individual request failed:', ae2.name);
        }
      }

      const combinedTracks = [];
      if (vStream) combinedTracks.push(...vStream.getVideoTracks());
      if (aStream) combinedTracks.push(...aStream.getAudioTracks());

      if (combinedTracks.length > 0) {
        stream = new MediaStream(combinedTracks);
      }
    }
  } else if (videoConstraints && !audioConstraints) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
    } catch (e) {
      console.warn('Video only request failed:', e);
    }
  } else if (!videoConstraints && audioConstraints) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    } catch (e) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e2) {
        console.warn('Audio only request failed:', e2);
      }
    }
  }

  // If stream was successfully acquired:
  if (stream) {
    // Explicitly auto-enable all audio and video tracks
    stream.getVideoTracks().forEach((track) => {
      track.enabled = true;
    });
    stream.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });

    const hasVideo = stream.getVideoTracks().length > 0;
    let hasAudio = stream.getAudioTracks().length > 0;

    // If audio was requested but missing, GUARANTEE microphone acquisition
    if (audioEnabled && !hasAudio) {
      try {
        const fallbackAudio = await navigator.mediaDevices.getUserMedia({ audio: true });
        const aTrack = fallbackAudio.getAudioTracks()[0];
        if (aTrack) {
          aTrack.enabled = true;
          stream.addTrack(aTrack);
          hasAudio = true;
        }
      } catch (micErr) {
        console.warn('Microphone fallback auto-acquisition failed:', micErr.name);
      }
    }

    return {
      stream,
      error: null,
      isFallback: false,
      hasVideo: stream.getVideoTracks().length > 0,
      hasAudio: stream.getAudioTracks().length > 0,
    };
  }

  // If hardware is unavailable, produce fallback stream with silent audio
  const fallback = createFallbackStream(fallbackLabel);
  return {
    stream: fallback,
    error: 'Camera or microphone is unavailable. Running in fallback mode.',
    isFallback: true,
    hasVideo: false,
    hasAudio: false,
  };
}

/**
 * Switches the video camera track on an existing MediaStream without stopping,
 * restarting, or disturbing the active audio/microphone stream.
 */
export async function switchVideoTrack(currentStream, newDeviceId) {
  if (!currentStream) {
    const res = await requestUserMedia({ videoDeviceId: newDeviceId, videoEnabled: true, audioEnabled: true });
    return { newVideoTrack: res.stream.getVideoTracks()[0], updatedStream: res.stream };
  }

  const newStream = await navigator.mediaDevices.getUserMedia({
    video: newDeviceId ? { deviceId: { exact: newDeviceId } } : true,
    audio: false, // CRITICAL: NEVER touch audio when switching cameras!
  });

  const newVideoTrack = newStream.getVideoTracks()[0];
  if (!newVideoTrack) {
    throw new Error('Failed to acquire new video track');
  }
  newVideoTrack.enabled = true;

  // Stop and remove old video tracks
  const oldVideoTracks = currentStream.getVideoTracks();
  oldVideoTracks.forEach((track) => {
    try { track.stop(); } catch (_) {}
    try { currentStream.removeTrack(track); } catch (_) {}
  });

  // Add new video track to existing stream
  currentStream.addTrack(newVideoTrack);

  return {
    newVideoTrack,
    updatedStream: new MediaStream(currentStream.getTracks()),
  };
}

/**
 * Switches or re-acquires the audio/microphone track on an existing MediaStream
 * without stopping or disturbing the video stream.
 */
export async function switchAudioTrack(currentStream, newAudioDeviceId) {
  if (!currentStream) {
    const res = await requestUserMedia({ audioDeviceId: newAudioDeviceId, videoEnabled: true, audioEnabled: true });
    return { newAudioTrack: res.stream.getAudioTracks()[0], updatedStream: res.stream };
  }

  let audioConstraints = newAudioDeviceId
    ? { deviceId: { exact: newAudioDeviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    : { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

  let newAudioStream = null;
  try {
    newAudioStream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
      video: false,
    });
  } catch (err) {
    newAudioStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
  }

  const newAudioTrack = newAudioStream.getAudioTracks()[0];
  if (!newAudioTrack) {
    throw new Error('Failed to acquire new audio track');
  }
  newAudioTrack.enabled = true;

  // Stop and remove old audio tracks
  currentStream.getAudioTracks().forEach((oldTrack) => {
    try { oldTrack.stop(); } catch (_) {}
    try { currentStream.removeTrack(oldTrack); } catch (_) {}
  });

  // Add new audio track
  currentStream.addTrack(newAudioTrack);

  return {
    newAudioTrack,
    updatedStream: new MediaStream(currentStream.getTracks()),
  };
}

/**
 * Ensures an active MediaStream has an enabled, working audio track.
 * If missing, automatically requests and attaches a live microphone track.
 */
export async function ensureStreamAudio(stream) {
  if (!stream) return stream;

  const audioTracks = stream.getAudioTracks();
  const hasLiveAudio = audioTracks.some((t) => t.readyState === 'live');

  if (!hasLiveAudio) {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const newTrack = micStream.getAudioTracks()[0];
      if (newTrack) {
        newTrack.enabled = true;
        // Clean up dead audio tracks
        audioTracks.forEach((t) => {
          try { t.stop(); } catch (_) {}
          try { stream.removeTrack(t); } catch (_) {}
        });
        stream.addTrack(newTrack);
      }
    } catch (e) {
      console.warn('Auto microphone enablement failed:', e);
    }
  } else {
    audioTracks.forEach((t) => {
      t.enabled = true;
    });
  }

  return stream;
}

/**
 * Converts browser MediaStream DOMExceptions into actionable, friendly guidance.
 */
export function getReadableMediaError(error) {
  if (!error) return 'Unable to access camera or microphone.';

  const name = error.name || '';
  const message = error.message || '';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera or microphone permission was blocked. Please click the lock icon in your browser URL bar, set Camera and Microphone to Allow, then click retry.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera or microphone found on your device. Please connect your webcam/headset and retry.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Camera or microphone is in use by another application. Close other apps and retry.';
  }
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return 'Device does not support requested settings. Using fallback settings.';
  }
  if (name === 'SecurityError') {
    return 'Media access requires HTTPS or localhost.';
  }

  return message || 'Could not start media stream. Please check your camera and mic connections.';
}
