# Claude Dashboard 架构设计

本文档说明 Claude Dashboard 的系统架构和技术设计决策。

---

## 目录

- [系统概览](#系统概览)
- [架构图](#架构图)
- [前端架构](#前端架构)
- [后端架构](#后端架构)
- [数据流](#数据流)
- [性能优化](#性能优化)
- [安全考虑](#安全考虑)

---

## 系统概览

Claude Dashboard 是一个用于浏览和管理 Claude Code 会话历史的 Web 应用。系统采用前后端分离架构：

- **前端**: React SPA，负责 UI 渲染和用户交互
- **后端**: Node.js + Express API，负责数据处理和文件系统操作
- **数据**: 读取 Claude Code 本地会话文件（JSONL格式）

---

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                          浏览器                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  React + Vite + Tailwind                                │   │
│  │  ├─ ProjectList (项目列表)                               │   │
│  │  ├─ SessionView (会话视图)                               │   │
│  │  ├─ MessageRenderer (消息渲染)                           │   │
│  │  ├─ SearchPanel (搜索面板)                               │   │
│  │  └─ BookmarkManager (书签管理)                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                     HTTP / WebSocket                            │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                     Node.js + Express                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  API Routes                                             │   │
│  │  ├─ /api/scanner/* (项目扫描)                            │   │
│  │  ├─ /api/sessions/* (会话管理)                           │   │
│  │  ├─ /api/search (消息搜索)                               │   │
│  │  ├─ /api/bookmarks (书签管理)                            │   │
│  │  └─ /api/tags (标签管理)                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Core Services                                          │   │
│  │  ├─ ProjectScanner (项目扫描器)                          │   │
│  │  ├─ FileWatcher (文件监控)                               │   │
│  │  └─ CacheManager (缓存管理)                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                     文件系统                                     │
│  ┌─────────────────────────┐    ┌────────────────────────────┐ │
│  │  ~/.claude/projects/    │    │  data/                      │ │
│  │  ├─ project-1/          │    │  ├─ bookmarks.json          │ │
│  │  │   └─ session-1.jsonl │    │  ├─ tags.json               │ │
│  │  │   └─ session-2.jsonl │    │  └─ session-tags.json       │ │
│  │  └─ project-2/          │    └────────────────────────────┘ │
│  │      └─ ...             │                                   │
│  └─────────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 前端架构

### 技术栈

- **React 19**: UI 框架，使用函数组件和 Hooks
- **TypeScript**: 类型安全
- **Vite**: 构建工具，快速热重载
- **Tailwind CSS**: 原子化 CSS
- **Zustand**: 轻量级状态管理
- **React Router**: 客户端路由

### 组件结构

```
src/
├── components/          # React 组件
│   ├── ProjectList.tsx      # 项目列表
│   ├── ProjectDetail.tsx    # 项目详情
│   ├── SessionList.tsx      # 会话列表
│   ├── SessionView.tsx      # 会话视图
│   ├── MessageRenderer.tsx  # 消息渲染
│   ├── SearchPanel.tsx      # 搜索面板
│   ├── BookmarkButton.tsx   # 书签按钮
│   ├── TagManager.tsx       # 标签管理
│   ├── GitInfo.tsx          # Git 信息
│   └── Documentation/       # 文档浏览器
│       ├── DocList.tsx
│       └── DocViewer.tsx
├── stores/
│   └── useStore.ts          # 全局状态
├── types/
│   └── index.ts             # 类型定义
└── App.tsx                  # 入口组件
```

### 状态管理

使用 Zustand 管理全局状态：

```typescript
interface AppState {
  // 项目
  projects: Project[];
  currentProject: Project | null;
  fetchProjects: () => Promise<void>;

  // 书签
  bookmarks: Bookmark[];
  addBookmark: (bookmark: Bookmark) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;

  // 标签
  tags: Tag[];
  createTag: (tag: Tag) => Promise<void>;

  // 搜索
  searchResults: SearchResult[];
  search: (query: SearchQuery) => Promise<void>;
}
```

### 组件设计原则

1. **单一职责**: 每个组件只做一件事
2. **组合优先**: 使用组合而非继承
3. **受控组件**: 状态提升，props 传递
4. **懒加载**: 大组件使用动态导入

---

## 后端架构

### 技术栈

- **Node.js 20**: 运行时
- **Express**: Web 框架
- **TypeScript**: 类型安全
- **WebSocket (ws)**: 实时通信
- **chokidar**: 文件系统监控

### 核心模块

#### ProjectScanner

负责扫描和解析 Claude Code 项目：

```typescript
class ProjectScanner {
  // 扫描所有项目
  async scanAllProjects(): Promise<Project[]>;

  // 扫描单个项目
  async scanSingleProject(name: string): Promise<Project | null>;

  // 读取会话
  private async readSession(...): Promise<Session | null>;

  // 搜索消息
  async searchMessages(query: SearchQuery): Promise<SearchResult[]>;

  // Git 历史
  async getGitHistory(projectName: string, limit: number): Promise<GitHistory>;
}
```

**缓存策略**:
- 内存缓存，30秒 TTL
- 文件变更时自动失效
- 单例模式避免重复扫描

#### FileWatcher

监控文件系统变化：

```typescript
class FileWatcher {
  // 监听项目目录
  watch(projectsPath: string): void;

  // 文件变化回调
  onChange(callback: (event: WatchEvent) => void): void;
}
```

**事件类型**:
- `project_added`: 新项目
- `project_removed`: 项目删除
- `session_updated`: 会话更新

#### CacheManager

内存缓存管理：

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 30000; // 30秒

  get<T>(key: string): T | undefined;
  set<T>(key: string, data: T): void;
  invalidate(key: string): void;
  invalidateAll(): void;
}
```

### API 设计

遵循 RESTful 原则：

| 资源 | 操作 | 端点 |
|-----|------|------|
| 项目 | 列表 | `GET /api/scanner/projects` |
| 项目 | 详情 | `GET /api/scanner/projects/:name` |
| 会话 | 详情 | `GET /api/sessions/:project/:session` |
| 书签 | CRUD | `/api/bookmarks` |
| 标签 | CRUD | `/api/tags` |
| 搜索 | 查询 | `POST /api/search` |

---

## 数据流

### 项目列表加载

```
1. 页面加载
   ↓
2. fetchProjects() (Zustand action)
   ↓
3. GET /api/scanner/projects
   ↓
4. ProjectScanner.scanAllProjects()
   ↓
5. 检查缓存 → 返回缓存 / 执行扫描
   ↓
6. 读取文件系统 (~/.claude/projects/)
   ↓
7. 解析 .jsonl 文件
   ↓
8. 构建项目列表
   ↓
9. 存入缓存
   ↓
10. 返回响应
   ↓
11. 更新 Zustand state
   ↓
12. 组件 re-render
```

### 消息搜索

```
1. 用户输入关键词
   ↓
2. 防抖处理 (300ms)
   ↓
3. search() (Zustand action)
   ↓
4. POST /api/search
   ↓
5. ProjectScanner.searchMessages()
   ↓
6. 遍历所有会话文件
   ↓
7. 匹配消息内容
   ↓
8. 返回结果
   ↓
9. 更新搜索状态
   ↓
10. 显示结果列表
```

### 文件变更通知

```
1. 文件系统变化 (chokidar)
   ↓
2. FileWatcher 检测
   ↓
3. 清除相关缓存
   ↓
4. WebSocket 推送
   ↓
5. 前端接收消息
   ↓
6. 触发重新加载
```

---

## 性能优化

### 服务端优化

1. **缓存机制**
   - 30秒 TTL 内存缓存
   - 按需失效策略
   - 避免重复文件扫描

2. **并发控制**
   - 单例扫描器
   - Promise 锁防止重复扫描
   - 流式读取大文件

3. **数据裁剪**
   - 项目列表不包含完整消息
   - 分页加载会话
   - 搜索限制结果数量

### 前端优化

1. **请求优化**
   - 防抖处理 (搜索、请求)
   - 缓存项目列表 30秒
   - 条件请求 (If-None-Match)

2. **渲染优化**
   - 组件懒加载
   - useMemo/useCallback
   - 虚拟列表 (大数据量)

3. **资源优化**
   - Tree shaking
   - 代码分割
   - 图片懒加载

---

## 安全考虑

### 路径安全

```typescript
// 防止路径遍历攻击
function sanitizePath(input: string): string {
  // 移除 .. 和绝对路径
  return input.replace(/\.\./g, '').replace(/^\//, '');
}

// 限制访问范围
function isPathAllowed(targetPath: string): boolean {
  const basePath = path.resolve(CLAUDE_PROJECTS_PATH);
  const resolvedPath = path.resolve(targetPath);
  return resolvedPath.startsWith(basePath);
}
```

### XSS 防护

1. **消息渲染**: React 自动转义
2. **Markdown**: 使用 rehype-sanitize
3. **用户输入**: 服务端验证

### 文件访问

1. 只允许访问 `CLAUDE_PROJECTS_PATH` 下的文件
2. Markdown 文件读取白名单机制
3. 禁止访问 `.env` 等敏感文件

---

## 扩展性设计

### 添加新数据源

如需支持其他 AI 工具的会话：

1. 实现 `DataSource` 接口
2. 添加数据源配置
3. 扩展 `ProjectScanner`

### 插件系统

预留扩展点：

```typescript
interface Plugin {
  name: string;
  onProjectLoad?: (project: Project) => void;
  onMessageRender?: (message: Message) => ReactNode;
}
```

---

## 部署架构

### 开发环境

```
浏览器 ←→ Vite Dev Server ←→ Express API ←→ 文件系统
              (3000)          (3727)
```

### 生产环境

```
浏览器 ←→ Nginx ←→ Express API ←→ 文件系统
              └──→ 静态文件 (web/dist)
```

### Docker 部署

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3727:3727"
    volumes:
      - ~/.claude/projects:/data/projects:ro
      - ./data:/app/data
```

---

## 监控与调试

### 日志

```typescript
// 请求日志
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${Date.now()}`);
  next();
});

// 错误日志
console.error('[Scanner Error]', error);
```

### 性能指标

- API 响应时间
- 文件扫描耗时
- 缓存命中率
- 内存使用量

---

## 未来演进

### 短期

- SQLite 存储书签和标签
- 搜索索引持久化
- 增量更新

### 中期

- 插件系统
- 多用户支持
- 云同步

### 长期

- 分布式部署
- AI 辅助分析
- 知识图谱
