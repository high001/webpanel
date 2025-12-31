import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function FileManagement({ API_BASE }) {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('/home');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [uploadPath, setUploadPath] = useState('/tmp');

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath]);

  const fetchFiles = async (path) => {
    try {
      const response = await axios.get(`${API_BASE}/api/files?path=${encodeURIComponent(path)}`);
      setFiles(response.data.files);
      setCurrentPath(response.data.current_path);
      setError('');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to fetch files');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (path) => {
    setCurrentPath(path);
    setLoading(true);
  };

  const downloadFile = async (filePath) => {
    try {
      const response = await axios.get(`${API_BASE}/api/files/download?path=${encodeURIComponent(filePath)}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filePath.split('/').pop());
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to download file');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', uploadPath);

    try {
      const response = await axios.post(`${API_BASE}/api/files/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage(response.data.message);
      setTimeout(() => setMessage(''), 3000);
      fetchFiles(uploadPath);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to upload file');
      setTimeout(() => setError(''), 5000);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div>
      <div className="tabs">
        <Link to="/" className="tab">Dashboard</Link>
        <Link to="/processes" className="tab">Processes</Link>
        <Link to="/services" className="tab">Services</Link>
        <Link to="/files" className="tab active">Files</Link>
        <Link to="/users" className="tab">Users</Link>
        <Link to="/logs" className="tab">Logs</Link>
        <Link to="/command" className="tab">Command</Link>
      </div>

      <h1>File Management</h1>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <div className="card">
        <h2>Upload File</h2>
        <div className="form-group">
          <label>Upload Path</label>
          <input
            type="text"
            value={uploadPath}
            onChange={(e) => setUploadPath(e.target.value)}
            placeholder="/tmp"
          />
        </div>
        <input type="file" onChange={handleUpload} />
      </div>

      <div className="card">
        <h2>File Browser</h2>
        <div className="file-path">
          <strong>Current Path:</strong> {currentPath}
        </div>
        <button onClick={() => fetchFiles(currentPath)} style={{ marginBottom: '1rem' }}>
          Refresh
        </button>

        {loading ? (
          <div className="loading">Loading files...</div>
        ) : (
          <div className="file-browser">
            {currentPath !== '/' && (
              <div className="file-item" onClick={() => navigateTo(currentPath.split('/').slice(0, -1).join('/') || '/')}>
                <span className="file-item-icon">📁</span>
                <strong>.. (Parent Directory)</strong>
              </div>
            )}
            {files.map((file, index) => (
              <div
                key={index}
                className="file-item"
                onClick={() => file.is_directory && navigateTo(file.path)}
              >
                <span className="file-item-icon">{file.is_directory ? '📁' : '📄'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: file.is_directory ? 'bold' : 'normal' }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    {!file.is_directory && formatBytes(file.size)} • {file.permissions} • {new Date(file.modified).toLocaleString()}
                  </div>
                </div>
                {!file.is_directory && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadFile(file.path);
                    }}
                    style={{ marginLeft: '1rem' }}
                  >
                    Download
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FileManagement;

