import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api, { getErrorMessage } from '../utils/api';
import { Users, UserPlus, Check, X, Search, Phone, Mail, MessageSquare, Sparkles, UserMinus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserAvatar = ({ userObj, size = '42px', gradient = 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }) => {
  const hasAvatar = userObj?.avatar && 
    (userObj.avatar.startsWith('http') || userObj.avatar.startsWith('data:image')) && 
    !userObj.avatar.includes('via.placeholder');
  const initial = (userObj?.displayName || userObj?.username || 'U')[0].toUpperCase();

  if (hasAvatar) {
    return (
      <img 
        src={userObj.avatar} 
        alt={userObj?.username} 
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)' }} 
      />
    );
  }

  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', flexShrink: 0, fontSize: parseInt(size) / 2.3 + 'px' }}>
      {initial}
    </div>
  );
};

const Friends = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [discoverUsers, setDiscoverUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [sentRequests, setSentRequests] = useState({});
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const currentUserId = (user?.id || user?._id)?.toString();

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchFriendsData = async () => {
    try {
      setLoadingFriends(true);
      const res = await api.get('/api/friends');
      setFriends(res.data.friends || []);
      setRequests(res.data.requests || []);
    } catch (err) {
      console.error('Error fetching friends:', err);
    } finally {
      setLoadingFriends(false);
    }
  };

  const fetchDiscoverUsers = async () => {
    try {
      const res = await api.get('/api/users/discover');
      setDiscoverUsers((res.data || []).filter(u => (u._id || u.id)?.toString() !== currentUserId));
    } catch (err) {
      console.error('Error fetching discover users:', err);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchFriendsData();
      fetchDiscoverUsers();
    }
  }, [user?.token, currentUserId]);

  // Live search as user types with debounce
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length > 0) {
      const timer = setTimeout(async () => {
        try {
          const res = await api.get(`/api/users/search?query=${encodeURIComponent(q)}`);
          setSearchResults((res.data || []).filter(u => (u._id || u.id)?.toString() !== currentUserId));
        } catch (err) {
          console.error('Search error:', err);
        }
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, currentUserId]);

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q.length > 0) {
      try {
        const res = await api.get(`/api/users/search?query=${encodeURIComponent(q)}`);
        setSearchResults((res.data || []).filter(u => (u._id || u.id)?.toString() !== currentUserId));
      } catch (err) {
        console.error('Search error:', err);
      }
    }
  };

  const sendRequest = async (userId) => {
    try {
      await api.post('/api/friends/request', { userId });
      setSentRequests(prev => ({ ...prev, [userId]: true }));
      showToast('Friend request sent!');
    } catch (err) {
      const msg = getErrorMessage(err, 'Request already sent');
      setSentRequests(prev => ({ ...prev, [userId]: true }));
      showToast(msg);
    }
  };

  const acceptRequest = async (userId) => {
    try {
      await api.post('/api/friends/accept', { userId });
      showToast('Friend request accepted!');
      fetchFriendsData();
      fetchDiscoverUsers();
    } catch (err) {
      showToast(getErrorMessage(err, 'Unable to accept request.'));
    }
  };

  const declineRequest = async (userId) => {
    try {
      await api.post('/api/friends/reject', { userId });
      showToast('Friend request declined.');
      fetchFriendsData();
    } catch (err) {
      showToast(getErrorMessage(err, 'Unable to decline request.'));
    }
  };

  const removeFriend = async (friendId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    try {
      await api.delete(`/api/friends/${friendId}`);
      showToast('Friend removed.');
      fetchFriendsData();
      fetchDiscoverUsers();
    } catch (err) {
      showToast(getErrorMessage(err, 'Unable to remove friend.'));
    }
  };

  const startChat = (friendId) => {
    navigate(`/chats?user=${friendId}`);
  };

  const isFriend = (id) => friends.some(f => (f._id || f.id)?.toString() === id?.toString());

  const displayedUsers = searchQuery.trim() ? searchResults : discoverUsers;

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
        <Users size={30} style={{ color: 'var(--primary-color)' }} /> Friends & Community
      </h1>

      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 9999,
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            fontSize: '0.9rem',
            animation: 'fadeIn 0.2s ease-in'
          }}
        >
          {toastMessage}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        
        {/* Left Column: Friends List & Incoming Requests */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Incoming Requests */}
          {requests.length > 0 && (
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <h2 style={{ marginBottom: '1rem', color: 'var(--accent-color)', fontSize: '1.25rem' }}>
                Friend Requests ({requests.length})
              </h2>
              {requests.map(req => (
                <div key={req._id || req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', border: '1px solid var(--border-color)', borderRadius: '10px', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <UserAvatar userObj={req} size="42px" gradient="linear-gradient(135deg, #3b82f6, #8b5cf6)" />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{req.displayName || req.username}</h4>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{req.email}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button onClick={() => acceptRequest(req._id || req.id)} className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                      <Check size={15} /> Accept
                    </button>
                    <button onClick={() => declineRequest(req._id || req.id)} className="btn btn-outline" style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem' }} title="Decline">
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* My Friends */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h2 style={{ marginBottom: '1.25rem', fontSize: '1.25rem' }}>My Friends ({friends.length})</h2>
            {loadingFriends ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>Loading friends...</div>
            ) : friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-secondary)' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}>You haven't added any friends yet.</p>
                <span style={{ fontSize: '0.8rem' }}>Check out the community members on the right to connect!</span>
              </div>
            ) : (
              friends.map(friend => (
                <div key={friend._id || friend.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <UserAvatar userObj={friend} size="44px" gradient="linear-gradient(135deg, #10b981, #3b82f6)" />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{friend.displayName || friend.username}</h4>
                      <div style={{ fontSize: '0.75rem', color: friend.status === 'online' ? 'var(--success)' : 'var(--text-secondary)' }}>
                        {friend.status === 'online' ? '🟢 Online' : '⚪ Offline'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => startChat(friend._id || friend.id)} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}>
                      <MessageSquare size={15} /> Chat
                    </button>
                    <button onClick={() => removeFriend(friend._id || friend.id)} className="btn btn-outline" style={{ padding: '0.4rem 0.65rem' }} title="Remove Friend">
                      <UserMinus size={15} style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Search & Discover Registered Users */}
        <div className="glass-panel" style={{ padding: '1.75rem', height: 'fit-content' }}>
          <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
            <Sparkles size={20} style={{ color: 'var(--accent-color)' }} /> Find & Add People
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Search anyone by username, email, or phone number, or connect with people below.
          </p>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search username, phone, email..." 
                style={{ paddingLeft: '2.5rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="btn btn-outline" style={{ padding: '0.5rem 0.85rem' }}>
                <X size={16} />
              </button>
            )}
          </form>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            {searchQuery.trim() ? `Search Results (${displayedUsers.length})` : `Community Members (${displayedUsers.length})`}
          </div>

          <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {displayedUsers.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem' }}>
                No users found.
              </div>
            ) : (
              displayedUsers.map(targetUser => {
                const targetId = (targetUser._id || targetUser.id)?.toString();
                const alreadyFriend = isFriend(targetId);
                const reqSent = sentRequests[targetId];

                return (
                  <div key={targetId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', border: '1px solid var(--border-color)', borderRadius: '10px', backgroundColor: 'rgba(15, 23, 42, 0.4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <UserAvatar userObj={targetUser} size="42px" gradient="linear-gradient(135deg, #8b5cf6, #3b82f6)" />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <h4 style={{ margin: 0, fontSize: '0.925rem' }}>{targetUser.displayName || targetUser.username}</h4>
                          {alreadyFriend && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Friend</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.75rem', marginTop: '0.2rem' }}>
                          {targetUser.phoneNumber && <span><Phone size={10} style={{ display: 'inline' }} /> {targetUser.phoneNumber}</span>}
                          {targetUser.email && <span><Mail size={10} style={{ display: 'inline' }} /> {targetUser.email}</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => startChat(targetId)} className="btn btn-outline" style={{ padding: '0.4rem 0.65rem', fontSize: '0.75rem' }} title="Send Message">
                        <MessageSquare size={14} />
                      </button>

                      {!alreadyFriend && (
                        <button
                          onClick={() => sendRequest(targetId)}
                          className="btn btn-primary"
                          style={{
                            padding: '0.4rem 0.65rem',
                            fontSize: '0.75rem',
                            backgroundColor: reqSent ? '#10b981' : undefined,
                          }}
                          title={reqSent ? 'Request Sent' : 'Add Friend'}
                        >
                          {reqSent ? <Check size={14} /> : <UserPlus size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Friends;
