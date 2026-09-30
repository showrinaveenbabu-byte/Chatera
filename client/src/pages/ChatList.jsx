import React, { useState, useEffect, useContext, useRef } from 'react';
import api, { getErrorMessage } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import {
  Search,
  MessageSquare,
  Phone,
  Mail,
  Image as ImageIcon,
  Smile,
  Sticker,
  Send,
  PhoneCall,
  Video,
  UserPlus,
  Check,
  Sparkles,
  Users,
  X,
  Compass,
  UserCheck,
  Trash2,
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

const ChatList = () => {
  const { user } = useContext(AuthContext);
  const { socket } = useSocket();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Core Data States
  const [friends, setFriends] = useState([]);
  const [discoverUsers, setDiscoverUsers] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);

  // Search & Navigation States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'discover' | 'friends'
  const [sentRequests, setSentRequests] = useState({});

  const socketRef = useRef();
  const messagesEndRef = useRef(null);
  const activeChatRef = useRef(null);

  // Keep activeChatRef synced so socket listeners always see the current active conversation
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const currentUserId = (user?.id || user?._id)?.toString();

  // Local storage key for persistent conversations (even with unknown users)
  const recentStorageKey = `chatera_recent_chats_${currentUserId || 'guest'}`;

  // Helper to load cached recent chats
  const loadRecentChats = () => {
    try {
      const stored = localStorage.getItem(recentStorageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (_) {}
    return [];
  };

  // Helper to save recent chats
  const saveRecentChatUser = (chatUser, lastText = null, isUnread = false) => {
    if (!chatUser || (!chatUser._id && !chatUser.id)) return;
    const partnerId = (chatUser._id || chatUser.id).toString();

    setRecentChats((prev) => {
      const existing = prev.filter((u) => (u._id || u.id)?.toString() !== partnerId);
      const updatedUser = {
        ...chatUser,
        _id: partnerId,
        lastMessage: lastText || chatUser.lastMessage || 'Active conversation',
        lastMessageTime: new Date().toISOString(),
        unread: isUnread,
      };
      const newList = [updatedUser, ...existing];
      try {
        localStorage.setItem(recentStorageKey, JSON.stringify(newList));
      } catch (_) {}
      return newList;
    });
  };

  // 1. Listen for real-time messages via the shared socket
  useEffect(() => {
    if (!socket || !currentUserId) return;

    socketRef.current = socket;

    // Ensure user registration on this socket
    socket.emit('register-user', currentUserId);

    // Socket: Incoming direct message from another user
    const handleReceiveDirectMessage = (msg) => {
      console.log('[ChatList] Received direct message:', msg);
      const senderId = (msg.sender?._id || msg.sender)?.toString();
      const receiverId = (msg.receiver?._id || msg.receiver)?.toString();
      const partnerId = senderId === currentUserId ? receiverId : senderId;

      // 1. If currently chatting with this partner, immediately append message to chat view
      const activePartner = activeChatRef.current;
      const activeId = (activePartner?._id || activePartner?.id)?.toString();
      if (activeId && activeId === partnerId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id && m._id.toString() === msg._id?.toString())) return prev;
          return [...prev, msg];
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }

      // 2. Update recent chats list so the sender appears at the top with unread indicator
      setRecentChats((prev) => {
        const existing = prev.filter((u) => (u._id || u.id)?.toString() !== partnerId);
        let partnerObj = prev.find((u) => (u._id || u.id)?.toString() === partnerId);

        if (!partnerObj) {
          partnerObj = discoverUsers.find((u) => u._id === partnerId) || friends.find((u) => u._id === partnerId) || {
            _id: partnerId,
            username: 'User',
            status: 'online',
          };
        }

        const snippet = msg.type === 'text' ? msg.text : (msg.type === 'image' ? '📷 Photo' : (msg.type === 'sticker' ? '🎨 Sticker' : '😊 Emoji'));
        const isCurrentActive = activeId && activeId === partnerId;
        const updatedUser = {
          ...partnerObj,
          lastMessage: snippet,
          lastMessageTime: msg.createdAt || new Date().toISOString(),
          unread: !isCurrentActive,
        };

        const newList = [updatedUser, ...existing];
        try {
          localStorage.setItem(recentStorageKey, JSON.stringify(newList));
        } catch (_) {}
        return newList;
      });
    };

    // Socket: Confirmation of sent message
    const handleMessageSent = (msg) => {
      console.log('[ChatList] Message sent confirmation:', msg);
      const activePartner = activeChatRef.current;
      const activeId = (activePartner?._id || activePartner?.id)?.toString();
      const receiverId = (msg.receiver?._id || msg.receiver)?.toString();

      if (activeId && activeId === receiverId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id && m._id.toString() === msg._id?.toString())) return prev;
          const tempIndex = prev.findIndex((m) => m._id && m._id.toString().startsWith('temp_') && m.text === msg.text);
          if (tempIndex !== -1) {
            const updated = [...prev];
            updated[tempIndex] = msg;
            return updated;
          }
          return [...prev, msg];
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    };

    socket.on('receive-direct-message', handleReceiveDirectMessage);
    socket.on('message-sent', handleMessageSent);
    socket.on('message-deleted', handleMessageDeleted);

    return () => {
      socket.off('receive-direct-message', handleReceiveDirectMessage);
      socket.off('message-sent', handleMessageSent);
      socket.off('message-deleted', handleMessageDeleted);
    };
  }, [socket, currentUserId, discoverUsers, friends, recentStorageKey]);

  // Load Initial Chats, Friends, and Discover Directory
  useEffect(() => {
    if (!currentUserId || !user?.token) return;

    // Initial local cache load
    setRecentChats(loadRecentChats());

    // Fetch conversation history directly from MongoDB
    api
      .get('/api/messages/conversations')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setRecentChats((prevLocal) => {
            const map = new Map();
            res.data.forEach((c) => map.set(c._id.toString(), c));
            prevLocal.forEach((c) => {
              const cid = (c._id || c.id)?.toString();
              if (cid && !map.has(cid)) map.set(cid, c);
            });
            const merged = Array.from(map.values());
            try {
              localStorage.setItem(recentStorageKey, JSON.stringify(merged));
            } catch (_) {}
            return merged;
          });
        }
      })
      .catch((err) => console.log('[ChatList] Could not fetch server conversations:', err.message));

    // Fetch accepted friends
    api
      .get('/api/friends')
      .then((res) => {
        setFriends(res.data.friends || []);
      })
      .catch(console.error);

    // Fetch all discoverable/unknown users on the platform
    api
      .get('/api/users/discover')
      .then((res) => {
        const others = (res.data || []).filter((u) => u._id !== currentUserId);
        setDiscoverUsers(others);
      })
      .catch(console.error);
  }, [currentUserId, user?.token, recentStorageKey]);

  // 2. Instant Search across ALL users (friends and unknown users)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length > 0) {
      setIsSearching(true);
      const delayTimer = setTimeout(() => {
        api
          .get(`/api/users/search?query=${encodeURIComponent(trimmed)}`)
          .then((res) => {
            const matches = (res.data || []).filter((u) => u._id !== user.id);
            setSearchResults(matches);
            setIsSearching(false);
          })
          .catch((err) => {
            console.error('Search error:', err);
            setIsSearching(false);
          });
      }, 200);

      return () => clearTimeout(delayTimer);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery, user.token, user.id]);

  // 3. Handle URL param selection (?user=userId)
  useEffect(() => {
    const targetId = searchParams.get('user');
    if (targetId) {
      // Look in friends, discover users, or recent chats
      const allKnown = [...friends, ...discoverUsers, ...recentChats];
      const match = allKnown.find((u) => u._id === targetId);
      if (match) {
        selectChat(match);
      } else {
        // Fetch specific user profile
        api
          .get(`/api/users/search?query=${encodeURIComponent(targetId)}`)
          .then((res) => {
            const found = res.data?.find((u) => u._id === targetId);
            if (found) selectChat(found);
          })
          .catch(() => {});
      }
    }
  }, [searchParams, friends, discoverUsers]);

  // Select a user to chat with (friend or unknown user)
  const selectChat = async (targetUser) => {
    setActiveChat(targetUser);
    activeChatRef.current = targetUser;

    // Clear unread flag on this user in recentChats
    setRecentChats((prev) =>
      prev.map((c) => {
        if ((c._id || c.id)?.toString() === (targetUser._id || targetUser.id)?.toString()) {
          return { ...c, unread: false };
        }
        return c;
      })
    );
    saveRecentChatUser(targetUser, targetUser.lastMessage, false);

    try {
      const partnerId = (targetUser._id || targetUser.id)?.toString();
      const res = await api.get(`/api/messages/${partnerId}`);
      setMessages(res.data || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    } catch (err) {
      console.error('[ChatList] Error fetching messages:', err);
      setMessages([]);
    }
  };

  // Send a message (works seamlessly with unknown users and friends, with REST fallback)
  const handleSendMessage = (e, type = 'text', content = null) => {
    e?.preventDefault();
    const textToSend = content || messageInput;
    if ((textToSend.trim() || type !== 'text') && activeChat) {
      const senderId = currentUserId;
      const targetId = (activeChat._id || activeChat.id)?.toString();

      if (!senderId || !targetId) {
        console.warn('[ChatList] Cannot send message: missing sender or receiver ID', { senderId, targetId });
        return;
      }

      const tempId = 'temp_' + Date.now();
      const msgData = {
        _id: tempId,
        sender: senderId,
        receiver: targetId,
        text: textToSend,
        type: type,
        image: type === 'image' ? textToSend : null,
        sticker: type === 'sticker' ? textToSend : null,
        createdAt: new Date().toISOString(),
      };

      // 1. Optimistically append message immediately so sender sees instant reaction
      setMessages((prev) => [...prev, msgData]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

      // 2. Deliver via socket if connected, or persist via REST API fallback for serverless
      const activeSock = socket || socketRef.current;
      if (activeSock && activeSock.connected) {
        activeSock.emit('send-direct-message', {
          sender: senderId,
          receiver: targetId,
          text: textToSend,
          type: type,
          image: type === 'image' ? textToSend : null,
          sticker: type === 'sticker' ? textToSend : null,
        });
      } else {
        api.post('/api/messages', {
          receiver: targetId,
          text: textToSend,
          type: type,
          image: type === 'image' ? textToSend : null,
          sticker: type === 'sticker' ? textToSend : null,
        }).then((res) => {
          if (res.data) {
            setMessages((prev) => prev.map((m) => (m._id === tempId ? res.data : m)));
          }
        }).catch((err) => {
          console.error('[ChatList] REST send error:', err);
        });
      }

      // 3. Update local conversation preview
      const previewText = type === 'text' ? textToSend : (type === 'image' ? '📷 Photo' : (type === 'sticker' ? '🎨 Sticker' : '😊 Emoji'));
      saveRecentChatUser(activeChat, previewText, false);

      setMessageInput('');
      setShowEmojis(false);
    }
  };

  // Delete message handler
  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;
    try {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      if (!messageId.startsWith('temp_')) {
        await api.delete(`/api/messages/${messageId}`);
      }
    } catch (err) {
      console.error('[ChatList] Delete message error:', err);
    }
  };

  // Send friend request to an unknown user directly from the chat view or search list
  const handleSendFriendRequest = async (targetUserId, e = null) => {
    if (e) e.stopPropagation();
    try {
      await api.post('/api/friends/request', { userId: targetUserId });
      setSentRequests((prev) => ({ ...prev, [targetUserId]: true }));
    } catch (err) {
      const msg = getErrorMessage(err, 'Request already sent');
      setSentRequests((prev) => ({ ...prev, [targetUserId]: true }));
      console.log(msg);
    }
  };

  // Voice Call
  const startVoiceCall = () => {
    if (activeChat) {
      const callRoomId = `voice-${[user?.id || 'me', activeChat._id].sort().join('-')}`;
      navigate(`/room/${callRoomId}`);
    }
  };

  // Video Call
  const startVideoCall = () => {
    if (activeChat) {
      const callRoomId = [user?.id || 'me', activeChat._id].sort().join('-');
      navigate(`/room/${callRoomId}`);
    }
  };

  const handleSimulatedUpload = (type) => {
    const url = prompt(`Enter ${type} image URL:`);
    if (url) {
      handleSendMessage(null, type, url);
    }
  };

  // Check if a user is an accepted friend
  const isFriend = (targetId) => {
    return friends.some((f) => f._id === targetId);
  };

  // Avatar Component with gradient fallback and online badge
  const Avatar = ({ userObj, size = '46px', showStatus = true }) => {
    const initial = (userObj?.username?.[0] || 'U').toUpperCase();
    const isOnline = userObj?.status === 'online';

    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        {userObj?.avatar && (userObj.avatar.startsWith('http') || userObj.avatar.startsWith('data:image')) && !userObj.avatar.includes('via.placeholder') ? (
          <img
            src={userObj.avatar}
            alt={userObj.username}
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: parseInt(size) / 2.3 + 'px',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
            }}
          >
            {initial}
          </div>
        )}

        {showStatus && (
          <span
            style={{
              position: 'absolute',
              bottom: '1px',
              right: '1px',
              width: '11px',
              height: '11px',
              borderRadius: '50%',
              backgroundColor: isOnline ? '#10b981' : '#64748b',
              border: '2px solid var(--bg-dark-secondary)',
            }}
            title={isOnline ? 'Online' : 'Offline'}
          />
        )}
      </div>
    );
  };

  // Categorize search results
  const matchingFriends = searchResults.filter((u) => isFriend(u._id));
  const matchingUnknown = searchResults.filter((u) => !isFriend(u._id));

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left Sidebar: Search, Tabs, and User Contacts */}
      <div
        style={{
          width: '380px',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-dark-secondary)',
        }}
      >
        {/* Sidebar Header */}
        <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <MessageSquare size={22} style={{ color: 'var(--primary-color)' }} /> Chats
            </h2>
            <button
              onClick={() => setActiveTab('discover')}
              className="badge badge-primary"
              style={{ cursor: 'pointer', border: 'none', padding: '0.3rem 0.65rem' }}
              title="Discover new people"
            >
              <Compass size={13} /> Discover People
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', marginBottom: '0.85rem' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                top: '50%',
                left: '0.9rem',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
              }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, email, or phone..."
              style={{
                paddingLeft: '2.5rem',
                paddingRight: searchQuery ? '2.5rem' : '1rem',
                fontSize: '0.875rem',
                borderRadius: '10px',
              }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '0.75rem',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Navigation Filter Pills (Only shown when not actively searching) */}
          {!searchQuery && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setActiveTab('all')}
                className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              >
                All Chats {recentChats.length > 0 && `(${recentChats.length})`}
              </button>
              <button
                onClick={() => setActiveTab('discover')}
                className={`tab-btn ${activeTab === 'discover' ? 'active' : ''}`}
              >
                <Compass size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Discover Users ({discoverUsers.length})
              </button>
              <button
                onClick={() => setActiveTab('friends')}
                className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
              >
                Friends ({friends.length})
              </button>
            </div>
          )}
        </div>

        {/* User List Scroll Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem' }}>
          {/* SEARCH ACTIVE VIEW */}
          {searchQuery ? (
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.75rem',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Search size={13} /> Search Results for "{searchQuery}"
              </div>

              {isSearching && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>
                  Searching users on Chatera...
                </div>
              )}

              {!isSearching && searchResults.length === 0 && (
                <div
                  style={{
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                  }}
                >
                  <p style={{ margin: '0 0 0.5rem 0' }}>No users found matching "{searchQuery}".</p>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Tip: Try typing part of their username, phone number, or email.
                  </span>
                </div>
              )}

              {/* Matching Friends */}
              {matchingFriends.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Friends ({matchingFriends.length})
                  </div>
                  {matchingFriends.map((result) => (
                    <div
                      key={result._id}
                      className={`user-item ${activeChat?._id === result._id ? 'active' : ''}`}
                      onClick={() => selectChat(result)}
                    >
                      <Avatar userObj={result} size="44px" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{result.username}</h4>
                          <span className="badge badge-success">Friend ✓</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {result.email || result.phoneNumber}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Matching Unknown / Other Users */}
              {matchingUnknown.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Sparkles size={12} /> Discover New Users ({matchingUnknown.length})
                  </div>
                  {matchingUnknown.map((result) => {
                    const isReqSent = sentRequests[result._id];
                    return (
                      <div
                        key={result._id}
                        className={`user-item ${activeChat?._id === result._id ? 'active' : ''}`}
                        onClick={() => selectChat(result)}
                        style={{ borderLeft: '3px solid #8b5cf6' }}
                      >
                        <Avatar userObj={result} size="44px" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{result.username}</h4>
                            <span className="badge badge-primary">New User</span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {result.bio || result.email || result.phoneNumber}
                          </div>
                        </div>

                        {/* Quick Add Friend Button */}
                        <button
                          onClick={(e) => handleSendFriendRequest(result._id, e)}
                          className="btn btn-outline"
                          style={{
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.75rem',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            color: isReqSent ? '#34d399' : 'var(--primary-color)',
                            borderColor: isReqSent ? '#34d399' : 'var(--primary-color)',
                          }}
                          title={isReqSent ? 'Request Sent' : 'Add Friend'}
                        >
                          {isReqSent ? <Check size={12} /> : <UserPlus size={12} />}
                          {isReqSent ? 'Sent' : 'Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* TABBED VIEWS WHEN NOT SEARCHING */
            <div>
              {/* TAB 1: ALL CHATS (Recent Active Conversations) */}
              {activeTab === 'all' && (
                <div>
                  {recentChats.length > 0 ? (
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.6rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        Recent Conversations
                      </div>
                      {recentChats.map((chatUser) => (
                        <div
                          key={chatUser._id || chatUser.id}
                          className={`user-item ${(activeChat?._id || activeChat?.id) === (chatUser._id || chatUser.id) ? 'active' : ''}`}
                          onClick={() => selectChat(chatUser)}
                        >
                          <Avatar userObj={chatUser} size="44px" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: chatUser.unread ? '700' : '600' }}>
                                {chatUser.username}
                              </h4>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontSize: '0.7rem', color: isFriend(chatUser._id || chatUser.id) ? '#34d399' : '#818cf8' }}>
                                  {isFriend(chatUser._id || chatUser.id) ? 'Friend' : 'Chat'}
                                </span>
                                {chatUser.unread && (
                                  <span
                                    style={{
                                      width: '8px',
                                      height: '8px',
                                      borderRadius: '50%',
                                      backgroundColor: '#3b82f6',
                                      boxShadow: '0 0 6px #3b82f6',
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: '0.78rem',
                                color: chatUser.unread ? 'white' : 'var(--text-secondary)',
                                fontWeight: chatUser.unread ? '500' : 'normal',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {chatUser.lastMessage || chatUser.status || 'Click to chat'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* Discover People Section (Always accessible, especially when 0 friends) */}
                  <div style={{ marginTop: recentChats.length > 0 ? '1.5rem' : '0.25rem' }}>
                    <div
                      style={{
                        padding: '1rem',
                        backgroundColor: 'rgba(59, 130, 246, 0.08)',
                        borderRadius: '12px',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        marginBottom: '1rem',
                      }}
                    >
                      <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#60a5fa' }}>
                        <Sparkles size={16} /> Discover People to Chat
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Select any registered user on Chatera below to start messaging instantly.
                      </p>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.6rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      Suggested People ({discoverUsers.length})
                    </div>

                    {discoverUsers.length === 0 ? (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                        No other users found on the server.
                      </div>
                    ) : (
                      discoverUsers.map((otherUser) => (
                        <div
                          key={otherUser._id}
                          className={`user-item ${activeChat?._id === otherUser._id ? 'active' : ''}`}
                          onClick={() => selectChat(otherUser)}
                        >
                          <Avatar userObj={otherUser} size="44px" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4 style={{ margin: 0, fontSize: '0.92rem' }}>{otherUser.username}</h4>
                              <span className="badge badge-primary">Start Chat</span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {otherUser.bio || otherUser.email || otherUser.phoneNumber}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: DISCOVER USERS DIRECTORY */}
              {activeTab === 'discover' && (
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Chatera Global Directory ({discoverUsers.length})
                  </div>
                  {discoverUsers.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                      No other registered users found.
                    </div>
                  ) : (
                    discoverUsers.map((otherUser) => {
                      const isReqSent = sentRequests[otherUser._id];
                      return (
                        <div
                          key={otherUser._id}
                          className={`user-item ${activeChat?._id === otherUser._id ? 'active' : ''}`}
                          onClick={() => selectChat(otherUser)}
                        >
                          <Avatar userObj={otherUser} size="46px" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{otherUser.username}</h4>
                              <span className={isFriend(otherUser._id) ? 'badge badge-success' : 'badge badge-primary'}>
                                {isFriend(otherUser._id) ? 'Friend' : 'New User'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {otherUser.email || otherUser.phoneNumber}
                            </div>
                          </div>

                          {!isFriend(otherUser._id) && (
                            <button
                              onClick={(e) => handleSendFriendRequest(otherUser._id, e)}
                              className="btn btn-outline"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}
                              title="Add to Friends"
                            >
                              {isReqSent ? <Check size={13} style={{ color: '#34d399' }} /> : <UserPlus size={13} />}
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 3: FRIENDS LIST */}
              {activeTab === 'friends' && (
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Your Accepted Friends ({friends.length})
                  </div>
                  {friends.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 1rem' }}>
                      <p style={{ margin: '0 0 1rem 0' }}>No friends added yet.</p>
                      <button
                        onClick={() => setActiveTab('discover')}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                      >
                        <Compass size={14} style={{ marginRight: '6px' }} /> Discover People
                      </button>
                    </div>
                  ) : (
                    friends.map((friend) => (
                      <div
                        key={friend._id}
                        className={`user-item ${activeChat?._id === friend._id ? 'active' : ''}`}
                        onClick={() => selectChat(friend)}
                      >
                        <Avatar userObj={friend} size="46px" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{friend.username}</h4>
                            <span style={{ fontSize: '0.72rem', color: 'var(--success)' }}>{friend.status}</span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {friend.phoneNumber || friend.email}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-dark)' }}>
        {activeChat ? (
          <>
            {/* Active Chat Header */}
            <div
              style={{
                padding: '1rem 1.75rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--bg-dark-secondary)',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <Avatar userObj={activeChat} size="44px" />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{activeChat.username}</h3>
                    {isFriend(activeChat._id) ? (
                      <span className="badge badge-success">
                        <UserCheck size={12} /> Friend
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSendFriendRequest(activeChat._id)}
                        className="badge badge-primary"
                        style={{ cursor: 'pointer', border: 'none' }}
                        title="Send Friend Request"
                      >
                        {sentRequests[activeChat._id] ? (
                          <>
                            <Check size={12} style={{ color: '#34d399' }} /> Request Sent
                          </>
                        ) : (
                          <>
                            <UserPlus size={12} /> Add Friend
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: activeChat.status === 'online' ? 'var(--success)' : 'var(--text-secondary)' }}>
                    {activeChat.status === 'online' ? '🟢 Online' : '⚪ Offline'} • {activeChat.phoneNumber || activeChat.email || 'Chatera Member'}
                  </span>
                </div>
              </div>

              {/* Call Controls */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={startVideoCall}
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem' }}
                  title="Start Encrypted WebRTC Video Call"
                >
                  <Video size={17} /> Video Call
                </button>
                <button
                  onClick={startVoiceCall}
                  className="btn btn-outline"
                  style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem' }}
                  title="Start Voice Call"
                >
                  <PhoneCall size={17} /> Voice Call
                </button>
              </div>
            </div>

            {/* Messages Thread */}
            <div
              style={{
                flex: 1,
                padding: '1.75rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              {/* Empty Conversation Icebreaker */}
              {messages.length === 0 && (
                <div
                  style={{
                    alignSelf: 'center',
                    margin: 'auto',
                    textAlign: 'center',
                    maxWidth: '420px',
                    padding: '2rem',
                    backgroundColor: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <Avatar userObj={activeChat} size="64px" showStatus={false} />
                  <h3 style={{ marginTop: '1rem', marginBottom: '0.35rem' }}>Chat with {activeChat.username}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                    {!isFriend(activeChat._id)
                      ? "You are connected! You can message, voice call, or video call directly."
                      : "Send a message to get your conversation going."}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                    <button
                      onClick={() => handleSendMessage(null, 'text', `👋 Hi ${activeChat.username}!`)}
                      className="btn btn-outline"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                    >
                      👋 Hi {activeChat.username}!
                    </button>
                    <button
                      onClick={() => handleSendMessage(null, 'text', 'Hey, how are you?')}
                      className="btn btn-outline"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                    >
                      Hey, how are you?
                    </button>
                    <button
                      onClick={() => handleSendMessage(null, 'text', 'Nice to connect on Chatera!')}
                      className="btn btn-outline"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                    >
                      Nice to connect!
                    </button>
                  </div>
                </div>
              )}

              {/* Message Bubbles */}
              {messages.map((msg, i) => {
                const isMe = (msg.sender?._id || msg.sender)?.toString() === currentUserId;
                return (
                  <div key={i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                    <div
                      style={{
                        padding: msg.type === 'text' ? '0.75rem 1rem' : '0.5rem',
                        backgroundColor: isMe ? 'var(--primary-color)' : 'var(--bg-dark-secondary)',
                        borderRadius: '14px',
                        borderBottomRightRadius: isMe ? '2px' : '14px',
                        borderBottomLeftRadius: !isMe ? '2px' : '14px',
                        color: 'white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      }}
                    >
                      {msg.type === 'text' && <span style={{ wordBreak: 'break-word', fontSize: '0.925rem' }}>{msg.text}</span>}
                      {msg.type === 'image' && (
                        <img
                          src={msg.image}
                          style={{ maxWidth: '100%', borderRadius: '8px', display: 'block' }}
                          alt="Sent attachment"
                        />
                      )}
                      {msg.type === 'emoji' && <span style={{ fontSize: '2.5rem' }}>{msg.text}</span>}
                      {msg.type === 'sticker' && (
                        <img src={msg.sticker} style={{ width: '140px', borderRadius: '8px', display: 'block' }} alt="Sticker" />
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--text-secondary)',
                        marginTop: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                        gap: '0.4rem',
                        padding: '0 4px',
                      }}
                    >
                      <span>
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Just now'}
                      </span>
                      {isMe && msg._id && !msg._id.toString().startsWith('temp_') && (
                        <button
                          onClick={() => handleDeleteMessage(msg._id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '0 2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            opacity: 0.6,
                            transition: 'opacity 0.2s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                          title="Delete message"
                        >
                          <Trash2 size={12} style={{ color: '#ef4444' }} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar Area */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark-secondary)' }}>
              {showEmojis && (
                <div
                  style={{
                    padding: '0.65rem 1rem',
                    display: 'flex',
                    gap: '1rem',
                    fontSize: '1.5rem',
                    background: 'var(--bg-dark)',
                    borderRadius: '10px',
                    marginBottom: '0.75rem',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {['😂', '❤️', '👍', '🔥', '🎉', '👋', '🚀', '✨'].map((emoji) => (
                    <span
                      key={emoji}
                      style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
                      onClick={() => handleSendMessage(null, 'emoji', emoji)}
                      onMouseEnter={(e) => (e.target.style.transform = 'scale(1.2)')}
                      onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
              )}

              <form onSubmit={(e) => handleSendMessage(e, 'text')} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleSimulatedUpload('image')}
                  className="btn btn-outline"
                  style={{ padding: '0.65rem', borderRadius: '10px' }}
                  title="Send Image URL"
                >
                  <ImageIcon size={19} />
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulatedUpload('sticker')}
                  className="btn btn-outline"
                  style={{ padding: '0.65rem', borderRadius: '10px' }}
                  title="Send Sticker"
                >
                  <Sticker size={19} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmojis(!showEmojis)}
                  className={`btn ${showEmojis ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.65rem', borderRadius: '10px' }}
                  title="Send Emoji"
                >
                  <Smile size={19} />
                </button>

                <input
                  type="text"
                  className="form-input"
                  placeholder={`Message ${activeChat.username}...`}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  style={{ flex: 1, padding: '0.75rem 1rem', fontSize: '0.9rem' }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 1.25rem', borderRadius: '10px' }}
                  title="Send"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Empty Chat Area State */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'var(--bg-dark-secondary)',
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem',
                color: 'var(--primary-color)',
              }}
            >
              <MessageSquare size={40} />
            </div>

            <h2 style={{ marginBottom: '0.6rem', fontSize: '1.75rem' }}>Select a chat or discover people</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Pick anyone from the left sidebar or search by username, phone number, or email to start real-time messaging and video calls.
            </p>

            <button
              onClick={() => setActiveTab('discover')}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Compass size={18} /> Browse Registered Users
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
