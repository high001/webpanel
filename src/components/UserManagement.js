import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function UserManagement({ API_BASE }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changePasswordUser, setChangePasswordUser] = useState('');
  const [newPasswordValue, setNewPasswordValue] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/users`);
      setUsers(response.data.users);
      setError('');
    } catch (error) {
      setError('Failed to fetch users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE}/api/users`, {
        username: newUsername,
        password: newPassword
      });
      setMessage(response.data.message);
      setShowAddUser(false);
      setNewUsername('');
      setNewPassword('');
      setTimeout(() => setMessage(''), 3000);
      fetchUsers();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create user');
      setTimeout(() => setError(''), 5000);
    }
  };

  const deleteUser = async (username) => {
    if (!window.confirm(`Are you sure you want to delete user ${username}?`)) {
      return;
    }

    try {
      const response = await axios.delete(`${API_BASE}/api/users/${username}`);
      setMessage(response.data.message);
      setTimeout(() => setMessage(''), 3000);
      fetchUsers();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete user');
      setTimeout(() => setError(''), 5000);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE}/api/users/${changePasswordUser}/password`, {
        password: newPasswordValue
      });
      setMessage(response.data.message);
      setChangePasswordUser('');
      setNewPasswordValue('');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to change password');
      setTimeout(() => setError(''), 5000);
    }
  };

  return (
    <div>
      <div className="tabs">
        <Link to="/" className="tab">Dashboard</Link>
        <Link to="/processes" className="tab">Processes</Link>
        <Link to="/services" className="tab">Services</Link>
        <Link to="/files" className="tab">Files</Link>
        <Link to="/users" className="tab active">Users</Link>
        <Link to="/logs" className="tab">Logs</Link>
        <Link to="/command" className="tab">Command</Link>
      </div>

      <h1>User Management</h1>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>System Users</h2>
          <button onClick={() => setShowAddUser(!showAddUser)}>
            {showAddUser ? 'Cancel' : 'Add User'}
          </button>
        </div>

        {showAddUser && (
          <form onSubmit={createUser} style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h3>Create New User</h3>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit">Create User</button>
          </form>
        )}

        {changePasswordUser && (
          <form onSubmit={changePassword} style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h3>Change Password for {changePasswordUser}</h3>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPasswordValue}
                onChange={(e) => setNewPasswordValue(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit">Change Password</button>
              <button type="button" onClick={() => {
                setChangePasswordUser('');
                setNewPasswordValue('');
              }}>Cancel</button>
            </div>
          </form>
        )}

        <button onClick={fetchUsers} style={{ marginBottom: '1rem' }}>
          Refresh
        </button>

        {loading ? (
          <div className="loading">Loading users...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>UID</th>
                  <th>GID</th>
                  <th>Home Directory</th>
                  <th>Shell</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.username}>
                    <td>{user.username}</td>
                    <td>{user.uid}</td>
                    <td>{user.gid}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{user.home}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{user.shell}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => setChangePasswordUser(user.username)}
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                        >
                          Change Password
                        </button>
                        {user.uid >= 1000 && (
                          <button
                            className="danger"
                            onClick={() => deleteUser(user.username)}
                            style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
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

export default UserManagement;

