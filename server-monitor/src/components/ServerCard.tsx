
import React from 'react';
import { Server, ServerStatus } from '../data';
import { API_URL } from '../config';

interface ServerCardProps {
  server: Server;
}

const statusColors = {
  [ServerStatus.Online]: 'text-success',
  [ServerStatus.Offline]: 'text-danger',
  [ServerStatus.Degraded]: 'text-warning',
  [ServerStatus.Checking]: 'text-muted',
};

const ServerCard: React.FC<ServerCardProps> = ({ server }) => {

  const handleRetry = (id: number) => {
    // The UI will update via WebSocket, so we just need to fire the request.
    fetch(`${API_URL}/${id}/check`, { method: 'POST' })
      .catch(error => console.error('Error triggering check:', error));
  };

  const isChecking = server.status === ServerStatus.Checking;
  const isOffline = server.status === ServerStatus.Offline;

  const cardClasses = `card h-100 ${isOffline ? 'border-danger offline-card-animation' : ''}`;
  const statusTextClasses = `card-text d-flex align-items-center ${statusColors[server.status]} ${isOffline ? 'fw-bold' : ''}`;

  return (
    <div className={cardClasses}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">{server.name}</h5>
        <button 
          className="btn btn-sm btn-outline-secondary" 
          onClick={() => handleRetry(server.id)}
          disabled={isChecking}
        >
          <i className="bi bi-arrow-clockwise"></i>
        </button>
      </div>
      <div className="card-body">
        <p className="card-text text-muted">{server.domain}</p>
        <p className={statusTextClasses}>
          <span style={{ fontSize: '1.5em', marginRight: '0.5rem' }}>●</span>
          {server.status}
          {isChecking && <div className="spinner-border spinner-border-sm ms-2" role="status"><span className="visually-hidden">Loading...</span></div>}
        </p>
      </div>
    </div>
  );
};

export default ServerCard;
