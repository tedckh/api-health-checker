import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ServerCard from "./components/ServerCard";
import { Server } from "./data";

interface DashboardPageProps {
  servers: Server[];
  healthCheckPeriod: number;
  lastCheckedAt: number | null;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
  servers,
  healthCheckPeriod,
  lastCheckedAt,
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    const calculateRemaining = () => {
      if (lastCheckedAt === null) {
        return null;
      }
      const nextCheckTime = lastCheckedAt + healthCheckPeriod * 1000;
      const remaining = Math.round((nextCheckTime - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    };

    setCountdown(calculateRemaining());

    const timer = setInterval(() => {
      setCountdown(calculateRemaining());
    }, 1000);

    return () => clearInterval(timer);
  }, [servers, healthCheckPeriod, lastCheckedAt]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Dashboard</h1>
        {countdown !== null && (
          <div className="text-muted">Next update in: {countdown}s</div>
        )}
      </div>

      {servers.length === 0 ? (
        <div className="alert alert-info">
          <h4 className="alert-heading">No Servers to Monitor</h4>
          <p>
            You haven't added any servers yet. Please go to the{" "}
            <Link to="/settings" className="alert-link">
              Settings page
            </Link>{" "}
            to add your first server.
          </p>
        </div>
      ) : (
        <div className="row">
          {servers.map((server) => (
            <div className="col-lg-3 col-md-6 mb-4" key={server.id}>
              <ServerCard server={server} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
