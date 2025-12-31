import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProcessManagement from './components/ProcessManagement';
import ServiceManagement from './components/ServiceManagement';
import FileManagement from './components/FileManagement';
import UserManagement from './components/UserManagement';
import LogViewer from './components/LogViewer';
import CommandExecution from './components/CommandExecution';
import axios from 'axios';

axios.defaults.withCredentials = true;
const API_BASE = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/check-auth`);
      if (response.data.authenticated) {
        setAuthenticated(true);
        setUsername(response.data.username);
      }
    } catch (error) {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (user) => {
    setAuthenticated(true);
    setUsername(user);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE}/api/logout`);
    } catch (error) {
      console.error('Logout error:', error);
    }
    setAuthenticated(false);
    setUsername('');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!authenticated) {
    return <Login onLogin={handleLogin} API_BASE={API_BASE} />;
  }

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <h1>Linux Server Control Panel</h1>
          <div className="navbar-user">
            <span>Welcome, {username}</span>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </nav>
        <div className="container">
          <Routes>
            <Route path="/" element={<Dashboard API_BASE={API_BASE} />} />
            <Route path="/processes" element={<ProcessManagement API_BASE={API_BASE} />} />
            <Route path="/services" element={<ServiceManagement API_BASE={API_BASE} />} />
            <Route path="/files" element={<FileManagement API_BASE={API_BASE} />} />
            <Route path="/users" element={<UserManagement API_BASE={API_BASE} />} />
            <Route path="/logs" element={<LogViewer API_BASE={API_BASE} />} />
            <Route path="/command" element={<CommandExecution API_BASE={API_BASE} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;

