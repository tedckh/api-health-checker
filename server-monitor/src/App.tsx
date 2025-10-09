import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import DashboardPage from "./DashboardPage";
import SettingsPage from "./SettingsPage";
import { Server } from "./data";
import { API_URL, SETTINGS_URL } from "./config";
import { websocketService } from "./websocketService";
import "./App.css";

function App() {
  const [servers, setServers] = useState<Server[]>([]);
  const [healthCheckPeriod, setHealthCheckPeriod] = useState<number>(60);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setServers(data))
      .catch((error) => console.error("Error fetching servers:", error));

    fetch(`${SETTINGS_URL}/health-check`)
      .then((res) => res.json())
      .then((data) => {
        if (data.period) {
          setHealthCheckPeriod(data.period);
        }
      })
      .catch((error) => console.error("Error fetching settings:", error));

    websocketService.connect();
    websocketService.onMessage((payload) => {
      setServers([...payload.servers]);
      setLastCheckedAt(payload.meta.lastCheckedAt);

      setHealthCheckPeriod((prevPeriod) => {
        if (payload.meta.healthCheckPeriod !== prevPeriod) {
          return payload.meta.healthCheckPeriod;
        }
        return prevPeriod;
      });
    });

    return () => {
      websocketService.disconnect();
    };
  }, []);

  return (
    <Router>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid">
          <Link className="navbar-brand" to="/">
            Server Monitor
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav">
              <li className="nav-item">
                <Link className="nav-link" to="/">
                  Dashboard
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/settings">
                  Settings
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <div className="container mt-4">
        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                servers={servers}
                healthCheckPeriod={healthCheckPeriod}
                lastCheckedAt={lastCheckedAt}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <SettingsPage
                servers={servers}
                setServers={setServers}
                healthCheckPeriod={healthCheckPeriod}
                setHealthCheckPeriod={setHealthCheckPeriod}
              />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
