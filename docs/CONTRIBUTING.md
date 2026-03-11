# 贡献指南

感谢您对 Claude Dashboard 的兴趣！本文档将帮助您参与项目开发。

---

## 目录

- [开发环境设置](#开发环境设置)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [开发流程](#开发流程)
- [测试](#测试)
- [文档](#文档)
- [问题反馈](#问题反馈)

---

## 开发环境设置

### 前置要求

- Node.js >= 20.0.0
- npm >= 10.0.0
- Git

### 克隆仓库

```bash
git clone https://github.com/kkbutiiii/claude-dashboard.git
cd claude-dashboard
```

### 安装依赖

```bash
# 根目录
npm install

# 前端
cd web && npm install

# 后端
cd ../server && npm install
```

### 启动开发服务器

```bash
# 终端 1 - 前端
cd web
npm run dev

# 终端 2 - 后端
cd server
npm run dev
```

---

## 代码规范

### 文件命名

| 类型 | 命名规范 | 示例 |
|-----|---------|------|
| 组件 | PascalCase | `ProjectList.tsx`, `SessionView.tsx` |
| 工具函数 | camelCase | `useStore.ts`, `apiClient.ts` |
| 样式文件 | 与组件同名 | `ProjectList.css` |
| 常量 | UPPER_SNAKE_CASE | `API_BASE_URL` |
| 类型定义 | PascalCase | `Project`, `Session`, `Message` |

### 导入顺序

```typescript
// 1. React/框架导入
import React, { useState, useEffect } from 'react';

// 2. 第三方库
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

// 3. 本地组件
import { ProjectCard } from './ProjectCard';
import { SessionList } from './SessionList';

// 4. 类型定义
import type { Project, Session } from '../stores/useStore';

// 5. 样式
import './ProjectView.css';
```

### TypeScript 规范

- **严格类型**: 启用 `strict: true`，避免使用 `any`
- **接口定义**: 使用 `interface` 定义对象结构
- **类型别名**: 使用 `type` 定义联合类型、交叉类型

```typescript
// ✅ Good
interface Project {
  id: string;
  name: string;
  sessions: Session[];
}

type MessageRole = 'user' | 'assistant' | 'system';

// ❌ Bad
const project: any = {};
```

### React 组件规范

```typescript
// 组件定义
interface Props {
  project: Project;
  onSelect?: (id: string) => void;
}

export function ProjectCard({ project, onSelect }: Props) {
  // 状态定义
  const [isExpanded, setIsExpanded] = useState(false);

  // 事件处理
  const handleClick = () => {
    onSelect?.(project.id);
  };

  // 渲染
  return (
    <div className="project-card" onClick={handleClick}>
      <h3>{project.name}</h3>
    </div>
  );
}
```

### 注释规范

```typescript
/**
 * 获取项目详情
 * @param projectName - 项目名称
 * @returns 项目对象，如果不存在返回 null
 */
async function getProject(projectName: string): Promise<Project | null> {
  // 实现...
}

// FIXME: 临时解决方案，后续需要优化
const tempSolution = () => {};

// TODO: 添加错误处理
function handleError() {}
```

---

## 提交规范

### 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型 (type)

| 类型 | 说明 |
|-----|------|
| `feat` | 新功能 |
| `fix` | 修复 Bug |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能的修改）|
| `refactor` | 重构（既不是新功能也不是修复）|
| `perf` | 性能优化 |
| `test` | 添加测试 |
| `chore` | 构建过程或辅助工具的变动 |

### 示例

```bash
# 新功能
feat: add session search drawer

# 修复
fix: resolve memory leak in scanner

# 文档
docs: update API documentation

# 重构
refactor(scanner): optimize file reading

# 带范围的提交
feat(search): add date range filter
```

---

## 开发流程

### 1. 创建分支

```bash
# 从 main 分支创建
git checkout main
git pull origin main

# 创建功能分支
git checkout -b feat/your-feature-name
```

分支命名规范:

- `feat/` - 新功能
- `fix/` - Bug 修复
- `docs/` - 文档
- `refactor/` - 重构

### 2. 开发

- 编写代码
- 添加/更新测试
- 确保测试通过

### 3. 提交

```bash
# 添加修改
git add .

# 提交
git commit -m "feat: add your feature"

# 推送
git push origin feat/your-feature-name
```

### 4. 创建 Pull Request

1. 在 GitHub 上创建 PR
2. 填写 PR 描述：
   - 修改内容
   - 测试方法
   - 截图（如适用）
3. 请求代码审查

### 5. 代码审查

- 回应审查意见
- 修改后重新推送
- 审查通过后合并

---

## 测试

### 单元测试

```bash
cd web

# 运行测试
npm run test

# 运行并生成覆盖率
npm run test:coverage

# 运行特定文件
npm run test -- MessageRenderer.test.tsx
```

### E2E 测试

```bash
cd web

# 安装 Playwright（首次）
npx playwright install chromium

# 运行 E2E 测试
npm run e2e

# 调试模式
npm run e2e:ui
```

### 测试规范

```typescript
// 组件测试示例
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectCard } from './ProjectCard';

describe('ProjectCard', () => {
  it('renders project name', () => {
    const project = { id: '1', name: 'Test Project', sessions: [] };
    render(<ProjectCard project={project} />);
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    const project = { id: '1', name: 'Test', sessions: [] };
    render(<ProjectCard project={project} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Test'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
```

---

## 文档

### 需要更新的文档

修改以下文件时，请同步更新相关文档：

| 修改内容 | 更新文档 |
|---------|---------|
| API 接口 | `docs/API.md` |
| 功能特性 | `README.md` |
| 开发流程 | `CLAUDE.md` |
| 路线图 | `ROADMAP.md` |

### 文档规范

- 使用 Markdown 格式
- 添加目录便于导航
- 包含代码示例
- 使用中文或英文（保持一致）

---

## 问题反馈

### 报告 Bug

创建 Issue 时请包含：

1. **环境信息**
   - 操作系统
   - Node.js 版本
   - 浏览器版本

2. **复现步骤**
   - 详细步骤
   - 预期结果
   - 实际结果

3. **错误信息**
   - 控制台报错
   - 网络请求失败信息

### 功能建议

1. 描述功能用途
2. 说明使用场景
3. 如有参考，提供示例

---

## 代码审查检查清单

提交 PR 前自检：

- [ ] 代码符合规范
- [ ] 测试通过
- [ ] 新功能有测试覆盖
- [ ] 文档已更新
- [ ] 无 console.log 调试代码
- [ ] 无未使用的导入
- [ ] 提交信息符合规范

---

## 联系方式

- GitHub Issues: [新建 Issue](https://github.com/kkbutiiii/claude-dashboard/issues)
- 讨论区: [Discussions](https://github.com/kkbutiiii/claude-dashboard/discussions)

感谢贡献！🙏
