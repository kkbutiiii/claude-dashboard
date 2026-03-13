import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Project, Session, ClaudeMessage } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库实例
let db: Database.Database | null = null;

// 初始化数据库
export function initDatabase(): Database.Database {
  if (db) return db;

  const dbPath = path.join(__dirname, '../../../data/claude-dashboard.db');
  db = new Database(dbPath);

  // 启用 WAL 模式以获得更好的并发性能
  db.pragma('journal_mode = WAL');

  // 创建表结构
  createTables();

  console.log('SQLite database initialized at:', dbPath);
  return db;
}

// 获取数据库实例
export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

// 关闭数据库
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('SQLite database closed');
  }
}

// 创建表结构
function createTables(): void {
  if (!db) return;

  // 项目表
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      name TEXT PRIMARY KEY,
      display_name TEXT,
      path TEXT NOT NULL,
      source_path TEXT,
      session_count INTEGER DEFAULT 0,
      last_updated TEXT,
      description TEXT,
      avatar TEXT,
      markdown_files TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 会话表
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      project_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      display_name TEXT,
      message_count INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      total_tokens INTEGER DEFAULT 0,
      estimated_cost REAL DEFAULT 0,
      file_mtime INTEGER,
      last_scanned INTEGER,
      FOREIGN KEY (project_name) REFERENCES projects(name) ON DELETE CASCADE
    )
  `);

  // 迁移：为已存在的表添加 display_name 字段
  try {
    db.exec(`ALTER TABLE sessions ADD COLUMN display_name TEXT`);
  } catch {
    // 字段已存在，忽略错误
  }

  // 消息表 - 仅存储元数据，不存储完整内容
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      uuid TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      parent_uuid TEXT,
      timestamp TEXT,
      type TEXT,
      role TEXT,
      content_preview TEXT,
      has_content INTEGER DEFAULT 0,
      model TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      cost_usd REAL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  // 搜索索引表 - 倒排索引
  db.exec(`
    CREATE TABLE IF NOT EXISTS search_index (
      word TEXT NOT NULL,
      session_id TEXT NOT NULL,
      message_uuid TEXT NOT NULL,
      position INTEGER,
      PRIMARY KEY (word, message_uuid),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_name);
    CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at);
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
    CREATE INDEX IF NOT EXISTS idx_search_word ON search_index(word);
    CREATE INDEX IF NOT EXISTS idx_search_session ON search_index(session_id);
  `);

  // 创建全文搜索虚拟表 (FTS5)
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      content,
      session_id,
      message_uuid,
      tokenize='porter'
    )
  `);
}

// 保存项目
export function saveProject(project: Project): void {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO projects (
      name, display_name, path, source_path, session_count,
      last_updated, description, avatar, markdown_files, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    project.name,
    project.displayName,
    project.path,
    project.sourcePath || null,
    project.sessionCount,
    project.lastUpdated,
    project.description || '',
    project.avatar || null,
    JSON.stringify(project.markdownFiles || []),
    new Date().toISOString()
  );
}

// 获取所有项目
export function getAllProjects(): Project[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM projects ORDER BY last_updated DESC
  `);

  const rows = stmt.all() as Array<{
    name: string;
    display_name: string;
    path: string;
    source_path: string | null;
    session_count: number;
    last_updated: string;
    description: string;
    avatar: string | null;
    markdown_files: string;
  }>;

  return rows.map(row => ({
    name: row.name,
    displayName: row.display_name,
    path: row.path,
    sourcePath: row.source_path || undefined,
    sessionCount: row.session_count,
    lastUpdated: row.last_updated,
    description: row.description,
    avatar: row.avatar || undefined,
    markdownFiles: JSON.parse(row.markdown_files),
    sessions: [],
  }));
}

// 保存会话
export function saveSession(session: Session, fileMtime: number): void {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO sessions (
      id, project_name, file_path, message_count, created_at,
      updated_at, total_tokens, estimated_cost, file_mtime, last_scanned
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    session.id,
    session.projectName,
    session.filePath,
    session.messageCount,
    session.createdAt,
    session.updatedAt,
    session.totalTokens || 0,
    session.estimatedCost || 0,
    fileMtime,
    Date.now()
  );
}

// 获取项目的所有会话
export function getSessionsByProject(projectName: string): Session[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM sessions WHERE project_name = ? ORDER BY updated_at DESC
  `);

  const rows = stmt.all(projectName) as Array<{
    id: string;
    project_name: string;
    file_path: string;
    display_name: string | null;
    message_count: number;
    created_at: string;
    updated_at: string;
    total_tokens: number;
    estimated_cost: number;
  }>;

  return rows.map(row => ({
    id: row.id,
    projectName: row.project_name,
    filePath: row.file_path,
    displayName: row.display_name || undefined,
    messageCount: row.message_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    totalTokens: row.total_tokens,
    estimatedCost: row.estimated_cost,
    messages: [],
  }));
}

