import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function ProcessManagement({ API_BASE }) {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchProcesses = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/processes`);
      setProcesses(response.data.processes);
      setError('');
    } catch (error) {
      setError('Failed to fetch processes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const killProcess = async (pid) => {
    if (!window.confirm(`Are you sure you want to kill process ${pid}?`)) {
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/api/processes/${pid}/kill`);
      setMessage(response.data.message);
      setTimeout(() => setMessage(''), 3000);
      fetchProcesses();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to kill process');
      setTimeout(() => setError(''), 5000);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div>
      <div className="tabs">
        <Link to="/" className="tab">Dashboard</Link>
        <Link to="/processes" className="tab active">Processes</Link>
        <Link to="/services" className="tab">Services</Link>
        <Link to="/files" className="tab">Files</Link>
        <Link to="/users" className="tab">Users</Link>
        <Link to="/logs" className="tab">Logs</Link>
        <Link to="/command" className="tab">Command</Link>
      </div>

      <h1>Process Management</h1>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <div className="card">
        <button onClick={fetchProcesses} style={{ marginBottom: '1rem' }}>
          Refresh
        </button>

        {loading ? (
          <div className="loading">Loading processes...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>PID</th>
                  <th>Name</th>
                  <th>User</th>
                  <th>CPU %</th>
                  <th>Memory %</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((proc) => (
                  <tr key={proc.pid}>
                    <td>{proc.pid}</td>
                    <td>{proc.name}</td>
                    <td>{proc.username || 'N/A'}</td>
                    <td>{proc.cpu_percent?.toFixed(1) || '0.0'}%</td>
                    <td>{proc.memory_percent?.toFixed(1) || '0.0'}%</td>
                    <td>{proc.status}</td>
                    <td>{new Date(proc.create_time).toLocaleString()}</td>
                    <td>
                      <button
                        className="danger"
                        onClick={() => killProcess(proc.pid)}
                        style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                      >
                        Kill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProcessManagement;

