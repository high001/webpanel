import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function LogViewer({ API_BASE }) {
  const [logs, setLogs] = useState([]);
  const [logFiles, setLogFiles] = useState([]);
  const [selectedLog, setSelectedLog] = useState('/var/log/syslog');
  const [lines, setLines] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLogFiles();
    fetchLogs();
  }, [selectedLog, lines]);

  const fetchLogFiles = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/logs/list`);
      setLogFiles(response.data.log_files);
    } catch (error) {
      console.error('Failed to fetch log files:', error);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/logs?file=${encodeURIComponent(selectedLog)}&lines=${lines}`);
      setLogs(response.data.logs);
      setError('');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to fetch logs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="tabs">
        <Link to="/" className="tab">Dashboard</Link>
        <Link to="/processes" className="tab">Processes</Link>
        <Link to="/services" className="tab">Services</Link>
        <Link to="/files" className="tab">Files</Link>
        <Link to="/users" className="tab">Users</Link>
        <Link to="/logs" className="tab active">Logs</Link>
        <Link to="/command" className="tab">Command</Link>
      </div>

      <h1>Log Viewer</h1>

      {error && <div className="error">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label>Log File</label>
            <select value={selectedLog} onChange={(e) => setSelectedLog(e.target.value)}>
              <option value="/var/log/syslog">/var/log/syslog</option>
              <option value="/var/log/auth.log">/var/log/auth.log</option>
              <option value="/var/log/messages">/var/log/messages</option>
              <option value="/var/log/kern.log">/var/log/kern.log</option>
              {logFiles.map((file) => (
                <option key={file.path} value={file.path}>
                  {file.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ width: '150px', marginBottom: 0 }}>
            <label>Lines</label>
            <input
              type="number"
              value={lines}
              onChange={(e) => setLines(parseInt(e.target.value) || 100)}
              min="10"
              max="1000"
            />
          </div>
          <button onClick={fetchLogs} style={{ marginTop: '1.5rem' }}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading logs...</div>
        ) : (
          <div className="log-viewer">
            {logs.length === 0 ? (
              <div>No logs found</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="log-line">{log}</div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default LogViewer;