// 保存会话显示名称
export function saveSessionDisplayName(sessionId: string, displayName: string): void {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE sessions SET display_name = ? WHERE id = ?
  `);

  stmt.run(displayName, sessionId);
}

// 获取会话显示名称
export function getSessionDisplayName(sessionId: string): string | null {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT display_name FROM sessions WHERE id = ?
  `);

  const row = stmt.get(sessionId) as { display_name: string | null } | undefined;
  return row?.display_name || null;
}

// 获取会话的最后扫描时间
export function getSessionLastScanned(sessionId: string): number | null {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT last_scanned FROM sessions WHERE id = ?
  `);

  const row = stmt.get(sessionId) as { last_scanned: number } | undefined;
  return row?.last_scanned || null;
}

// 保存消息
export function saveMessage(message: ClaudeMessage, sessionId: string): void {
  const db = getDatabase();

  const content = typeof message.message?.content === 'string'
    ? message.message.content
    : JSON.stringify(message.message?.content);

  const contentPreview = content.slice(0, 500);

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO messages (
      uuid, session_id, parent_uuid, timestamp, type, role,
      content_preview, has_content, model, input_tokens, output_tokens, cost_usd
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    message.uuid,
    sessionId,
    message.parentUuid || null,
    message.timestamp,
    message.type,
    message.message?.role || null,
    contentPreview,
    content.length > 0 ? 1 : 0,
    message.message?.model || null,
    message.message?.usage?.input_tokens || 0,
    message.message?.usage?.output_tokens || 0,
    message.costUSD || 0
  );

  // 同时插入到全文搜索表
  const ftsStmt = db.prepare(`
    INSERT OR REPLACE INTO messages_fts (content, session_id, message_uuid)
    VALUES (?, ?, ?)
  `);

  ftsStmt.run(content, sessionId, message.uuid);
}

// 删除会话的所有消息
export function deleteSessionMessages(sessionId: string): void {
  const db = getDatabase();

  const stmt = db.prepare(`DELETE FROM messages WHERE session_id = ?`);
  stmt.run(sessionId);

  const ftsStmt = db.prepare(`DELETE FROM messages_fts WHERE session_id = ?`);
  ftsStmt.run(sessionId);
}

// 搜索消息 - 使用全文搜索
export function searchMessagesFTS(
  query: string,
  options: {
    project?: string;
    role?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  } = {}
): Array<{
  sessionId: string;
  messageUuid: string;
  content: string;
  rank: number;
}> {
  const db = getDatabase();
  const { project, role, dateFrom, dateTo, limit = 50 } = options;

  // 构建查询
  let sql = `
    SELECT
      m.session_id as sessionId,
      m.uuid as messageUuid,
      m.content_preview as content,
      rank
    FROM messages_fts fts
    JOIN messages m ON fts.message_uuid = m.uuid
    JOIN sessions s ON m.session_id = s.id
    WHERE messages_fts MATCH ?
  `;

  const params: (string | number)[] = [query];

  if (project) {
    sql += ` AND s.project_name = ?`;
    params.push(project);
  }

  if (role) {
    sql += ` AND m.role = ?`;
    params.push(role);
  }

  if (dateFrom) {
    sql += ` AND m.timestamp >= ?`;
    params.push(dateFrom);
  }

  if (dateTo) {
    sql += ` AND m.timestamp <= ?`;
    params.push(dateTo);
  }

  sql += ` ORDER BY rank LIMIT ?`;
  params.push(limit);

  const stmt = db.prepare(sql);
  return stmt.all(...params) as Array<{
    sessionId: string;
    messageUuid: string;
    content: string;
    rank: number;
  }>;
}

// 删除项目及其所有数据
export function deleteProject(projectName: string): void {
  const db = getDatabase();

  const stmt = db.prepare(`DELETE FROM projects WHERE name = ?`);
  stmt.run(projectName);
}

// 删除会话及其所有消息
export function deleteSession(sessionId: string): void {
  const db = getDatabase();

  const stmt = db.prepare(`DELETE FROM sessions WHERE id = ?`);
  stmt.run(sessionId);
}

// 获取数据库统计信息
export function getDatabaseStats(): {
  projects: number;
  sessions: number;
  messages: number;
  searchIndex: number;
} {
  const db = getDatabase();

  const projects = (db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number }).count;
  const sessions = (db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number }).count;
  const messages = (db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number }).count;
  const searchIndex = (db.prepare('SELECT COUNT(*) as count FROM search_index').get() as { count: number }).count;

  return { projects, sessions, messages, searchIndex };
}
