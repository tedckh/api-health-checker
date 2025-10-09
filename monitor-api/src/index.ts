import express from "express";
import cors from "cors";
import fetch, { Headers } from "node-fetch";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";

const app = express();
const port = process.env.PORT || 5101;

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

enum ServerStatus {
  Online = "Online",
  Offline = "Offline",
  Degraded = "Degraded",
  Checking = "Checking",
}

interface Server {
  id: number;
  name: string;
  domain: string;
  status: ServerStatus;
  token?: string;
}

let servers: Server[] = [];

let healthCheckIntervalSeconds = 60;

app.use(cors());
app.use(express.json());

let healthCheckTimer: NodeJS.Timeout;

const broadcastUpdate = () => {
  const payload = {
    servers: servers,
    meta: {
      lastCheckedAt: Date.now(),
      healthCheckPeriod: healthCheckIntervalSeconds,
    },
  };
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  });
};

const checkServerStatus = async (server: Server): Promise<ServerStatus> => {
  try {
    const url = server.domain.startsWith("http")
      ? server.domain
      : `http://${server.domain}`;
    const headers = new Headers();
    if (server.token) {
      headers.append("Authorization", `Bearer ${server.token}`);
    }
    const response = await fetch(url, { headers, timeout: 5000 });
    if (response.status >= 200 && response.status < 300)
      return ServerStatus.Online;
    return ServerStatus.Degraded;
  } catch (error) {
    return ServerStatus.Offline;
  }
};

const updateAllServerStatuses = async () => {
  console.log(
    `Checking server statuses... (Interval: ${healthCheckIntervalSeconds}s)`
  );
  const newServers = await Promise.all(
    servers.map(async (server) => {
      const newStatus = await checkServerStatus(server);
      return { ...server, status: newStatus };
    })
  );
  servers = newServers;
  console.log("Finished checking server statuses. Broadcasting updates...");
  broadcastUpdate();
};

const startHealthCheckLoop = () => {
  if (healthCheckTimer) clearInterval(healthCheckTimer);
  updateAllServerStatuses();
  healthCheckTimer = setInterval(
    updateAllServerStatuses,
    healthCheckIntervalSeconds * 1000
  );
  console.log(
    `Health check loop started. Interval: ${healthCheckIntervalSeconds} seconds.`
  );
};

app.get("/api/servers", (req, res) => {
  res.json(servers);
});

app.post("/api/servers", (req, res) => {
  const newServer: Server = {
    ...req.body,
    id: Date.now(),
    status: ServerStatus.Checking,
  };
  servers = [...servers, newServer];
  checkServerStatus(newServer).then((status) => {
    servers = servers.map((s) =>
      s.id === newServer.id ? { ...s, status } : s
    );
    broadcastUpdate();
  });
  res.status(201).json(newServer);
});

app.post("/api/servers/:id/check", async (req, res) => {
  const serverId = parseInt(req.params.id, 10);
  const server = servers.find((s) => s.id === serverId);
  if (!server) return res.status(404).json({ message: "Server not found" });

  servers = servers.map((s) =>
    s.id === serverId ? { ...s, status: ServerStatus.Checking } : s
  );
  broadcastUpdate();

  const newStatus = await checkServerStatus(server);
  servers = servers.map((s) =>
    s.id === serverId ? { ...s, status: newStatus } : s
  );
  broadcastUpdate();

  const updatedServer = servers.find((s) => s.id === serverId);
  res.status(200).json(updatedServer);
});

app.delete("/api/servers/:id", (req, res) => {
  servers = servers.filter((s) => s.id !== parseInt(req.params.id, 10));
  broadcastUpdate();
  res.status(204).send();
});

app.put("/api/servers/:id", (req, res) => {
  const serverId = parseInt(req.params.id, 10);
  const updatedServerData = req.body;
  let serverExists = false;

  servers = servers.map((server) => {
    if (server.id === serverId) {
      serverExists = true;
      return { ...server, ...updatedServerData };
    }
    return server;
  });

  broadcastUpdate();

  if (serverExists) {
    const updatedServer = servers.find((s) => s.id === serverId);
    res.json(updatedServer);
  } else {
    res.status(404).json({ message: "Server not found" });
  }
});

app.get("/api/settings/health-check", (req, res) => {
  res.json({ period: healthCheckIntervalSeconds });
});

app.put("/api/settings/health-check", (req, res) => {
  const { period } = req.body;
  if (period && typeof period === "number" && period > 0) {
    healthCheckIntervalSeconds = period;
    startHealthCheckLoop();
    res.json({
      message: `Health check interval updated to ${period} seconds.`,
    });
  } else {
    res.status(400).json({ message: "Invalid period value" });
  }
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  startHealthCheckLoop();
});
