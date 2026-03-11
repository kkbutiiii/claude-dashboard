# Claude Dashboard API 文档

本文档详细说明 Claude Dashboard 的后端 API 接口。

**Base URL:** `http://localhost:3727`

---

## 目录

- [项目扫描](#项目扫描)
- [会话管理](#会话管理)
- [消息搜索](#消息搜索)
- [书签管理](#书签管理)
- [标签管理](#标签管理)
- [Git 集成](#git-集成)
- [Markdown 文档](#markdown-文档)
- [WebSocket](#websocket)

---

## 项目扫描

### 获取所有项目

```http
GET /api/scanner/projects
```

**响应:**

```json
{
  "projects": [
    {
      "name": "C--Users-name-project-folder",
      "displayName": "project-folder",
      "path": "C:\\Users\\name\\.claude\\projects\\C--Users-name-project-folder",
      "sourcePath": "C:\\Users\\name\\Documents\\project-folder",
      "sessionCount": 5,
      "lastUpdated": "2026-03-11T10:30:00.000Z",
      "description": "项目描述",
      "avatar": { "type": "generated", "color": "#FF5733" },
      "sessions": [
        {
          "id": "session-uuid",
          "projectName": "C--Users-name-project-folder",
          "filePath": "...",
          "messages": [],
          "messageCount": 42,
          "createdAt": "2026-03-10T08:00:00.000Z",
          "updatedAt": "2026-03-11T10:30:00.000Z",
          "totalTokens": 15000,
          "estimatedCost": 0.45
        }
      ],
      "markdownFiles": [
        {
          "name": "README.md",
          "path": "C:\\...\\README.md",
          "relativePath": "README.md"
        }
      ]
    }
  ]
}
```

### 获取指定项目

```http
GET /api/scanner/projects/:name
```

**参数:**

| 参数 | 类型 | 说明 |
|-----|------|------|
| `name` | string | 项目名称（URL 编码）|

**响应:** 单个项目对象，包含完整的会话列表

---

## 会话管理

### 获取会话详情

```http
GET /api/sessions/:project/:session
```

**参数:**

| 参数 | 类型 | 说明 |
|-----|------|------|
| `project` | string | 项目名称（URL 编码）|
| `session` | string | 会话 ID |

**响应:**

```json
{
  "id": "session-uuid",
  "projectName": "project-name",
  "filePath": "...",
  "messages": [
    {
      "type": "user",
      "uuid": "msg-uuid",
      "timestamp": "2026-03-11T10:00:00.000Z",
      "message": {
        "role": "user",
        "content": "用户消息内容"
      }
    },
    {
      "type": "assistant",
      "uuid": "msg-uuid-2",
      "timestamp": "2026-03-11T10:01:00.000Z",
      "message": {
        "role": "assistant",
        "content": [
          { "type": "thinking", "thinking": "..." },
          { "type": "text", "text": "回复内容" }
        ],
        "usage": {
          "input_tokens": 1000,
          "output_tokens": 500
        }
      },
      "costUSD": 0.015
    }
  ],
  "messageCount": 10,
  "createdAt": "2026-03-11T10:00:00.000Z",
  "updatedAt": "2026-03-11T10:30:00.000Z",
  "totalTokens": 5000,
  "estimatedCost": 0.15
}
```

### 导出 Markdown

```http
GET /api/sessions/:project/:session/export/markdown
```

**响应:** Markdown 格式的会话内容

```markdown
# Session: session-name

## User (2026-03-11 10:00)

用户消息内容

## Assistant (2026-03-11 10:01)

回复内容
```

---

## 消息搜索

### 搜索消息

```http
POST /api/search
Content-Type: application/json
```

**请求体:**

```json
{
  "query": "搜索关键词",
  "projects": ["project-name"],
  "role": "assistant",
  "dateFrom": "2026-03-01",
  "dateTo": "2026-03-11"
}
```

**参数说明:**

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| `query` | string | 是 | 搜索关键词 |
| `projects` | string[] | 否 | 限制搜索的项目 |
| `role` | string | 否 | 限制消息角色 (user/assistant/system) |
| `dateFrom` | string | 否 | 开始日期 (YYYY-MM-DD) |
| `dateTo` | string | 否 | 结束日期 (YYYY-MM-DD) |

**响应:**

```json
{
  "results": [
    {
      "session": {
        "id": "session-uuid",
        "projectName": "project-name",
        "messageCount": 42,
        "createdAt": "...",
        "updatedAt": "..."
      },
      "matchedMessages": [
        {
          "type": "assistant",
          "uuid": "msg-uuid",
          "timestamp": "...",
          "message": {
            "role": "assistant",
            "content": "包含关键词的消息内容"
          }
        }
      ],
      "matchCount": 5
    }
  ],
  "totalResults": 10
}
```

---

## 书签管理

### 获取所有书签

```http
GET /api/bookmarks
```

**响应:**

```json
{
  "bookmarks": [
    {
      "id": "bookmark-id",
      "sessionId": "session-uuid",
      "projectName": "project-name",
      "messageUuid": "msg-uuid",
      "messagePreview": "消息预览",
      "note": "书签备注",
      "createdAt": "2026-03-11T10:00:00.000Z"
    }
  ]
}
```

### 添加书签

```http
POST /api/bookmarks
Content-Type: application/json
```

**请求体:**

```json
{
  "sessionId": "session-uuid",
  "projectName": "project-name",
  "messageUuid": "msg-uuid",
  "messagePreview": "消息预览",
  "note": "可选的备注"
}
```

**响应:**

```json
{
  "id": "new-bookmark-id",
  "sessionId": "session-uuid",
  "projectName": "project-name",
  "messageUuid": "msg-uuid",
  "messagePreview": "消息预览",
  "note": "可选的备注",
  "createdAt": "2026-03-11T10:00:00.000Z"
}
```

### 删除书签

```http
DELETE /api/bookmarks/:id
```

**响应:** `204 No Content`

---

## 标签管理

### 获取所有标签

```http
GET /api/tags
```

**响应:**

```json
{
  "tags": [
    {
      "id": "tag-id",
      "name": "重要",
      "color": "#FF5733",
      "createdAt": "2026-03-11T10:00:00.000Z"
    }
  ]
}
```

### 获取会话标签

```http
GET /api/sessions/:project/:session/tags
```

**响应:**

```json
{
  "tags": ["tag-id-1", "tag-id-2"]
}
```

### 创建标签

```http
POST /api/tags
Content-Type: application/json
```

**请求体:**

```json
{
  "name": "标签名称",
  "color": "#FF5733"
}
```

### 为会话添加标签

```http
POST /api/sessions/:project/:session/tags
Content-Type: application/json
```

**请求体:**

```json
{
  "tagId": "tag-id"
}
```

### 删除会话标签

```http
DELETE /api/sessions/:project/:session/tags/:tagId
```

### 删除标签

```http
DELETE /api/tags/:id
```

---

## Git 集成

### 获取项目 Git 历史

```http
GET /api/scanner/projects/:name/git-history?limit=20
```

**参数:**

| 参数 | 类型 | 默认值 | 说明 |
|-----|------|--------|------|
| `limit` | number | 20 | 返回的提交数量 |

**响应:**

```json
{
  "isGitRepo": true,
  "branch": "main",
  "commits": [
    {
      "hash": "abc123def456",
      "message": "feat: add new feature",
      "author": "Author Name",
      "date": "2026-03-11T10:00:00+08:00",
      "shortHash": "abc123d",
      "filesChanged": 3,
      "insertions": 100,
      "deletions": 20
    }
  ],
  "totalCommits": 150
}
```

---

## Markdown 文档

### 获取项目 Markdown 文件列表

已包含在项目详情接口中 (`/api/scanner/projects/:name`)

### 读取 Markdown 文件

```http
POST /api/scanner/read-markdown
Content-Type: application/json
```

**请求体:**

```json
{
  "projectName": "project-name",
  "filePath": "docs/README.md"
}
```

**响应:**

```json
{
  "content": "# Markdown 内容"
}
```

---

## WebSocket

WebSocket 用于实时推送文件变更通知。

### 连接

```javascript
const ws = new WebSocket('ws://localhost:3727');
```

### 消息格式

**服务端推送:**

```json
{
  "type": "projects_updated",
  "timestamp": "2026-03-11T10:00:00.000Z"
}
```

**消息类型:**

| 类型 | 说明 |
|-----|------|
| `projects_updated` | 项目列表已更新 |
| `project_updated` | 特定项目已更新 |
| `session_updated` | 特定会话已更新 |

### 示例

```javascript
const ws = new WebSocket('ws://localhost:3727');

ws.onopen = () => {
  console.log('WebSocket connected');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
  // 刷新项目列表
  if (data.type === 'projects_updated') {
    fetchProjects();
  }
};

ws.onclose = () => {
  console.log('WebSocket disconnected');
};
```

---

## 错误处理

所有接口在出错时返回以下格式:

```json
{
  "error": "错误描述"
}
```

**HTTP 状态码:**

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 类型定义

详见服务端源码 `server/src/types.ts`

```typescript
// 核心类型
interface Project {
  name: string;
  displayName: string;
  path: string;
  sourcePath?: string;
  sessions: Session[];
  sessionCount: number;
  lastUpdated: string;
  description?: string;
  avatar?: Avatar;
  markdownFiles?: MarkdownFile[];
}

interface Session {
  id: string;
  projectName: string;
  filePath: string;
  messages: ClaudeMessage[];
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  totalTokens: number;
  estimatedCost: number;
}

interface ClaudeMessage {
  type: string;
  uuid: string;
  timestamp: string;
  message?: {
    role: string;
    content: string | ContentItem[];
    usage?: TokenUsage;
  };
  costUSD?: number;
}
```
