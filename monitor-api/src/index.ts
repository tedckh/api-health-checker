import express from 'express';
import cors from 'cors';
import fetch, { Headers } from 'node-fetch';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';

const app = express();
const port = process.env.PORT || 5101;

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// --- Data Persistence ---
const DB_FILE = path.join(__dirname, 'database.json');

enum ServerStatus {
  Online = 'Online',
  Offline = 'Offline',
  Degraded = 'Degraded',
  Checking = 'Checking',
}

interface Server {
  id: number;
  name: string;
  domain: string;
  status: ServerStatus;
  token?: string;
}

interface Database {
  servers: Server[];
  healthCheckIntervalSeconds: number;
}

let db: Database = {
  servers: [],
  healthCheckIntervalSeconds: 60,
};

const loadDatabase = () => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(data);
      db.servers.forEach(server => server.status = ServerStatus.Checking);
      console.log('Database loaded successfully.');
    } else {
      saveDatabase();
      console.log('No database file found, created a new one.');
    }
  } catch (error) {
    console.error('Failed to load database:', error);
    db = { servers: [], healthCheckIntervalSeconds: 60 };
  }
};

const saveDatabase = () => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Failed to save database:', error);
  }
};

loadDatabase();

// --- End of Data Persistence ---


// Middleware
app.use(cors());
app.use(express.json());

// Test Counter
let counter = 0;

// Test Endpoint
app.get('/api/test/counter', (req, res) => {
  counter++;
  res.json({ count: counter });
});

// Settings
let healthCheckTimer: NodeJS.Timeout;

// WebSocket Logic
const broadcastUpdate = () => {
  const payload = {
    servers: db.servers,
    meta: {
      lastCheckedAt: Date.now(),
      healthCheckPeriod: db.healthCheckIntervalSeconds,
    },
  };
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  });
};

// Health Check Logic
const checkServerStatus = async (server: Server): Promise<ServerStatus> => {
  try {
    const url = server.domain.startsWith('http') ? server.domain : `http://${server.domain}`;
    const headers = new Headers();
    if (server.token) {
      headers.append('Authorization', `Bearer ${server.token}`);
    }
    const response = await fetch(url, { headers, timeout: 5000 });
    if (response.status >= 200 && response.status < 300) return ServerStatus.Online;
    return ServerStatus.Degraded;
  } catch (error) {
    return ServerStatus.Offline;
  }
};

const updateAllServerStatuses = async () => {
  console.log(`Checking server statuses... (Interval: ${db.healthCheckIntervalSeconds}s)`);
  const newServers = await Promise.all(db.servers.map(async (server) => {
    const newStatus = await checkServerStatus(server);
    return { ...server, status: newStatus };
  }));
  db.servers = newServers;
  console.log('Finished checking server statuses. Broadcasting updates...');
  broadcastUpdate();
};

const startHealthCheckLoop = () => {
  if (healthCheckTimer) clearInterval(healthCheckTimer);
  updateAllServerStatuses();
  healthCheckTimer = setInterval(updateAllServerStatuses, db.healthCheckIntervalSeconds * 1000);
  console.log(`Health check loop started. Interval: ${db.healthCheckIntervalSeconds} seconds.`);
};

// API Endpoints
app.get('/api/servers', (req, res) => {
  res.json(db.servers);
});

app.post('/api/servers', (req, res) => {
  const newServer: Server = { ...req.body, id: Date.now(), status: ServerStatus.Checking };
  db.servers = [...db.servers, newServer];
  saveDatabase();
  checkServerStatus(newServer).then(status => {
    db.servers = db.servers.map(s => s.id === newServer.id ? { ...s, status } : s);
    broadcastUpdate();
  });
  res.status(201).json(newServer);
});

app.post('/api/servers/:id/check', async (req, res) => {
  const serverId = parseInt(req.params.id, 10);
  const server = db.servers.find(s => s.id === serverId);
  if (!server) return res.status(404).json({ message: 'Server not found' });

  db.servers = db.servers.map(s => s.id === serverId ? { ...s, status: ServerStatus.Checking } : s);
  broadcastUpdate();

  const newStatus = await checkServerStatus(server);
  db.servers = db.servers.map(s => s.id === serverId ? { ...s, status: newStatus } : s);
  broadcastUpdate();

  const updatedServer = db.servers.find(s => s.id === serverId);
  res.status(200).json(updatedServer);
});

app.delete('/api/servers/:id', (req, res) => {
  db.servers = db.servers.filter(s => s.id !== parseInt(req.params.id, 10));
  saveDatabase();
  broadcastUpdate();
  res.status(204).send();
});

app.put('/api/servers/:id', (req, res) => {
  const serverId = parseInt(req.params.id, 10);
  const updatedServerData = req.body;
  let serverExists = false;

  db.servers = db.servers.map(server => {
    if (server.id === serverId) {
      serverExists = true;
      return { ...server, ...updatedServerData };
    }
    return server;
  });

  saveDatabase();
  broadcastUpdate();

  if (serverExists) {
    const updatedServer = db.servers.find(s => s.id === serverId);
    res.json(updatedServer);
  } else {
    res.status(404).json({ message: 'Server not found' });
  }
});

app.get('/api/settings/health-check', (req, res) => {
  res.json({ period: db.healthCheckIntervalSeconds });
});

app.put('/api/settings/health-check', (req, res) => {
  const { period } = req.body;
  if (period && typeof period === 'number' && period > 0) {
    db.healthCheckIntervalSeconds = period;
    saveDatabase();
    startHealthCheckLoop();
    res.json({ message: `Health check interval updated to ${period} seconds.` });
  } else {
    res.status(400).json({ message: 'Invalid period value' });
  }
});

// Start Server
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  startHealthCheckLoop();
});