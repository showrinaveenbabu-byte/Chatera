import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Meeting from './pages/Meeting';
import Room from './pages/Room';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import ChatList from './pages/ChatList';
import Friends from './pages/Friends';
import About from './pages/About';
import Help from './pages/Help';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh'}}>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return children;
};

function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}>
          <Route index element={<Meeting />} />
          <Route path="chats" element={<ChatList />} />
          <Route path="friends" element={<Friends />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="about" element={<About />} />
          <Route path="help" element={<Help />} />
        </Route>

        <Route path="/room/:roomId" element={<ProtectedRoute><Room /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}

export default App;
