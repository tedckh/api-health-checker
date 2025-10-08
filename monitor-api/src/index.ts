
import express from 'express';
import cors from 'cors';
import fetch, { Headers } from 'node-fetch';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
const port = process.env.PORT || 5101;

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Types and Data
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
  token?: string; // Optional authentication token
}

let servers: Server[] = [
  { id: 1, name: 'Public Test API', domain: 'api.publicapis.org/entries', status: ServerStatus.Checking },
  { id: 2, name: 'Google', domain: 'google.com', status: ServerStatus.Checking },
  { id: 3, name: 'A Fictional Blog', domain: 'blog.fictional-site.dev', status: ServerStatus.Checking },
  { id: 4, name: 'Example Site', domain: 'example.com', status: ServerStatus.Checking, token: 'some-secret-token' },
];

// Middleware
app.use(cors());
app.use(express.json());

// WebSocket Logic
const broadcast = (data: any) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
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

    if (response.status >= 200 && response.status < 300) {
      return ServerStatus.Online;
    }
    return ServerStatus.Degraded;
  } catch (error) {
    return ServerStatus.Offline;
  }
};

const updateAllServerStatuses = async () => {
  console.log('Checking server statuses...');
  const statusPromises = servers.map(async (server) => {
    const newStatus = await checkServerStatus(server);
    server.status = newStatus;
  });
  await Promise.all(statusPromises);
  console.log('Finished checking server statuses. Broadcasting updates...');
  broadcast(servers);
};

// API Endpoints
app.get('/api/servers', (req, res) => {
  res.json(servers);
});

app.post('/api/servers', (req, res) => {
  const newServer: Server = {
    ...req.body,
    id: Date.now(),
    status: ServerStatus.Checking,
  };
  servers.push(newServer);
  checkServerStatus(newServer).then(status => {
    newServer.status = status;
    broadcast(servers);
  });
  res.status(201).json(newServer);
});

app.post('/api/servers/:id/check', async (req, res) => {
  const { id } = req.params;
  const server = servers.find(s => s.id === parseInt(id, 10));

  if (!server) {
    return res.status(404).json({ message: 'Server not found' });
  }

  server.status = ServerStatus.Checking;
  broadcast(servers); // Immediately show that it's checking

  const newStatus = await checkServerStatus(server);
  server.status = newStatus;
  broadcast(servers); // Broadcast the final result

  res.status(200).json(server);
});

app.delete('/api/servers/:id', (req, res) => {
  const { id } = req.params;
  servers = servers.filter(server => server.id !== parseInt(id, 10));
  broadcast(servers);
  res.status(204).send();
});

app.put('/api/servers/:id', (req, res) => {
  const { id } = req.params;
  const serverId = parseInt(id, 10);
  const updatedServerData = req.body;

  const serverIndex = servers.findIndex(s => s.id === serverId);

  if (serverIndex === -1) {
    return res.status(404).json({ message: 'Server not found' });
  }

  const updatedServer = { ...servers[serverIndex], ...updatedServerData };
  servers[serverIndex] = updatedServer;

  broadcast(servers);
  res.json(updatedServer);
});

// Start Server and Health Check Loop
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  updateAllServerStatuses();
  setInterval(updateAllServerStatuses, 60000);
});
