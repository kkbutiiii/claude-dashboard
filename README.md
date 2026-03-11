# Claude Dashboard

一个用于管理和浏览 Claude Code 会话历史的 Web 应用。

## 功能特性

- **项目管理** - 浏览所有 Claude Code 项目，查看会话数量
- **会话浏览** - 查看每个项目的会话列表，支持会话详情查看
- **消息搜索** - 全文搜索所有会话中的消息内容
- **书签管理** - 收藏重要消息并添加备注
- **标签系统** - 为会话添加标签便于分类管理
- **导出功能** - 支持将会话导出为 Markdown 格式
- **实时更新** - 通过 WebSocket 监听文件变化自动刷新

### 性能优化

- **服务器端缓存** - 30秒缓存机制，避免重复扫描文件系统
- **单例扫描器** - 复用扫描器实例，防止重复创建
- **按需加载** - 查询单个项目时只扫描目标项目
- **前端防抖** - 30秒内不重复请求项目列表
- **并发保护** - 防止同时发起多个扫描请求

### 项目展示

- **智能名称显示** - 自动从存储路径提取代码文件夹名称作为项目名
- **项目头像** - 根据项目名称自动生成彩色头像
- **项目描述** - 支持手动编辑或从 package.json/README.md 自动获取
- **快速打开** - 一键打开项目所在文件夹
- **Git 集成** - 显示项目 Git 分支、提交历史和变更统计

### 文档浏览器

- **Markdown 文档** - 自动发现和浏览项目中的 Markdown 文件
- **智能过滤** - 自动过滤 LICENSE.md、AUTHORS.md 等非项目文档
- **宽屏阅读** - 加宽文档面板，优化阅读体验

> 📋 **查看 [ROADMAP.md](./ROADMAP.md) 了解未来开发计划**

## 技术栈

### 前端
- React 19 + TypeScript
- Vite 构建工具
- Tailwind CSS 样式
- Zustand 状态管理
- FlexSearch 客户端搜索
- Lucide React 图标

### 后端
- Node.js + Express
- TypeScript
- WebSocket (ws)
- 文件系统监控 (chokidar)
- 内存缓存 (30秒 TTL)
- 单例模式优化

## 项目结构

```
claude-dashboard/
├── web/                    # 前端应用
│   ├── src/
│   │   ├── components/     # React 组件
│   │   ├── stores/         # Zustand 状态管理
│   │   ├── test/           # 测试工具
│   │   └── App.tsx         # 主应用组件
│   ├── e2e/                # Playwright E2E 测试
│   └── dist/               # 构建输出
├── server/                 # 后端服务
│   ├── src/
│   │   ├── routes/         # API 路由
│   │   ├── scanner.ts      # 项目扫描器
│   │   ├── watcher.ts      # 文件监控
│   │   └── index.ts        # 服务入口
│   └── public/             # 前端静态文件
├── data/                   # 数据存储（书签、标签等）
└── docker-compose.yml      # Docker 部署配置
```

## 快速开始

### 开发环境

```bash
# 安装依赖
npm install
cd web && npm install
cd ../server && npm install

# 启动开发服务器（前端）
cd web
npm run dev

# 启动后端服务（新终端）
cd server
npm run dev
```

### 生产部署

```bash
# 构建前端
cd web
npm run build

# 复制到服务端
cp -r dist/* ../server/public/

# 启动服务
cd ../server
npm run dev
```

### Docker 部署

```bash
docker-compose up -d
```

访问 http://localhost:3727

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `CLAUDE_PROJECTS_PATH` | Claude Code 项目路径 | `~/.claude/projects` |
| `PORT` | 服务端口号 | `3727` |

## API 接口

### 项目扫描
- `GET /api/scanner/projects` - 获取所有项目列表
- `GET /api/scanner/projects/:name` - 获取指定项目的会话

### 会话管理
- `GET /api/sessions/:project/:session` - 获取会话详情
- `GET /api/sessions/:project/:session/export/markdown` - 导出 Markdown

### 书签
- `GET /api/bookmarks` - 获取所有书签
- `POST /api/bookmarks` - 添加书签
- `DELETE /api/bookmarks/:id` - 删除书签

### 标签
- `GET /api/tags` - 获取所有标签
- `POST /api/tags` - 创建标签
- `DELETE /api/tags/:id` - 删除标签

## 测试

### 单元测试
```bash
cd web
npm run test        # 运行测试
npm run test:coverage  # 覆盖率报告
```

### E2E 测试
```bash
cd web
npx playwright install chromium
npm run e2e         # 运行 E2E 测试
npm run e2e:ui      # 调试模式
```

## 开发注意事项

1. **URL 编码** - 项目名称可能包含特殊字符，使用双编码处理
2. **消息类型过滤** - 只处理 `user`, `assistant`, `system`, `summary`, `progress` 类型消息
3. **日期处理** - 会话时间戳可能无效，需进行校验
4. **搜索容错** - FlexSearch 初始化可能失败，需要错误处理

## 数据存储

Claude Code 会话数据存储在 `~/.claude/projects/` 目录下：
- 每个项目一个文件夹
- 每个会话一个 `.jsonl` 文件
- 消息按行存储为 JSON 格式

应用数据（书签、标签）存储在 `data/` 目录：
- `bookmarks.json` - 书签数据
- `tags.json` - 标签数据
- `session-tags.json` - 会话标签关联

## 开发计划

查看 [ROADMAP.md](./ROADMAP.md) 了解：
- 近期功能优化计划
- 中期功能扩展规划
- 长期发展方向
- 技术债务清单

欢迎提交 Issue 和 PR 参与项目开发！

## 相关文档

- [README.md](./README.md) - 项目介绍和使用说明
- [ROADMAP.md](./ROADMAP.md) - 开发路线图和升级计划
- [dashboard-ref.md](./dashboard-ref.md) - 调研参考资料
- [web/TESTING.md](./web/TESTING.md) - 测试指南

## 开源协议

MIT License
