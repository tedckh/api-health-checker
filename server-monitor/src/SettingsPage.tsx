
import React, { useState } from 'react';
import { Server, ServerStatus } from './data';
import { API_URL } from './config';

interface SettingsPageProps {
  servers: Server[];
  setServers: React.Dispatch<React.SetStateAction<Server[]>>;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ servers, setServers }) => {
  const [healthCheckPeriod, setHealthCheckPeriod] = useState<number>(60);
  
  // State for adding a new server
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newToken, setNewToken] = useState('');

  // State for editing a server
  const [editingServerId, setEditingServerId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editToken, setEditToken] = useState<string | undefined>('');

  const handleAddServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newDomain) return;

    const newServer = {
      name: newName,
      domain: newDomain,
      token: newToken,
      status: ServerStatus.Checking,
    };

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newServer),
    })
      .then(res => res.json())
      .then(addedServer => {
        setServers([...servers, addedServer]);
        setNewName('');
        setNewDomain('');
        setNewToken('');
      });
  };

  const handleDeleteServer = (id: number) => {
    fetch(`${API_URL}/${id}`, { method: 'DELETE' })
      .then(() => {
        setServers(servers.filter(server => server.id !== id));
      });
  };

  const handleEdit = (server: Server) => {
    setEditingServerId(server.id);
    setEditName(server.name);
    setEditDomain(server.domain);
    setEditToken(server.token);
  };

  const handleCancelEdit = () => {
    setEditingServerId(null);
    setEditName('');
    setEditDomain('');
    setEditToken('');
  };

  const handleSaveEdit = (id: number) => {
    const updatedServer = { name: editName, domain: editDomain, token: editToken };

    fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedServer),
    })
      .then(res => res.json())
      .then(savedServer => {
        setServers(servers.map(server => 
          server.id === id ? savedServer : server
        ));
        handleCancelEdit();
      });
  };

  return (
    <div>
      <h1 className="mb-4">Settings</h1>

      <div className="card mb-4">
        <div className="card-header">Configuration</div>
        <div className="card-body">
          <div className="mb-3">
            <label htmlFor="healthCheckPeriod" className="form-label">Health Check Period (seconds)</label>
            <input
              type="number"
              className="form-control"
              id="healthCheckPeriod"
              value={healthCheckPeriod}
              onChange={(e) => setHealthCheckPeriod(parseInt(e.target.value, 10))}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Monitored Servers</div>
        <div className="card-body">
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th>Name</th>
                <th>Domain/IP</th>
                <th>Token</th>
                <th style={{ width: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {servers.map(server => (
                <tr key={server.id}>
                  {editingServerId === server.id ? (
                    <>
                      <td><input type="text" className="form-control" value={editName} onChange={(e) => setEditName(e.target.value)} /></td>
                      <td><input type="text" className="form-control" value={editDomain} onChange={(e) => setEditDomain(e.target.value)} /></td>
                      <td><input type="password" className="form-control" value={editToken} onChange={(e) => setEditToken(e.target.value)} placeholder="********" /></td>
                      <td>
                        <button className="btn btn-sm btn-success me-2" onClick={() => handleSaveEdit(server.id)}>Save</button>
                        <button className="btn btn-sm btn-secondary" onClick={handleCancelEdit}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{server.name}</td>
                      <td>{server.domain}</td>
                      <td>{server.token ? '********' : 'N/A'}</td>
                      <td>
                        <button className="btn btn-sm btn-primary me-2" onClick={() => handleEdit(server)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteServer(server.id)}>Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-header">Add New Server</div>
        <div className="card-body">
          <form onSubmit={handleAddServer}>
            <div className="mb-3">
              <label htmlFor="serverName" className="form-label">Server Name</label>
              <input type="text" className="form-control" id="serverName" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="mb-3">
              <label htmlFor="serverDomain" className="form-label">Domain/IP</label>
              <input type="text" className="form-control" id="serverDomain" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} />
            </div>
            <div className="mb-3">
              <label htmlFor="serverToken" className="form-label">Authentication Token (Optional)</label>
              <input type="password" className="form-control" id="serverToken" value={newToken} onChange={(e) => setNewToken(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-success">Add Server</button>
          </form>
        </div>
      </div>

    </div>
  );
}

export default SettingsPage;
