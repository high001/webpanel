import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function ServiceManagement({ API_BASE }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/services`);
      setServices(response.data.services);
      setError('');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to fetch services');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const serviceAction = async (serviceName, action) => {
    try {
      const response = await axios.post(`${API_BASE}/api/services/${serviceName}/${action}`);
      setMessage(response.data.message);
      setTimeout(() => setMessage(''), 3000);
      setTimeout(fetchServices, 1000);
    } catch (error) {
      setError(error.response?.data?.error || `Failed to ${action} service`);
      setTimeout(() => setError(''), 5000);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'active') return '#27ae60';
    if (status === 'inactive') return '#95a5a6';
    return '#e74c3c';
  };

  return (
    <div>
      <div className="tabs">
        <Link to="/" className="tab">Dashboard</Link>
        <Link to="/processes" className="tab">Processes</Link>
        <Link to="/services" className="tab active">Services</Link>
        <Link to="/files" className="tab">Files</Link>
        <Link to="/users" className="tab">Users</Link>
        <Link to="/logs" className="tab">Logs</Link>
        <Link to="/command" className="tab">Command</Link>
      </div>

      <h1>Service Management</h1>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <div className="card">
        <button onClick={fetchServices} style={{ marginBottom: '1rem' }}>
          Refresh
        </button>

        {loading ? (
          <div className="loading">Loading services...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Service Name</th>
                  <th>Status</th>
                  <th>Sub Status</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service, index) => (
                  <tr key={index}>
                    <td style={{ fontFamily: 'monospace' }}>{service.name}</td>
                    <td>
                      <span style={{ color: getStatusColor(service.active) }}>
                        {service.active}
                      </span>
                    </td>
                    <td>{service.sub}</td>
                    <td>{service.description}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {service.active === 'active' ? (
                          <>
                            <button
                              onClick={() => serviceAction(service.name, 'stop')}
                              className="danger"
                              style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                            >
                              Stop
                            </button>
                            <button
                              onClick={() => serviceAction(service.name, 'restart')}
                              style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                            >
                              Restart
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => serviceAction(service.name, 'start')}
                            className="success"
                            style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                          >
                            Start
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

export default ServiceManagement;

