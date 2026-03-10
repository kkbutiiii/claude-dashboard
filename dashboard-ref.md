# Claude Code Dashboard 调研参考

本文档整理了 Claude Code 相关的开源项目和工具，作为开发参考。

## 相关开源项目

### 1. claude-code-ui
- **地址**: https://github.com/anthropics/claude-code-ui
- **描述**: Anthropic 官方实验性 UI 项目
- **参考点**: 官方 UI 设计思路

### 2. claude-history-viewer
- **地址**: https://github.com/user/claude-history-viewer
- **描述**: 浏览 Claude Code 会话历史的工具
- **参考点**: 会话解析、消息渲染

### 3. anthropic-claude-history
- **地址**: https://github.com/user/anthropic-claude-history
- **描述**: 导出和分析 Claude 对话历史
- **参考点**: 数据导出、分析功能

### 4. claude-conversation-manager
- **地址**: https://github.com/user/claude-conversation-manager
- **描述**: Claude 对话管理工具
- **参考点**: 会话组织、搜索功能

### 5. claude-code-history
- **地址**: https://github.com/user/claude-code-history
- **描述**: 查看和管理 Claude Code 历史记录
- **参考点**: 文件解析、历史展示

## 技术参考

### Claude Code JSONL 格式

Claude Code 将会话存储在 `~/.claude/projects/` 目录下：

```
~/.claude/projects/
├── project-name/
│   ├── session-id-1.jsonl
│   ├── session-id-2.jsonl
│   └── ...
```

每条消息一行 JSON：

```json
{
  "uuid": "message-uuid",
  "parentUuid": "parent-uuid",
  "sessionId": "session-uuid",
  "timestamp": "2026-03-10T19:27:47.097Z",
  "type": "user|assistant|system|summary|progress|file-history-snapshot",
  "message": {
    "role": "user|assistant",
    "content": "string or ContentItem[]",
    "model": "claude-3-opus-20240229",
    "usage": {
      "input_tokens": 100,
      "output_tokens": 200
    }
  },
  "toolUse": {
    "name": "tool-name",
    "id": "tool-id"
  },
  "costUSD": 0.00123
}
```

### ContentItem 类型

消息内容支持多种类型：

```typescript
type ContentItem =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; name: string; id: string }
  | { type: 'tool_result'; content: string; tool_use_id: string }
  | { type: 'image'; title?: string }
  | { type: 'document'; title?: string; context?: string }
```

### 需要过滤的消息类型

- `file-history-snapshot` - 文件历史快照，非对话消息
- `hook_progress` - 钩子进度信息

## 功能设计参考

### 会话管理
- 项目列表展示（名称、会话数、最后更新时间）
- 会话列表（消息数、token 数、成本、时间）
- 会话详情（消息流、角色标识、时间戳）

### 搜索功能
- 全文搜索消息内容
- 按项目/会话筛选
- 搜索结果高亮

### 书签功能
- 收藏重要消息
- 添加备注说明
- 快速跳转

### 标签系统
- 为会话打标签
- 按标签筛选
- 颜色区分

### 导出功能
- Markdown 格式导出
- 保留对话结构
- 包含元数据

## UI 设计参考

### 布局
- 侧边栏：项目导航、搜索框
- 主内容区：会话列表/详情
- 响应式设计

### 消息展示
- 用户消息：左侧或高亮背景
- 助手消息：正常背景
- Thinking：斜体、缩进显示
- Tool Use：工具名称、图标
- Tool Result：代码块、可折叠

### 交互
- 悬停显示操作按钮
- 点击展开详情
- 快捷键支持

## 性能优化

### 数据处理
- 大文件分块读取
- 消息懒加载
- 虚拟滚动

### 搜索优化
- 客户端索引（FlexSearch）
- 防抖搜索
- 结果缓存

### 实时更新
- WebSocket 推送
- 文件系统监听
- 增量更新

## 安全考虑

- 本地运行，数据不上传
- 敏感信息脱敏
- 访问控制（可选）

## 扩展思路

1. **统计分析** - token 使用、成本分析、时间分布
2. **会话恢复** - 复制 claude --resume 命令
3. **分享功能** - 生成分享链接
4. **多用户** - 团队共享会话
5. **插件系统** - 自定义消息处理器

## 相关文档

- [Claude Code 官方文档](https://docs.anthropic.com/claude-code)
- [FlexSearch 文档](https://github.com/nextapps-de/flexsearch)
- [React Router 文档](https://reactrouter.com/)
