
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import SettingsPage from './SettingsPage';
import { Server } from './data';
import { API_URL, WS_URL } from './config';
import './App.css';

function App() {
  const [servers, setServers] = useState<Server[]>([]);

  useEffect(() => {
    // Initial fetch
    fetch(API_URL)
      .then(res => res.json())
      .then(data => setServers(data))
      .catch(error => console.error('Error fetching servers:', error));

    // Set up WebSocket connection
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('WebSocket connection established');
    };

    ws.onmessage = (event) => {
      const updatedServers = JSON.parse(event.data);
      setServers(updatedServers);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Clean up the connection when the component unmounts
    return () => {
      ws.close();
    };
  }, []);

  return (
    <Router>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid">
          <Link className="navbar-brand" to="/">Server Monitor</Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav">
              <li className="nav-item">
                <Link className="nav-link" to="/">Dashboard</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/settings">Settings</Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <div className="container mt-4">
        <Routes>
          <Route path="/" element={<DashboardPage servers={servers} />} />
          <Route path="/settings" element={<SettingsPage servers={servers} setServers={setServers} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;