import chokidar from 'chokidar';
import path from 'path';
import { broadcast } from './websocket.js';
import { getScannerInstance } from './routes/scanner.js';

let watcher: ReturnType<typeof chokidar.watch> | null = null;

export function startFileWatcher(basePath: string) {
  if (watcher) {
    console.log('Watcher already running');
    return;
  }

  const watchPath = path.join(basePath, '**', 'sessions', '*.jsonl');

  watcher = chokidar.watch(watchPath, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  });

  watcher.on('add', (filePath) => {
    console.log('New session file:', filePath);
    const info = parseSessionPath(filePath, basePath);
    if (info) {
      // 使该项目缓存失效
      getScannerInstance().invalidateProjectCache(info.projectName);
      broadcast({
        type: 'session_created',
        data: info,
        timestamp: new Date().toISOString(),
      });
    }
  });

  watcher.on('change', (filePath) => {
    console.log('Session file changed:', filePath);
    const info = parseSessionPath(filePath, basePath);
    if (info) {
      // 使该项目缓存失效
      getScannerInstance().invalidateProjectCache(info.projectName);
      broadcast({
        type: 'session_updated',
        data: info,
        timestamp: new Date().toISOString(),
      });
    }
  });

  watcher.on('unlink', (filePath) => {
    console.log('Session file removed:', filePath);
    const info = parseSessionPath(filePath, basePath);
    if (info) {
      // 使该项目缓存失效
      getScannerInstance().invalidateProjectCache(info.projectName);
      broadcast({
        type: 'session_removed',
        data: info,
        timestamp: new Date().toISOString(),
      });
    }
  });

  console.log(`Started watching: ${watchPath}`);
}

function parseSessionPath(filePath: string, basePath: string) {
  const relative = path.relative(basePath, filePath);
  const parts = relative.split(path.sep);

  if (parts.length >= 3 && parts[1] === 'sessions') {
    return {
      projectName: parts[0],
      sessionId: parts[2].replace('.jsonl', ''),
      filePath,
    };
  }

  return null;
}

export function stopFileWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
    console.log('File watcher stopped');
  }
}
