import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Dashboard({ API_BASE }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/dashboard/stats`);
      setStats(response.data);
      setError('');
    } catch (error) {
      setError('Failed to fetch dashboard stats');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getProgressColor = (percent) => {
    if (percent < 50) return '';
    if (percent < 80) return 'warning';
    return 'danger';
  };

  if (loading && !stats) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error && !stats) {
    return <div className="error">{error}</div>;
  }

  return (
    <div>
      <div className="tabs">
        <Link to="/" className="tab active">Dashboard</Link>
        <Link to="/processes" className="tab">Processes</Link>
        <Link to="/services" className="tab">Services</Link>
        <Link to="/files" className="tab">Files</Link>
        <Link to="/users" className="tab">Users</Link>
        <Link to="/logs" className="tab">Logs</Link>
        <Link to="/command" className="tab">Command</Link>
      </div>

      <h1 style={{ marginBottom: '2rem' }}>Dashboard</h1>

      {error && <div className="error">{error}</div>}

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>CPU Usage</h3>
            <div className="value">{stats.cpu.percent.toFixed(1)}%</div>
            <div className="sub-value">{stats.cpu.count} cores</div>
            <div className="progress-bar">
              <div
                className={`progress-fill ${getProgressColor(stats.cpu.percent)}`}
                style={{ width: `${stats.cpu.percent}%` }}
              />
            </div>
          </div>

          <div className="stat-card">
            <h3>Memory Usage</h3>
            <div className="value">{stats.memory.percent.toFixed(1)}%</div>
            <div className="sub-value">
              {formatBytes(stats.memory.used)} / {formatBytes(stats.memory.total)}
            </div>
            <div className="progress-bar">
              <div
                className={`progress-fill ${getProgressColor(stats.memory.percent)}`}
                style={{ width: `${stats.memory.percent}%` }}
              />
            </div>
          </div>

          <div className="stat-card">
            <h3>Disk Usage</h3>
            <div className="value">{stats.disk.percent.toFixed(1)}%</div>
            <div className="sub-value">
              {formatBytes(stats.disk.used)} / {formatBytes(stats.disk.total)}
            </div>
            <div className="progress-bar">
              <div
                className={`progress-fill ${getProgressColor(stats.disk.percent)}`}
                style={{ width: `${stats.disk.percent}%` }}
              />
            </div>
          </div>

          <div className="stat-card">
            <h3>System Info</h3>
            <div className="value" style={{ fontSize: '1.2rem' }}>{stats.hostname}</div>
            <div className="sub-value">IP: {stats.ip_address}</div>
            <div className="sub-value">
              Uptime: {stats.uptime.days}d {stats.uptime.hours}h {stats.uptime.minutes}m
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

