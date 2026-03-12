import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { scannerRouter } from './routes/scanner.js';
import { sessionRouter } from './routes/session.js';
import { bookmarkRouter } from './routes/bookmark.js';
import { tagRouter } from './routes/tag.js';
import { setupWebSocket } from './websocket.js';
import { startFileWatcher } from './watcher.js';
import { initDatabase, closeDatabase } from './db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3727;

// Middleware
app.use(cors());
app.use(compression({
  filter: (req, res) => {
    // 只压缩大于 1KB 的响应
    const contentLength = res.getHeader('content-length');
    if (contentLength && Number(contentLength) < 1024) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // 压缩级别 1-9，6 是性能和压缩率的平衡
}));
app.use(express.json());

// API routes
app.use('/api/scanner', scannerRouter);
app.use('/api/sessions', sessionRouter);
app.use('/api/bookmarks', bookmarkRouter);
app.use('/api/tags', tagRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files (frontend)
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Serve index.html for all non-API routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Claude Dashboard server running on http://localhost:${PORT}`);

  // Initialize SQLite database
  initDatabase();

  // Start file watcher
  const claudePath = process.env.CLAUDE_PROJECTS_PATH || `${process.env.HOME}/.claude/projects`;
  startFileWatcher(claudePath);
  console.log(`👁 Watching: ${claudePath}`);
});

// Setup WebSocket
setupWebSocket(server);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  closeDatabase();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
