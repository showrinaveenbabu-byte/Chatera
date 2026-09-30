import React, { useEffect, useRef, useState, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Peer from 'simple-peer/simplepeer.min.js';
import { AuthContext } from '../context/AuthContext';
import VideoPlayer from '../components/VideoPlayer';
import { SOCKET_SERVER_URL } from '../utils/api';
import {
  MonitorUp,
  MessageSquare,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Volume2,
} from 'lucide-react';
import {
  requestUserMedia,
  getConnectedMediaDevices,
  getPreferredCameraId,
  getPreferredAudioId,
  switchVideoTrack,
  switchAudioTrack,
  ensureStreamAudio,
  stopMediaStream,
} from '../utils/mediaUtils';

const Room = () => {
  const { roomId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [peers, setPeers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [stream, setStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Device & Permission States
  const [mediaError, setMediaError] = useState(null);
  const [isFallback, setIsFallback] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');

  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peersRef = useRef([]);

  const createPeer = useCallback((userToSignal, callerID, localStream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: localStream,
    });

    peer.on('signal', (signal) => {
      socketRef.current?.emit('sending-signal', { userToSignal, callerID, signal });
    });

    peer.on('error', (err) => {
      console.warn('Peer connection error:', err);
    });

    return peer;
  }, []);

  const addPeer = useCallback((incomingSignal, callerID, localStream) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: localStream,
    });

    peer.on('signal', (signal) => {
      socketRef.current?.emit('returning-signal', { signal, callerID });
    });

    peer.on('error', (err) => {
      console.warn('Peer incoming connection error:', err);
    });

    try {
      peer.signal(incomingSignal);
    } catch (err) {
      console.warn('Peer initial signal error:', err);
    }

    return peer;
  }, []);

  // Main lifecycle: runs ONCE when entering the room
  useEffect(() => {
    let isCancelled = false;
    socketRef.current = io(SOCKET_SERVER_URL, { transports: ['websocket', 'polling'] });
    const currentUserId = user?.id || user?._id || 'guest-' + Math.random().toString(36).slice(2);

    const setupMediaAndJoin = async () => {
      setIsLoadingMedia(true);
      setMediaError(null);

      // 1. Query available video & audio devices first to pick optimal hardware
      let chosenCamId = null;
      let chosenMicId = null;
      try {
        const { videoDevices: vDevs, audioDevices: aDevs } = await getConnectedMediaDevices();
        if (!isCancelled) {
          if (vDevs && vDevs.length > 0) {
            setVideoDevices(vDevs);
            chosenCamId = getPreferredCameraId(vDevs);
            if (chosenCamId) setSelectedVideoDevice(chosenCamId);
          }
          if (aDevs && aDevs.length > 0) {
            setAudioDevices(aDevs);
            chosenMicId = getPreferredAudioId(aDevs);
            if (chosenMicId) setSelectedAudioDevice(chosenMicId);
          }
        }
      } catch (err) {
        console.warn('Pre-checking devices error:', err);
      }

      // 2. Request media with preferred color camera and mic (AUTO ENABLED)
      const result = await requestUserMedia({
        videoDeviceId: chosenCamId,
        audioDeviceId: chosenMicId,
        videoEnabled: true,
        audioEnabled: true, // Audio is auto-enabled unconditionally
        fallbackLabel: user?.username || 'You',
      });

      if (isCancelled) {
        stopMediaStream(result.stream);
        return;
      }

      // Guarantee audio tracks are active and unmuted
      await ensureStreamAudio(result.stream);
      setAudioEnabled(true);

      streamRef.current = result.stream;
      setStream(result.stream);
      setIsFallback(result.isFallback);
      setMediaError(result.error);
      setIsLoadingMedia(false);

      // Join socket room with the active media stream
      socketRef.current.emit('join-room', roomId, currentUserId);

      // 3. Re-enumerate devices with newly granted permissions to load friendly labels
      getConnectedMediaDevices().then(async ({ videoDevices: vDevs, audioDevices: aDevs }) => {
        if (isCancelled) return;
        setVideoDevices(vDevs);
        setAudioDevices(aDevs);

        const currentTrack = streamRef.current?.getVideoTracks()[0];
        const currentLabel = (currentTrack?.label || '').toLowerCase();

        // If the active camera is an IR camera or virtual camera, automatically switch to RGB camera
        const isIrCamera =
          currentLabel.includes('ir') ||
          currentLabel.includes('infrared') ||
          currentLabel.includes('phone') ||
          currentLabel.includes('virtual');

        const bestCam = getPreferredCameraId(vDevs);
        if (bestCam && (isIrCamera || !chosenCamId)) {
          setSelectedVideoDevice(bestCam);
          await switchCamera(bestCam);
        } else if (chosenCamId) {
          setSelectedVideoDevice(chosenCamId);
        }

        const bestMic = getPreferredAudioId(aDevs);
        if (bestMic && !chosenMicId) {
          setSelectedAudioDevice(bestMic);
        }
      });
    };

    setupMediaAndJoin();

    // Socket Signaling Listeners
    socketRef.current.on('all-users', (users) => {
      const newPeers = [];
      users.forEach((userID) => {
        if (streamRef.current) {
          const peer = createPeer(userID, socketRef.current.id, streamRef.current);
          peersRef.current.push({ peerID: userID, peer });
          newPeers.push({ peerID: userID, peer });
        }
      });
      setPeers(newPeers);
    });

    socketRef.current.on('user-joined', (payload) => {
      if (streamRef.current) {
        const peer = addPeer(payload.signal, payload.callerID, streamRef.current);
        peersRef.current.push({ peerID: payload.callerID, peer });
        setPeers((prevUsers) => [...prevUsers, { peerID: payload.callerID, peer }]);
      }
    });

    socketRef.current.on('receiving-returned-signal', (payload) => {
      const item = peersRef.current.find((p) => p.peerID === payload.id);
      if (item) {
        try {
          item.peer.signal(payload.signal);
        } catch (err) {
          console.warn('Error signaling returned peer:', err);
        }
      }
    });

    socketRef.current.on('user-disconnected', (userId) => {
      const peerObj = peersRef.current.find((p) => p.peerID === userId);
      if (peerObj) {
        try {
          peerObj.peer.destroy();
        } catch (cleanupErr) {
          console.warn(cleanupErr);
        }
      }
      const updatedPeers = peersRef.current.filter((p) => p.peerID !== userId);
      peersRef.current = updatedPeers;
      setPeers(updatedPeers);
    });

    socketRef.current.on('receive-message', (message) => {
      setMessages((msgs) => [...msgs, message]);
    });

    return () => {
      isCancelled = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (streamRef.current) {
        stopMediaStream(streamRef.current);
        streamRef.current = null;
      }
      if (screenStreamRef.current) {
        stopMediaStream(screenStreamRef.current);
        screenStreamRef.current = null;
      }
      peersRef.current.forEach(({ peer }) => {
        try {
          peer.destroy();
        } catch (cleanupErr) {
          console.warn(cleanupErr);
        }
      });
      peersRef.current = [];
    };
  }, [roomId, user?.id, user?._id, createPeer, addPeer]);

  // Switch camera hardware device dynamically (NEVER touches audio!)
  const switchCamera = async (deviceId) => {
    setSelectedVideoDevice(deviceId);
    setIsLoadingMedia(true);

    try {
      if (streamRef.current) {
        const { newVideoTrack, updatedStream } = await switchVideoTrack(streamRef.current, deviceId);
        setStream(updatedStream);

        // Replace track for remote peers
        peersRef.current.forEach(({ peer }) => {
          if (peer && peer._pc) {
            const sender = peer._pc.getSenders().find((s) => s.track?.kind === 'video');
            if (sender && newVideoTrack) {
              sender.replaceTrack(newVideoTrack).catch((e) => console.warn(e));
            }
          }
        });
      }
    } catch (err) {
      console.error('Error switching camera:', err);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  // Switch microphone input device dynamically (NEVER touches video!)
  const switchMicrophone = async (deviceId) => {
    setSelectedAudioDevice(deviceId);

    try {
      if (streamRef.current) {
        const { newAudioTrack, updatedStream } = await switchAudioTrack(streamRef.current, deviceId);
        setStream(updatedStream);
        setAudioEnabled(true);

        // Replace track for remote peers
        peersRef.current.forEach(({ peer }) => {
          if (peer && peer._pc) {
            const sender = peer._pc.getSenders().find((s) => s.track?.kind === 'audio');
            if (sender && newAudioTrack) {
              sender.replaceTrack(newAudioTrack).catch((e) => console.warn(e));
            }
          }
        });
      }
    } catch (err) {
      console.error('Error switching microphone:', err);
    }
  };

  // Handle toggling microphone audio with dynamic auto-recovery
  const toggleAudio = async () => {
    if (streamRef.current) {
      let audioTracks = streamRef.current.getAudioTracks();

      // If no audio track exists, dynamically acquire one right now
      if (audioTracks.length === 0) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          const newTrack = micStream.getAudioTracks()[0];
          if (newTrack) {
            newTrack.enabled = true;
            streamRef.current.addTrack(newTrack);
            setStream(new MediaStream(streamRef.current.getTracks()));
            setAudioEnabled(true);

            peersRef.current.forEach(({ peer }) => {
              if (peer && peer._pc) {
                const sender = peer._pc.getSenders().find((s) => s.track?.kind === 'audio');
                if (sender) {
                  sender.replaceTrack(newTrack).catch((e) => console.warn(e));
                }
              }
            });
            return;
          }
        } catch (err) {
          console.warn('Could not acquire microphone track on toggle:', err);
        }
      }

      audioTracks = streamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !audioEnabled;
        audioTracks.forEach((track) => {
          track.enabled = nextState;
        });
        setAudioEnabled(nextState);
      }
    }
  };

  // Handle toggling webcam video
  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !videoEnabled;
        videoTracks.forEach((track) => {
          track.enabled = nextState;
        });
        setVideoEnabled(nextState);
      }
    }
  };

  // Manual retry handler for both camera and microphone
  const retryMedia = async () => {
    setIsLoadingMedia(true);
    setMediaError(null);

    if (streamRef.current) {
      stopMediaStream(streamRef.current);
    }

    const { videoDevices: vDevs, audioDevices: aDevs } = await getConnectedMediaDevices();
    setVideoDevices(vDevs);
    setAudioDevices(aDevs);
    const targetCamId = selectedVideoDevice || getPreferredCameraId(vDevs);
    const targetMicId = selectedAudioDevice || getPreferredAudioId(aDevs);

    const result = await requestUserMedia({
      videoDeviceId: targetCamId,
      audioDeviceId: targetMicId,
      videoEnabled: true,
      audioEnabled: true,
      fallbackLabel: user?.username || 'You',
    });

    await ensureStreamAudio(result.stream);
    setAudioEnabled(true);

    streamRef.current = result.stream;
    setStream(result.stream);
    setIsFallback(result.isFallback);
    setMediaError(result.error);
    setIsLoadingMedia(false);

    // Update track in existing peers
    const newVideoTrack = result.stream.getVideoTracks()[0];
    const newAudioTrack = result.stream.getAudioTracks()[0];

    peersRef.current.forEach(({ peer }) => {
      try {
        if (peer && peer._pc) {
          peer._pc.getSenders().forEach((sender) => {
            if (sender.track?.kind === 'video' && newVideoTrack) {
              sender.replaceTrack(newVideoTrack).catch((e) => console.warn(e));
            }
            if (sender.track?.kind === 'audio' && newAudioTrack) {
              sender.replaceTrack(newAudioTrack).catch((e) => console.warn(e));
            }
          });
        }
      } catch (e) {
        console.warn('Error updating peer tracks:', e);
      }
    });
  };

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const currentScreenStream = await navigator.mediaDevices.getDisplayMedia({ cursor: true });
        screenStreamRef.current = currentScreenStream;
        setScreenStream(currentScreenStream);

        const videoTrack = currentScreenStream.getVideoTracks()[0];
        peersRef.current.forEach(({ peer }) => {
          if (peer && peer._pc) {
            const sender = peer._pc.getSenders().find((s) => s.track?.kind === 'video');
            if (sender && videoTrack) {
              sender.replaceTrack(videoTrack).catch((e) => console.warn(e));
            }
          }
        });

        videoTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error('Error sharing screen:', err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      stopMediaStream(screenStreamRef.current);
      screenStreamRef.current = null;
    }
    setScreenStream(null);
    setIsScreenSharing(false);

    const origVideoTrack = streamRef.current?.getVideoTracks()[0];
    if (origVideoTrack) {
      peersRef.current.forEach(({ peer }) => {
        if (peer && peer._pc) {
          const sender = peer._pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(origVideoTrack).catch((e) => console.warn(e));
          }
        }
      });
    }
  };

  const leaveRoom = () => {
    if (streamRef.current) {
      stopMediaStream(streamRef.current);
    }
    navigate('/');
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const msgData = {
        text: newMessage,
        sender: user?.username || 'You',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      if (socketRef.current) {
        socketRef.current.emit('send-message', roomId, msgData);
      }
      setMessages((msgs) => [...msgs, msgData]);
      setNewMessage('');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-dark)', overflow: 'hidden' }}>
      {/* Main Video & Meeting Interface */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
        {/* Top Header Bar with Built-in Camera Selector */}
        <div
          style={{
            padding: '0.75rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-dark-secondary)',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Room Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isFallback ? '#eab308' : '#10b981',
              }}
            />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
              Room: <span style={{ color: 'var(--primary-color)' }}>{roomId.slice(0, 8)}...</span>
            </h3>
          </div>

          {/* Camera & Microphone Hardware Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            {/* Camera Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Camera size={15} style={{ color: 'var(--primary-color)' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Camera:</span>
              <select
                className="form-input"
                value={selectedVideoDevice}
                onChange={(e) => switchCamera(e.target.value)}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.825rem',
                  minWidth: '190px',
                  maxWidth: '240px',
                  backgroundColor: 'var(--bg-dark)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--primary-color)',
                  cursor: 'pointer',
                }}
              >
                {videoDevices.length === 0 ? (
                  <option value="">Detecting cameras...</option>
                ) : (
                  videoDevices.map((dev, idx) => {
                    const isIr = (dev.label || '').toLowerCase().includes('ir');
                    return (
                      <option key={dev.deviceId || idx} value={dev.deviceId}>
                        {dev.label ? (isIr ? `${dev.label} (IR)` : `${dev.label} ✓`) : `Camera ${idx + 1}`}
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {/* Microphone Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Mic size={15} style={{ color: audioEnabled ? '#10b981' : '#f87171' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mic:</span>
              <select
                className="form-input"
                value={selectedAudioDevice}
                onChange={(e) => switchMicrophone(e.target.value)}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.825rem',
                  minWidth: '190px',
                  maxWidth: '240px',
                  backgroundColor: 'var(--bg-dark)',
                  color: 'var(--text-primary)',
                  border: audioEnabled ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                  cursor: 'pointer',
                }}
              >
                {audioDevices.length === 0 ? (
                  <option value="">Default Microphone</option>
                ) : (
                  audioDevices.map((dev, idx) => (
                    <option key={dev.deviceId || idx} value={dev.deviceId}>
                      {dev.label || `Microphone ${idx + 1}`}
                    </option>
                  ))
                )}
              </select>
            </div>

            <button
              onClick={retryMedia}
              className="btn btn-outline"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}
              title="Refresh Devices"
            >
              <RefreshCw size={13} className={isLoadingMedia ? 'spin' : ''} />
            </button>
          </div>

          {/* Status Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                fontSize: '0.78rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '20px',
                backgroundColor: audioEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: audioEnabled ? '#34d399' : '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              {audioEnabled ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              <span>{audioEnabled ? 'Audio Auto-Enabled' : 'Mic Muted'}</span>
            </div>

            <div
              style={{
                fontSize: '0.78rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '20px',
                backgroundColor: isFallback ? 'rgba(234, 179, 8, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: isFallback ? '#facc15' : '#34d399',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              {isFallback ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
              <span>{isFallback ? 'Camera Off' : 'Camera Live'}</span>
            </div>
          </div>
        </div>

        {/* Media Permission Alert Banner (if error or blocked) */}
        {mediaError && (
          <div
            style={{
              padding: '0.65rem 1.5rem',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#fca5a5',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div>
                <strong>Notice: </strong>
                {mediaError}
              </div>
            </div>

            <button
              onClick={retryMedia}
              disabled={isLoadingMedia}
              className="btn btn-primary"
              style={{
                padding: '0.35rem 0.85rem',
                fontSize: '0.75rem',
                display: 'flex',
                gap: '0.3rem',
                flexShrink: 0,
              }}
            >
              <RefreshCw size={13} className={isLoadingMedia ? 'spin' : ''} />
              Retry
            </button>
          </div>
        )}

        {/* Video Grid Area */}
        <div style={{ flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '1000px', height: '100%', maxHeight: '70vh' }}>
            <div className="video-grid" style={{ height: '100%' }}>
              {/* Local User Stream */}
              <VideoPlayer
                stream={isScreenSharing && screenStream ? screenStream : stream}
                isLocal={true}
                label={`${user?.username || 'You'} (Me)`}
              />

              {/* Remote Peers Stream */}
              {peers.map((peerObj, index) => (
                <VideoPlayer key={peerObj.peerID || index} peer={peerObj.peer} label={`Participant ${index + 1}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Call Controls Bar */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-dark-secondary)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          {/* Audio Mute/Unmute */}
          <button
            onClick={toggleAudio}
            className={`btn ${audioEnabled ? 'btn-outline' : 'btn-danger'}`}
            style={{ borderRadius: '50%', width: '52px', height: '52px', padding: 0 }}
            title={audioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {audioEnabled ? <Mic size={22} /> : <MicOff size={22} />}
          </button>

          {/* Video On/Off */}
          <button
            onClick={toggleVideo}
            className={`btn ${videoEnabled ? 'btn-outline' : 'btn-danger'}`}
            style={{ borderRadius: '50%', width: '52px', height: '52px', padding: 0 }}
            title={videoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {videoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`btn ${isScreenSharing ? 'btn-primary' : 'btn-outline'}`}
            style={{ borderRadius: '50%', width: '52px', height: '52px', padding: 0 }}
            title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
          >
            <MonitorUp size={22} />
          </button>

          {/* Leave Call */}
          <button
            onClick={leaveRoom}
            className="btn btn-danger"
            style={{ borderRadius: '50%', width: '52px', height: '52px', padding: 0 }}
            title="Leave Meeting"
          >
            <PhoneOff size={22} />
          </button>
        </div>
      </div>

      {/* In-Call Text Chat Sidebar */}
      <div
        style={{
          width: '340px',
          borderLeft: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-dark-secondary)',
        }}
      >
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <MessageSquare size={18} style={{ color: 'var(--primary-color)' }} />
          <h4 style={{ margin: 0, fontSize: '1rem' }}>Meeting Chat</h4>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {messages.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem' }}>
              No messages yet in this meeting.
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.sender === (user?.username || 'You') ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                  {msg.sender === (user?.username || 'You') ? 'You' : msg.sender} • {msg.time}
                </div>
                <div
                  style={{
                    padding: '0.65rem 0.9rem',
                    backgroundColor: msg.sender === (user?.username || 'You') ? 'var(--primary-color)' : 'var(--bg-dark)',
                    color: 'white',
                    borderRadius: '12px',
                    borderBottomRightRadius: msg.sender === (user?.username || 'You') ? '2px' : '12px',
                    borderBottomLeftRadius: msg.sender !== (user?.username || 'You') ? '2px' : '12px',
                    fontSize: '0.9rem',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Type message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              style={{ flex: 1, fontSize: '0.875rem', padding: '0.6rem 0.8rem' }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1rem', fontSize: '0.875rem' }}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Room;
