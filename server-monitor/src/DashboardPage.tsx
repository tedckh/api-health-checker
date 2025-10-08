
import React from 'react';
import ServerCard from './components/ServerCard';
import { Server } from './data';

interface DashboardPageProps {
  servers: Server[];
}

const DashboardPage: React.FC<DashboardPageProps> = ({ servers }) => {
  return (
    <div>
      <h1 className="mb-4">Dashboard</h1>
      <div className="row">
        {servers.map(server => (
          <div className="col-lg-4 col-md-6 mb-4" key={server.id}>
            <ServerCard server={server} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
