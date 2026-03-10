# GitHub 配置指南

本文档指导如何将 Claude Dashboard 项目推送到 GitHub。

## 方法一：使用 GitHub CLI（推荐）

### 1. 安装 GitHub CLI

Windows（通过 winget）：
```powershell
winget install --id GitHub.cli
```

macOS：
```bash
brew install gh
```

Linux：
```bash
# Ubuntu/Debian
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

### 2. 登录 GitHub

```bash
gh auth login
```

按照提示选择：
- What account do you want to log into? `GitHub.com`
- What is your preferred protocol for Git operations? `HTTPS`
- Authenticate Git with your GitHub credentials? `Yes`
- How would you like to authenticate? `Login with a web browser`

### 3. 创建仓库并推送

```bash
# 进入项目目录
cd "C:\Users\11639\Documents\trae_projects\20260310-localdashboard\claude-dashboard"

# 配置 Git（替换为你的信息）
git config user.name "你的GitHub用户名"
git config user.email "你的GitHub邮箱"

# 添加文件
git add .

# 提交
git commit -m "Initial commit: Claude Dashboard v1.0"

# 创建 GitHub 仓库并推送
git branch -M main
gh repo create claude-dashboard --public --source=. --push
```

## 方法二：使用 SSH 密钥

### 1. 生成 SSH 密钥

```bash
# 生成新密钥（替换为你的邮箱）
ssh-keygen -t ed25519 -C "your.email@example.com"

# 启动 SSH 代理
# Windows (Git Bash):
eval "$(ssh-agent -s)"
# macOS:
eval "$(ssh-agent -s)"
# Linux:
eval "$(ssh-agent -s)"

# 添加密钥
ssh-add ~/.ssh/id_ed25519
```

### 2. 添加公钥到 GitHub

```bash
# 复制公钥
cat ~/.ssh/id_ed25519.pub
```

然后：
1. 打开 https://github.com/settings/keys
2. 点击 "New SSH key"
3. 粘贴公钥内容
4. 保存

### 3. 创建仓库并推送

```bash
# 配置 Git
git config user.name "你的GitHub用户名"
git config user.email "你的GitHub邮箱"

# 添加文件
git add .
git commit -m "Initial commit: Claude Dashboard v1.0"

# 创建 GitHub 仓库（在网页上创建，然后）
git remote add origin git@github.com:你的用户名/claude-dashboard.git
git branch -M main
git push -u origin main
```

## 方法三：使用 HTTPS + Personal Access Token

### 1. 创建 Personal Access Token

1. 打开 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 勾选权限：`repo`, `workflow`, `write:packages`
4. 生成并复制 Token

### 2. 配置 Git 并推送

```bash
# 配置 Git
git config user.name "你的GitHub用户名"
git config user.email "你的GitHub邮箱"

# 添加文件
git add .
git commit -m "Initial commit: Claude Dashboard v1.0"

# 添加远程仓库（使用你的用户名）
git remote add origin https://github.com/你的用户名/claude-dashboard.git
git branch -M main

# 推送（会提示输入用户名和 Token）
git push -u origin main
```

## 后续更新流程

```bash
# 查看修改状态
git status

# 添加所有修改
git add .

# 提交
git commit -m "描述你的修改"

# 推送到 GitHub
git push
```

## 常用命令

```bash
# 查看提交历史
git log --oneline

# 创建新分支
git checkout -b feature/new-feature

# 切换分支
git checkout main

# 合并分支
git merge feature/new-feature

# 拉取最新代码
git pull

# 查看远程仓库
git remote -v
```

## 常见问题

### 1. 提示 "Permission denied"

- 检查 SSH 密钥是否正确添加到 GitHub
- 或使用 HTTPS 方式

### 2. 提示 "Repository not found"

- 检查仓库 URL 是否正确
- 检查是否有权限访问

### 3. 提示 "Please tell me who you are"

```bash
git config user.name "你的名字"
git config user.email "你的邮箱"
```

## 技能配置

将以下内容添加到 Claude Code 的 `CLAUDE.md` 文件中：

```markdown
## Git 工作流

### 提交规范
- 使用英文提交信息
- 格式：`type: description`
- Types: feat, fix, docs, style, refactor, test, chore

### 自动提交
当用户要求 "提交到 GitHub" 或 "commit" 时：
1. 运行 `git status` 查看修改
2. 运行 `git add .` 添加所有修改
3. 运行 `git commit -m "描述信息"` 提交
4. 运行 `git push` 推送到 GitHub

### 创建版本
当用户要求 "发布新版本" 时：
1. 更新 package.json 版本号
2. 提交修改
3. 创建 git tag: `git tag -a v1.x.x -m "版本描述"`
4. 推送标签: `git push --tags`
5. 创建 GitHub Release（如果配置了 gh CLI）
```
