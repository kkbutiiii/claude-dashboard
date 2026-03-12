# Claude Dashboard

<p align="center">
  <img src="./web/public/logo.svg" alt="Claude Dashboard Logo" width="120">
</p>

<p align="center">
  <strong>Claude Code 会话历史管理与浏览工具</strong>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#使用指南">使用指南</a> •
  <a href="#api文档">API文档</a> •
  <a href="#开发指南">开发指南</a> •
  <a href="#roadmmap">路线图</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-20-green?logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License">
</p>

---

## 📸 功能预览

| 项目列表 | 会话详情 | 消息搜索 |
|---------|---------|---------|
| ![项目列表](./docs/screenshots/projects.png) | ![会话详情](./docs/screenshots/session.png) | ![消息搜索](./docs/screenshots/search.png) |

> 💡 **提示**: 截图占位符，实际使用时替换为真实截图

---

## ✨ 功能特性

### 🗂️ 项目管理
- **智能项目识别** - 自动从 Claude Code 存储路径提取项目信息
- **彩色项目头像** - 根据项目名称自动生成独特头像
- **项目描述** - 自动从 package.json/README.md 获取或手动编辑
- **一键打开** - 快速打开项目所在文件夹
- **Git 集成** - 显示分支、提交历史和变更统计

### 💬 会话浏览
- **消息展示** - 支持 Markdown、代码高亮、表格渲染
- **Thinking 折叠** - 默认折叠 Claude 的思考过程，保持界面整洁
- **Tool Result 管理** - 长内容自动折叠，可展开查看
- **代码复制** - 一键复制代码块内容
- **行号显示** - 代码超过5行时显示行号

### 🔍 消息搜索
- **全文搜索** - 搜索所有会话中的消息内容
- **服务端搜索** - 高性能服务端处理，避免前端卡顿
- **搜索高亮** - 结果中高亮匹配关键词
- **高级筛选** - 按项目、角色、日期范围筛选
- **右侧抽屉** - 搜索结果在抽屉中预览，保持浏览连贯性

### 🔖 书签与标签
- **消息收藏** - 收藏重要消息并添加备注
- **标签系统** - 为会话添加标签分类管理
- **快速跳转** - 从书签列表快速定位到原始消息

### 📄 文档浏览器
- **自动发现** - 扫描项目中的 Markdown 文件
- **智能过滤** - 自动排除 LICENSE.md、AUTHORS.md 等非项目文档
- **宽屏阅读** - 加宽文档面板，优化阅读体验
- **右侧预览** - 文档在抽屉中预览，不离开当前页面

### ⚡ 性能优化

#### 服务端优化
- **API 响应压缩** - gzip 压缩，减少 60-80% 传输体积
- **SQLite 本地索引** - 使用 SQLite + FTS5 全文搜索，搜索从秒级降至毫秒级
- **增量扫描** - 基于文件修改时间，只扫描变更的文件，O(n) → O(Δn)
- **LRU 搜索缓存** - 缓存 100 个热门搜索结果，TTL 5 分钟
- **服务器端缓存** - 30秒缓存机制，避免重复扫描文件系统
- **单例扫描器** - 复用扫描器实例，防止重复创建
- **按需加载** - 查询单个项目时只扫描目标项目

#### 前端优化
- **虚拟列表** - react-window 实现，支持 >10,000 条记录流畅渲染
- **状态管理拆分** - 细粒度 Zustand store，减少重渲染
- **组件级缓存** - 使用 React.memo 避免不必要重渲染
- **前端防抖** - 30秒内不重复请求项目列表
- **并发保护** - 防止同时发起多个扫描请求

---

## 🚀 快速开始

### 环境要求

- Node.js >= 20.0.0
- npm >= 10.0.0
- Claude Code 已安装并使用过（生成会话数据）

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/kkbutiiii/claude-dashboard.git
cd claude-dashboard

# 安装根目录依赖
npm install

# 安装前端依赖
cd web && npm install

# 安装后端依赖
cd ../server && npm install
```

### 配置环境变量（可选）

创建 `server/.env` 文件：

```bash
# Claude Code 项目路径（默认: ~/.claude/projects）
CLAUDE_PROJECTS_PATH=C:\Users\YourName\.claude\projects

