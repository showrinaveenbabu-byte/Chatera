import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const login = async (username, password) => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { username, password });
      const u = res.data.user;
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', u.username);
      localStorage.setItem('id', u.id);
      localStorage.setItem('email', u.email || '');
      localStorage.setItem('phoneNumber', u.phoneNumber || '');
      localStorage.setItem('avatar', u.avatar || '');
      localStorage.setItem('displayName', u.displayName || u.username);
      localStorage.setItem('status', u.status || 'online');
      localStorage.setItem('theme', u.theme || 'dark');

      setUser({ 
        token: res.data.token, 
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
      return { success: false, message: err.response?.data?.msg || 'Login failed' };
    }
  };

  const register = async (username, email, phoneNumber, password, displayName = '', avatar = '') => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', { 
        username, 
        email, 
        phoneNumber, 
        password, 
        displayName, 
        avatar 
      });
      const u = res.data.user;
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', u.username);
      localStorage.setItem('id', u.id);
      localStorage.setItem('email', u.email || '');
      localStorage.setItem('phoneNumber', u.phoneNumber || '');
      localStorage.setItem('avatar', u.avatar || '');
      localStorage.setItem('displayName', u.displayName || u.username);
      localStorage.setItem('status', u.status || 'online');
      localStorage.setItem('theme', u.theme || 'dark');

      setUser({ 
        token: res.data.token, 
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
      return { success: false, message: err.response?.data?.msg || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('id');
    localStorage.removeItem('email');
    localStorage.removeItem('phoneNumber');
    localStorage.removeItem('avatar');
    localStorage.removeItem('theme');
    document.body.classList.remove('light-theme');
    setUser(null);
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
