import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Settings as SettingsIcon, Moon, Sun, Bell, Lock, Shield } from 'lucide-react';

const Settings = () => {
  const { user } = useContext(AuthContext);
  const [theme, setTheme] = useState(user?.theme || 'dark');
  const [notifications, setNotifications] = useState(true);
  const [privacy, setPrivacy] = useState('everyone');

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  const saveSettings = async () => {
    try {
      await axios.put('http://localhost:5000/api/users/profile', { theme }, {
        headers: { 'x-auth-token': user.token }
      });
      localStorage.setItem('theme', theme);
      alert('Settings saved successfully!');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '3rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        <SettingsIcon size={32} /> Settings
      </h1>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />} Appearance
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ marginBottom: '0.25rem' }}>Theme</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Switch between dark and light mode.</p>
            </div>
            <select className="form-input" style={{ width: 'auto' }} value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="dark">Dark Theme</option>
              <option value="light">Light Theme</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <Bell size={20} /> Notifications
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ marginBottom: '0.25rem' }}>Push Notifications</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Receive alerts for new messages and calls.</p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
              <input type="checkbox" checked={notifications} onChange={() => setNotifications(!notifications)} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ 
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                backgroundColor: notifications ? 'var(--primary-color)' : 'var(--border-color)', 
                transition: '.4s', borderRadius: '34px' 
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: '26px', width: '26px', left: '4px', bottom: '4px',
                  backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                  transform: notifications ? 'translateX(26px)' : 'none'
                }}></span>
              </span>
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <Shield size={20} /> Privacy & Security
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ marginBottom: '0.25rem' }}>Profile Visibility</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Who can see your phone number and email.</p>
            </div>
            <select className="form-input" style={{ width: 'auto' }} value={privacy} onChange={(e) => setPrivacy(e.target.value)}>
              <option value="everyone">Everyone</option>
              <option value="contacts">My Contacts</option>
              <option value="nobody">Nobody</option>
            </select>
          </div>
        </div>

        <button onClick={saveSettings} className="btn btn-primary" style={{ width: '100%' }}>Save Settings</button>

      </div>
    </div>
  );
};

export default Settings;