# 服务端口号（默认: 3727）
PORT=3727
```

### 启动开发服务器

**终端 1 - 启动前端:**
```bash
cd web
npm run dev
```

**终端 2 - 启动后端:**
```bash
cd server
npm run dev
```

访问 http://localhost:3000 即可使用。

---

## 📖 使用指南

### 首次使用

1. 确保 Claude Code 已使用过，在 `~/.claude/projects/` 目录下有会话数据
2. 启动前后端服务
3. 浏览器访问 http://localhost:3000
4. 左侧边栏显示所有项目列表

### 浏览会话

1. 点击项目卡片进入项目详情
2. 查看会话列表，显示消息数量和时间
3. 点击会话名称在右侧抽屉中查看详情
4. 点击"在新页面打开"查看完整会话

### 搜索消息

1. 在顶部搜索框输入关键词
2. 使用高级筛选：项目名称、消息角色、日期范围
3. 点击搜索结果在抽屉中预览
4. 点击"打开会话"查看完整上下文

### 使用书签

1. 在会话详情中点击消息旁的书签图标
2. 可选添加备注说明
3. 在左侧边栏点击"书签"查看所有收藏
4. 点击书签跳转到原始消息

### 管理标签

1. 在会话详情中点击"添加标签"
2. 选择已有标签或创建新标签
3. 在左侧边栏点击标签筛选会话

### 查看项目文档

1. 进入项目详情页
2. 点击"文档"标签
3. 左侧列表显示项目中的 Markdown 文件
4. 点击文件在右侧预览

---

## 🔌 API 文档

详见 [API.md](./docs/API.md) 获取完整的接口文档。

### 主要接口速查

| 接口 | 方法 | 描述 |
|-----|------|------|
| `/api/scanner/projects` | GET | 获取所有项目列表 |
| `/api/scanner/projects/:name` | GET | 获取指定项目的会话 |
| `/api/scanner/projects/:name/git-history` | GET | 获取项目 Git 提交历史 |
| `/api/sessions/:project/:session` | GET | 获取会话详情 |
| `/api/sessions/:project/:session/export/markdown` | GET | 导出 Markdown |
| `/api/bookmarks` | GET/POST | 获取/添加书签 |
| `/api/tags` | GET/POST | 获取/创建标签 |
| `/api/search` | POST | 消息搜索 |

---

## 🛠️ 开发指南

### 技术栈

**前端:**
- React 19 + TypeScript
- Vite 5.x
- Tailwind CSS
- Zustand (状态管理)
- React Markdown + Prism.js
- Lucide React (图标)
- react-window (虚拟列表)

**后端:**
- Node.js 20 + Express
- TypeScript
- WebSocket (ws)
- chokidar (文件监控)
- better-sqlite3 (SQLite 数据库)
- compression (响应压缩)
- lru-cache (搜索缓存)

### 项目结构

```
claude-dashboard/
├── web/                       # 前端应用
│   ├── src/
│   │   ├── components/        # React 组件
│   │   │   ├── ProjectList.tsx
│   │   │   ├── SessionView.tsx
│   │   │   ├── MessageRenderer.tsx
│   │   │   ├── VirtualSessionList.tsx  # 虚拟列表
│   │   │   └── ...
│   │   ├── stores/            # Zustand 状态管理
│   │   │   ├── useStore.ts    # 旧版 store（保持兼容）
│   │   │   ├── projectStore.ts    # 项目状态
│   │   │   ├── sessionStore.ts    # 会话状态
│   │   │   └── uiStore.ts         # UI 状态
│   │   └── App.tsx
│   ├── e2e/                   # Playwright E2E 测试
│   └── dist/                  # 构建输出
├── server/                    # 后端服务
│   ├── src/
│   │   ├── routes/            # API 路由
│   │   ├── db/                # SQLite 数据库模块
│   │   │   └── index.ts       # 数据库操作
│   │   ├── scanner.ts         # 项目扫描器
│   │   ├── watcher.ts         # 文件监控
│   │   └── index.ts           # 服务入口
│   └── public/                # 前端静态文件
├── data/                      # 数据存储（SQLite）
├── docs/                      # 文档
└── docker-compose.yml
```

### 开发命令

```bash
# 前端开发
cd web
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run test             # 运行单元测试
npm run test:coverage    # 测试覆盖率
npm run e2e              # 运行 E2E 测试

# 后端开发
cd server
npm run dev              # 启动开发服务器（热重载）
npm run build            # 编译 TypeScript
npm start                # 运行生产版本
```

### 代码规范

- **文件命名**: 组件使用 PascalCase，工具函数使用 camelCase
- **导入顺序**: React → 第三方库 → 本地组件 → 类型 → 样式
- **类型定义**: 优先使用 TypeScript 严格类型，避免 `any`
- **提交规范**: 使用 `feat:`, `fix:`, `docs:`, `refactor:` 等前缀

详见 [CLAUDE.md](./CLAUDE.md) 开发配置文档。

---

## 🐳 Docker 部署

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

访问 http://localhost:3727

---

## ❓ 常见问题

### Q: 项目列表为空？

确保 `CLAUDE_PROJECTS_PATH` 指向正确的 Claude Code 项目目录：
- Windows: `C:\Users\用户名\.claude\projects`
- macOS/Linux: `~/.claude/projects`

### Q: 搜索功能很慢？

首次搜索会建立索引，后续搜索会使用缓存。如果仍然很慢：
1. 检查是否有大量会话文件
2. 尝试限制搜索范围（按项目筛选）
3. 查看服务端是否有错误日志

### Q: 如何备份书签和标签？

书签和标签存储在 `data/` 目录：
```bash
# 备份
cp -r data data.backup

# 恢复
cp -r data.backup/* data/
```

### Q: Git 信息不显示？

确保：
1. 项目是 Git 仓库
2. 服务端有权限访问 `.git` 目录
3. 在项目详情页刷新

---

## 🗺️ Roadmap

查看 [ROADMAP.md](./ROADMAP.md) 了解：

- ✅ 已实现：会话浏览、搜索、书签、标签、Git 集成
- ✅ 性能优化：SQLite 索引、增量扫描、虚拟列表、API 压缩
- 🚧 近期：React Query 集成、组件懒加载、深色模式
- 📅 中期：使用统计、会话摘要、智能标签
- 🔮 长期：语义搜索、AI 问答、VSCode 插件

---

## 🤝 贡献指南

欢迎提交 Issue 和 PR！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

详见 [CONTRIBUTING.md](./docs/CONTRIBUTING.md)

---

## 📄 许可证

MIT License © 2026

---

## 🙏 致谢

- [Claude Code](https://claude.ai/code) - 强大的 AI 编程助手
- [React](https://react.dev) - 用户界面库
- [Tailwind CSS](https://tailwindcss.com) - 实用优先的 CSS 框架
- [Vite](https://vitejs.dev) - 下一代前端构建工具
