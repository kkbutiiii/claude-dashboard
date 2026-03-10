# Claude Dashboard - 开发技能配置

## 项目信息

- **名称**: Claude Dashboard
- **描述**: Claude Code 会话历史管理 Web 应用
- **技术栈**: React + TypeScript + Node.js + Express

## Git 工作流

### 提交规范
- 使用中文或英文提交信息
- 格式: `[类型] 描述` 或 `type: description`
- 常用类型: feat(新功能), fix(修复), docs(文档), style(格式), refactor(重构), test(测试), chore(构建)

### 自动提交指令
当用户说以下指令时：
- "提交到 GitHub"
- "commit"
- "git commit"
- "提交代码"

执行以下步骤：
1. `git status` - 查看修改状态
2. `git diff --stat` - 查看修改概要
3. `git add .` - 添加所有修改（或指定文件）
4. `git commit -m "描述信息"` - 提交
5. `git push` - 推送到 GitHub

### 版本发布
当用户说 "发布新版本" 或 "打 tag" 时：
1. 读取 package.json 获取当前版本
2. 询问新版本号（推荐: 小版本+1）
3. 更新 package.json 版本号
4. `git add package.json`
5. `git commit -m "chore: bump version to vX.X.X"`
6. `git tag -a vX.X.X -m "版本描述"`
7. `git push && git push --tags`
8. 如果配置了 gh CLI: `gh release create vX.X.X --title "vX.X.X" --notes "发布说明"`

## 开发指令

### 启动开发环境
```bash
# 终端 1 - 前端
cd web && npm run dev

# 终端 2 - 后端
cd server && npm run dev
```

### 构建部署
```bash
# 构建前端
cd web && npm run build

# 复制到服务端
cp -r dist/* ../server/public/

# 重启服务
cd ../server && npm run dev
```

### 测试
```bash
cd web
npm run test        # 单元测试
npm run e2e         # E2E 测试
```

## 代码规范

### 文件命名
- 组件: PascalCase (如: `SessionView.tsx`)
- 工具函数: camelCase (如: `useStore.ts`)
- 样式: 与组件同名 (如: `SessionView.css`)

### 导入顺序
1. React/框架导入
2. 第三方库
3. 本地组件
4. 类型定义
5. 样式

### 类型定义
- 优先使用 TypeScript 严格类型
- 避免使用 `any`
- 接口定义使用 `interface`
- 类型别名使用 `type`

## 常用修复

### 类型错误
```bash
cd web
npx tsc --noEmit  # 检查类型错误
```

### 依赖问题
```bash
# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

### 端口占用
```bash
# Windows
npx kill-port 3727 3000 3001 3002 3003

# 或手动查找并结束
netstat -ano | findstr :3727
taskkill /PID <PID> /F
```

## 文档更新

修改以下文件后需要同步更新：
- `README.md` - 项目介绍
- `ROADMAP.md` - 路线图变更
- `dashboard-ref.md` - 调研更新
- `GITHUB_SETUP.md` - Git 配置变更

## 项目结构速查

```
claude-dashboard/
├── web/               # 前端
│   ├── src/
│   │   ├── components/   # 组件
│   │   ├── stores/       # 状态管理
│   │   └── test/         # 测试
│   └── e2e/              # E2E 测试
├── server/            # 后端
│   ├── src/
│   │   ├── routes/       # API 路由
│   │   ├── scanner.ts    # 项目扫描
│   │   └── index.ts      # 入口
│   └── public/           # 静态文件
└── data/              # 数据存储
```

## GitHub 集成

使用 GitHub CLI 快捷操作：
```bash
# 查看仓库状态
gh repo view

# 创建 Issue
gh issue create --title "问题描述" --body "详细内容"

# 创建 PR
gh pr create --title "PR 标题" --body "修改说明"

# 查看工作流
gh run list
```

## 注意事项

1. **不要提交** node_modules 和 dist 目录
2. **不要提交** 包含敏感信息的 .env 文件
3. **及时提交** 代码，避免大量未提交修改
4. **写清楚** 提交信息，方便回溯历史
