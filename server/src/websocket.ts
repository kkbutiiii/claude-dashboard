import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

const clients = new Set<WebSocket>();

interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp: string;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    clients.add(ws);

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });

    // Send initial connection message
    ws.send(
      JSON.stringify({
        type: 'connected',
        data: { message: 'Connected to Claude Dashboard' },
        timestamp: new Date().toISOString(),
      })
    );
  });

  console.log('WebSocket server ready');
}

export function broadcast(message: WebSocketMessage) {
  const messageStr = JSON.stringify(message);

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

export function getClientCount(): number {
  return clients.size;
}
