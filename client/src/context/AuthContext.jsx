import React, { createContext, useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage } from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('id');
    localStorage.removeItem('email');
    localStorage.removeItem('phoneNumber');
    localStorage.removeItem('avatar');
    localStorage.removeItem('displayName');
    localStorage.removeItem('status');
    localStorage.removeItem('theme');
    document.body.classList.remove('light-theme');
    setUser(null);
  }, []);

  useEffect(() => {
    // Check local storage for existing session
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const id = localStorage.getItem('id');
    
    if (token && username && id) {
      const storedEmail = localStorage.getItem('email') || '';
      const storedPhone = localStorage.getItem('phoneNumber') || '';
      const storedAvatar = localStorage.getItem('avatar') || '';
      const storedDisplayName = localStorage.getItem('displayName') || username;
      const storedStatus = localStorage.getItem('status') || 'online';
      const storedTheme = localStorage.getItem('theme') || 'dark';
      
      setUser({ 
        token, 
        username, 
        id, 
        email: storedEmail, 
        phoneNumber: storedPhone, 
        avatar: storedAvatar,
        displayName: storedDisplayName,
        status: storedStatus,
        theme: storedTheme 
      });

      if (storedTheme === 'light') {
        document.body.classList.add('light-theme');
      } else {
        document.body.classList.remove('light-theme');
      }
    }
    setLoading(false);

    // Listen for unauthorized 401 events from the api interceptor
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('chatera:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('chatera:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  const login = async (username, password) => {
    try {
      const res = await api.post('/api/auth/login', { username, password });
      const u = res.data.user;
      const token = res.data.token;

      localStorage.setItem('token', token);
      localStorage.setItem('username', u.username);
      localStorage.setItem('id', u.id);
      localStorage.setItem('email', u.email || '');
      localStorage.setItem('phoneNumber', u.phoneNumber || '');
      localStorage.setItem('avatar', u.avatar || '');
      localStorage.setItem('displayName', u.displayName || u.username);
      localStorage.setItem('status', u.status || 'online');
      localStorage.setItem('theme', u.theme || 'dark');

      setUser({ 
        token, 
        username: u.username, 
        id: u.id, 
        email: u.email, 
        phoneNumber: u.phoneNumber, 
        avatar: u.avatar || '',
        displayName: u.displayName || u.username,
        status: u.status || 'online',
        theme: u.theme || 'dark' 
      });

      if (u.theme === 'light') {
        document.body.classList.add('light-theme');
      } else {
        document.body.classList.remove('light-theme');
      }
      return { success: true };
    } catch (err) {
      return { success: false, message: getErrorMessage(err, 'Login failed. Please check your credentials.') };
    }
  };

  const register = async (username, email, phoneNumber, password, displayName = '', avatar = '') => {
    try {
      const res = await api.post('/api/auth/register', { 
        username, 
        email, 
        phoneNumber, 
        password, 
        displayName, 
        avatar 
      });
      const u = res.data.user;
      const token = res.data.token;

      localStorage.setItem('token', token);
      localStorage.setItem('username', u.username);
      localStorage.setItem('id', u.id);
      localStorage.setItem('email', u.email || '');
      localStorage.setItem('phoneNumber', u.phoneNumber || '');
      localStorage.setItem('avatar', u.avatar || '');
      localStorage.setItem('displayName', u.displayName || u.username);
      localStorage.setItem('status', u.status || 'online');
      localStorage.setItem('theme', u.theme || 'dark');

      setUser({ 
        token, 
        username: u.username, 
        id: u.id, 
        email: u.email, 
        phoneNumber: u.phoneNumber, 
        avatar: u.avatar || '',
        displayName: u.displayName || u.username,
        status: u.status || 'online',
        theme: u.theme || 'dark' 
      });

      return { success: true };
    } catch (err) {
      return { success: false, message: getErrorMessage(err, 'Registration failed. Please try again.') };
    }
  };

  const updateUser = (newUserData) => {
    setUser((prev) => {
      const updated = { ...prev, ...newUserData };
      if (newUserData.username) localStorage.setItem('username', newUserData.username);
      if (newUserData.displayName) localStorage.setItem('displayName', newUserData.displayName);
      if (newUserData.avatar !== undefined) localStorage.setItem('avatar', newUserData.avatar);
      if (newUserData.email) localStorage.setItem('email', newUserData.email);
      if (newUserData.phoneNumber) localStorage.setItem('phoneNumber', newUserData.phoneNumber);
      if (newUserData.status) localStorage.setItem('status', newUserData.status);
      if (newUserData.theme) {
        localStorage.setItem('theme', newUserData.theme);
        if (newUserData.theme === 'light') {
          document.body.classList.add('light-theme');
        } else {
          document.body.classList.remove('light-theme');
        }
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
