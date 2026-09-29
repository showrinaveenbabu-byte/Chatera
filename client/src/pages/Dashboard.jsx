import React, { useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { Video, LogOut, MessageSquare, Settings, User, Info, HelpCircle, Users } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const { socket, hasUnreadChats, setHasUnreadChats } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  // Clear unread badge when user opens the chats page
  useEffect(() => {
    if (location.pathname === '/chats') {
      setHasUnreadChats(false);
    }
  }, [location.pathname, setHasUnreadChats]);

  // Global socket listener for background message arrival
  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (msg) => {
      if (location.pathname !== '/chats') {
        setHasUnreadChats(true);
      }
    };

    socket.on('receive-direct-message', handleIncoming);
    return () => {
      socket.off('receive-direct-message', handleIncoming);
    };
  }, [socket, location.pathname, setHasUnreadChats]);

  const navItems = [
    { name: 'Meeting', path: '/', icon: <Video size={20} /> },
    { name: 'Chats', path: '/chats', icon: <MessageSquare size={20} /> },
    { name: 'Friends', path: '/friends', icon: <Users size={20} /> },
    { name: 'Profile', path: '/profile', icon: <User size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
    { name: 'About', path: '/about', icon: <Info size={20} /> },
    { name: 'Help', path: '/help', icon: <HelpCircle size={20} /> },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%' }}>
      {/* Sidebar */}
      <div style={{ 
        width: '250px', 
        backgroundColor: 'var(--bg-dark-secondary)', 
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div className="brand" style={{ padding: '2rem 1.5rem', fontSize: '1.75rem' }}>Chatera</div>
        
        <div style={{ flex: 1, padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.map(item => (
            <Link 
              key={item.name} 
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                textDecoration: 'none',
                color: location.pathname === item.path ? 'white' : 'var(--text-secondary)',
                backgroundColor: location.pathname === item.path ? 'var(--primary-color)' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {item.icon} {item.name}
              </div>
              {item.path === '/chats' && hasUnreadChats && location.pathname !== '/chats' && (
                <span 
                  style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: '#3b82f6', 
                    boxShadow: '0 0 8px #3b82f6' 
                  }} 
                />
              )}
            </Link>
          ))}
        </div>

        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
          <div 
            onClick={() => navigate('/profile')}
            style={{ 
              marginBottom: '1rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '8px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="View Profile"
          >
            <div style={{ position: 'relative', width: '42px', height: '42px', flexShrink: 0 }}>
              {user?.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('data:image')) ? (
                <img 
                  src={user.avatar} 
                  alt={user?.username} 
                  style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-color)' }}
                />
              ) : (
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold', fontSize: '1rem' }}>
                  {(user?.displayName || user?.username)?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              {/* Status dot */}
              <span 
                style={{
                  position: 'absolute',
                  bottom: '-1px',
                  right: '-1px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  border: '2px solid var(--bg-dark-secondary)',
                  backgroundColor: 
                    user?.status === 'busy' ? '#ef4444' :
                    user?.status === 'away' ? '#f59e0b' :
                    user?.status === 'offline' ? '#64748b' : '#10b981'
                }}
              />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.displayName || user?.username}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                {user?.status || 'Online'}
              </div>
            </div>
          </div>
          <button onClick={logout} className="btn btn-outline" style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem' }}>
            <LogOut size={16} style={{ marginRight: '0.5rem' }} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-dark)' }}>
        <Outlet />
      </div>
    </div>
  );
};

export default Dashboard;
