import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function CommandExecution({ API_BASE }) {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const executeCommand = async (e) => {
    e.preventDefault();
    if (!command.trim()) return;

    setLoading(true);
    setError('');
    setOutput('');

    try {
      const response = await axios.post(`${API_BASE}/api/command`, {
        command: command
      });

      if (response.data.success) {
        let result = '';
        if (response.data.stdout) {
          result += response.data.stdout;
        }
        if (response.data.stderr) {
          result += (result ? '\n' : '') + 'STDERR:\n' + response.data.stderr;
        }
        if (response.data.returncode !== 0) {
          result += `\n\nReturn code: ${response.data.returncode}`;
        }
        setOutput(result || 'Command executed (no output)');
      } else {
        setError('Command execution failed');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to execute command');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const clearOutput = () => {
    setOutput('');
    setError('');
  };

  return (
    <div>
      <div className="tabs">
        <Link to="/" className="tab">Dashboard</Link>
        <Link to="/processes" className="tab">Processes</Link>
        <Link to="/services" className="tab">Services</Link>
        <Link to="/files" className="tab">Files</Link>
        <Link to="/users" className="tab">Users</Link>
        <Link to="/logs" className="tab">Logs</Link>
        <Link to="/command" className="tab active">Command</Link>
      </div>

      <h1>Command Execution</h1>

      <div className="card">
        <p style={{ marginBottom: '1rem', color: '#666' }}>
          Execute shell commands on the server. Dangerous commands are blocked for security.
        </p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={executeCommand}>
          <div className="form-group">
            <label>Command</label>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g., ls -la, df -h, whoami"
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={loading}>
              {loading ? 'Executing...' : 'Execute'}
            </button>
            {output && (
              <button type="button" onClick={clearOutput}>
                Clear
              </button>
            )}
          </div>
        </form>

        {output && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3>Output</h3>
            <div className="command-output">{output}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CommandExecution;

