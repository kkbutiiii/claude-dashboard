import fs from 'fs/promises';
import path from 'path';
import type { Project, Session, ClaudeMessage } from './types.js';

export class ProjectScanner {
  private basePath: string;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30秒缓存
  private scanningPromise: Promise<Project[]> | null = null;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  // 清除缓存
  invalidateCache(): void {
    this.cache.clear();
    this.scanningPromise = null;
  }

  // 清除特定项目的缓存
  invalidateProjectCache(projectName: string): void {
    this.cache.delete(`project:${projectName}`);
    this.cache.delete('projects');
  }

  async scanAllProjects(): Promise<Project[]> {
    // 检查缓存
    const cached = this.cache.get('projects') as { data: Project[]; timestamp: number } | undefined;
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // 防止并发扫描
    if (this.scanningPromise) {
      return this.scanningPromise;
    }

    this.scanningPromise = this.performScan();
    try {
      const projects = await this.scanningPromise;
      // 更新缓存
      this.cache.set('projects', { data: projects, timestamp: Date.now() });
      return projects;
    } finally {
      this.scanningPromise = null;
    }
  }

  private async performScan(): Promise<Project[]> {
    const projects: Project[] = [];

    try {
      const entries = await fs.readdir(this.basePath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const project = await this.scanProject(entry.name);
          if (project) {
            projects.push(project);
          }
        }
      }
    } catch (error) {
      console.error('Error scanning projects:', error);
    }

    return projects.sort((a, b) =>
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );
  }

  // 扫描单个项目（带缓存）
  async scanSingleProject(projectName: string): Promise<Project | null> {
    // 检查缓存
    const cacheKey = `project:${projectName}`;
    const cached = this.cache.get(cacheKey) as { data: Project | null; timestamp: number } | undefined;
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const project = await this.scanProject(projectName);
    this.cache.set(cacheKey, { data: project, timestamp: Date.now() });
    return project;
  }

  private async scanProject(projectName: string): Promise<Project | null> {
    const projectPath = path.join(this.basePath, projectName);

    try {
      const sessions: Session[] = [];
      const cwdPaths: string[] = [];

      // Check if project directory exists
      try {
        await fs.access(projectPath);
      } catch {
        return null;
      }

      const entries = await fs.readdir(projectPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.jsonl')) {
          const sessionId = entry.name.replace('.jsonl', '');
          const session = await this.readSession(
            projectName,
            projectPath,
            entry.name,
            sessionId,
            cwdPaths
          );
          if (session) {
            sessions.push(session);
          }
        }
      }

      if (sessions.length === 0) {
        return null;
      }

      sessions.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      // Determine source path from most common cwd
      const sourcePath = this.getMostCommonPath(cwdPaths);

      // Scan for markdown files in source path (actual project directory)
      const markdownFiles = sourcePath
        ? await this.scanMarkdownFiles(sourcePath)
        : [];

      // Read or create project description (from source path if available)
      const description = sourcePath
        ? await this.getProjectDescription(sourcePath)
        : await this.getProjectDescription(projectPath);

      // Get display name (decoded from folder name or custom)
      const displayName = await this.getProjectDisplayName(projectName, projectPath);

      // Get avatar (from source path if available)
      const avatar = sourcePath
        ? await this.getProjectAvatar(sourcePath)
        : await this.getProjectAvatar(projectPath);

      return {
        name: projectName,
        displayName,
        path: projectPath,
        sourcePath,
        sessions,
        sessionCount: sessions.length,
        lastUpdated: sessions[0]?.updatedAt || new Date().toISOString(),
        markdownFiles,
        description,
        avatar,
      };
    } catch (error) {
      console.error(`Error scanning project ${projectName}:`, error);
      return null;
    }
  }

  // Get the most common path from an array of paths
  private getMostCommonPath(paths: string[]): string | undefined {
    if (paths.length === 0) return undefined;

    const counts = new Map<string, number>();
    for (const p of paths) {
      counts.set(p, (counts.get(p) || 0) + 1);
    }

    let mostCommon = paths[0];
    let maxCount = 0;
    for (const [p, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = p;
      }
    }

    return mostCommon;
  }

  private async readSession(
    projectName: string,
    sessionsPath: string,
    fileName: string,
    sessionId: string,
    cwdPaths?: string[]
  ): Promise<Session | null> {
    const filePath = path.join(sessionsPath, fileName);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());

      const messages: ClaudeMessage[] = [];
      let totalTokens = 0;
      let estimatedCost = 0;

      for (const line of lines) {
        try {
          const rawMessage = JSON.parse(line);

          // Extract cwd from raw message (before filtering)
          if (cwdPaths && rawMessage.cwd && typeof rawMessage.cwd === 'string') {
            cwdPaths.push(rawMessage.cwd);
          }

          const message: ClaudeMessage = rawMessage;

          // Skip non-conversational messages (file-history-snapshot, etc.)
          if (!['user', 'assistant', 'system', 'summary', 'progress'].includes(message.type)) {
            continue;
          }

          messages.push(message);

          // Calculate tokens and cost
          if (message.message?.usage) {
            const inputTokens = message.message.usage.input_tokens || 0;
            const outputTokens = message.message.usage.output_tokens || 0;
            totalTokens += inputTokens + outputTokens;
          }

          if (message.costUSD) {
            estimatedCost += message.costUSD;
          }
        } catch (e) {
          console.warn(`Failed to parse message in ${filePath}:`, e);
        }
      }

      if (messages.length === 0) {
        return null;
      }

      const timestamps = messages
        .map(m => m.timestamp ? new Date(m.timestamp).getTime() : null)
        .filter((t): t is number => t !== null && !isNaN(t));

      if (timestamps.length === 0) {
        return null;
      }

      const createdAt = new Date(Math.min(...timestamps)).toISOString();
      const updatedAt = new Date(Math.max(...timestamps)).toISOString();

      return {
        id: sessionId,
        projectName,
        filePath,
        messages,
        messageCount: messages.length,
        createdAt,
        updatedAt,
        totalTokens,
        estimatedCost,
      };
    } catch (error) {
      console.error(`Error reading session ${sessionId}:`, error);
      return null;
    }
  }

  async getSession(projectName: string, sessionId: string): Promise<Session | null> {
    const projectPath = path.join(this.basePath, projectName);
    const fileName = `${sessionId}.jsonl`;

    return this.readSession(projectName, projectPath, fileName, sessionId, []);
  }

  // Scan for markdown files in project directory
  private async scanMarkdownFiles(projectPath: string): Promise<Array<{ name: string; path: string; relativePath: string }>> {
    const markdownFiles: Array<{ name: string; path: string; relativePath: string }> = [];

    try {
      await this.scanDirectoryForMarkdown(projectPath, projectPath, markdownFiles);
    } catch (error) {
      console.warn(`Error scanning markdown files in ${projectPath}:`, error);
    }

    return markdownFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  private async scanDirectoryForMarkdown(
    basePath: string,
    currentPath: string,
    results: Array<{ name: string; path: string; relativePath: string }>
  ): Promise<void> {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);

        // Skip node_modules, .git, and sessions folder
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.claude') {
          continue;
        }

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          await this.scanDirectoryForMarkdown(basePath, fullPath, results);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          results.push({
            name: entry.name,
            path: fullPath,
            relativePath,
          });
        }
      }
    } catch (error) {
      // Ignore errors for individual directories
    }
  }

  // Read markdown file content
  async readMarkdownFile(projectName: string, relativePath: string, basePath?: string): Promise<string | null> {
    // Use provided basePath (sourcePath) or fall back to project sessions path
    const projectPath = basePath || path.join(this.basePath, projectName);
    const filePath = path.join(projectPath, relativePath);

    // Security check: make sure the file is within the project directory
    const resolvedPath = path.resolve(filePath);
    const resolvedProjectPath = path.resolve(projectPath);
    if (!resolvedPath.startsWith(resolvedProjectPath)) {
      return null;
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error(`Error reading markdown file ${filePath}:`, error);
      return null;
    }
  }

  // Get project description
  private async getProjectDescription(projectPath: string): Promise<string> {
    const descriptionPath = path.join(projectPath, '.claude-dashboard', 'description.txt');

    try {
      const content = await fs.readFile(descriptionPath, 'utf-8');
      return content.trim();
    } catch {
      // Try to get from package.json if exists
      try {
        const packageJsonPath = path.join(projectPath, 'package.json');
        const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageContent);
        if (packageJson.description) {
          return packageJson.description;
        }
      } catch {
        // Ignore
      }

      // Try to get first line from README.md
      try {
        const readmePath = path.join(projectPath, 'README.md');
        const readmeContent = await fs.readFile(readmePath, 'utf-8');
        const firstLine = readmeContent.split('\n')[0].replace(/^#+\s*/, '').trim();
        if (firstLine) {
          return firstLine;
        }
      } catch {
        // Ignore
      }

      return '';
    }
  }

  // Save project description
  async saveProjectDescription(projectName: string, description: string): Promise<boolean> {
    const projectPath = path.join(this.basePath, projectName);
    const descriptionDir = path.join(projectPath, '.claude-dashboard');
    const descriptionPath = path.join(descriptionDir, 'description.txt');

    try {
      // Ensure directory exists
      await fs.mkdir(descriptionDir, { recursive: true });
      await fs.writeFile(descriptionPath, description, 'utf-8');
      return true;
    } catch (error) {
      console.error(`Error saving description for ${projectName}:`, error);
      return false;
    }
  }

  // Decode project name from path-like format to display name
  private decodeProjectName(name: string): string {
    // Handle Windows path encoding like "C--Users-User-Documents-project"
    // Decode to last folder name
    if (name.includes('--')) {
      const parts = name.split('--');
      return parts[parts.length - 1];
    }
    // Handle simple dash replacement
    return name;
  }

  // Get project display name
  private async getProjectDisplayName(projectName: string, projectPath: string): Promise<string> {
    const displayNamePath = path.join(projectPath, '.claude-dashboard', 'display-name.txt');

    try {
      const content = await fs.readFile(displayNamePath, 'utf-8');
      return content.trim();
    } catch {
      // Return decoded folder name
      return this.decodeProjectName(projectName);
    }
  }

  // Save project display name
  async saveProjectDisplayName(projectName: string, displayName: string): Promise<boolean> {
    const projectPath = path.join(this.basePath, projectName);
    const displayNameDir = path.join(projectPath, '.claude-dashboard');
    const displayNamePath = path.join(displayNameDir, 'display-name.txt');

    try {
      await fs.mkdir(displayNameDir, { recursive: true });
      await fs.writeFile(displayNamePath, displayName, 'utf-8');
      return true;
    } catch (error) {
      console.error(`Error saving display name for ${projectName}:`, error);
      return false;
    }
  }

  // Get project avatar
  private async getProjectAvatar(projectPath: string): Promise<string | undefined> {
    const avatarPath = path.join(projectPath, '.claude-dashboard', 'avatar.png');

    try {
      const content = await fs.readFile(avatarPath);
      return `data:image/png;base64,${content.toString('base64')}`;
    } catch {
      return undefined;
    }
  }

  // Save project avatar
  async saveProjectAvatar(projectName: string, avatarBase64: string): Promise<boolean> {
    const projectPath = path.join(this.basePath, projectName);
    const avatarDir = path.join(projectPath, '.claude-dashboard');
    const avatarPath = path.join(avatarDir, 'avatar.png');

    try {
      await fs.mkdir(avatarDir, { recursive: true });
      // Remove data:image/png;base64, prefix if present
      const base64Data = avatarBase64.replace(/^data:image\/\w+;base64,/, '');
      await fs.writeFile(avatarPath, Buffer.from(base64Data, 'base64'));
      return true;
    } catch (error) {
      console.error(`Error saving avatar for ${projectName}:`, error);
      return false;
    }
  }

  // Search messages across all projects - optimized for performance
  async searchMessages(
    query: string,
    options: {
      project?: string;
      role?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
    } = {}
  ): Promise<Array<{
    session: Session;
    matchedMessages: ClaudeMessage[];
    matchCount: number;
  }>> {
    const { project: projectFilter, role: roleFilter, dateFrom, dateTo, limit = 50 } = options;
    const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);

    if (searchTerms.length === 0) {
      return [];
    }

    const results: Map<string, { session: Session; matchedMessages: ClaudeMessage[]; matchCount: number }> = new Map();

    // Get list of projects to search
    let projectNames: string[] = [];
    try {
      const entries = await fs.readdir(this.basePath, { withFileTypes: true });
      projectNames = entries
        .filter(e => e.isDirectory())
        .map(e => e.name);
    } catch (error) {
      console.error('Error reading projects directory:', error);
      return [];
    }

    // Filter by project name if specified
    if (projectFilter) {
      projectNames = projectNames.filter(p => p === projectFilter);
    }

    // Search each project
    for (const projectName of projectNames) {
      const projectPath = path.join(this.basePath, projectName);

      try {
        const entries = await fs.readdir(projectPath, { withFileTypes: true });
        const sessionFiles = entries.filter(e => e.isFile() && e.name.endsWith('.jsonl'));

        for (const entry of sessionFiles) {
          const sessionId = entry.name.replace('.jsonl', '');
          const filePath = path.join(projectPath, entry.name);

          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.trim().split('\n').filter(line => line.trim());

            const messages: ClaudeMessage[] = [];
            const matchedMessages: ClaudeMessage[] = [];
            let matchCount = 0;

            for (const line of lines) {
              try {
                const message: ClaudeMessage = JSON.parse(line);

                // Skip non-conversational messages
                if (!['user', 'assistant', 'system', 'summary', 'progress'].includes(message.type)) {
                  continue;
                }

                messages.push(message);

                // Check role filter
                if (roleFilter && message.message?.role !== roleFilter) {
                  continue;
                }

                // Check date filters
                if (dateFrom || dateTo) {
                  const msgDate = new Date(message.timestamp);
                  if (dateFrom && msgDate < new Date(dateFrom)) continue;
                  if (dateTo && msgDate > new Date(dateTo)) continue;
                }

                // Search in message content
                const msgContent = typeof message.message?.content === 'string'
                  ? message.message.content.toLowerCase()
                  : JSON.stringify(message.message?.content).toLowerCase();

                const isMatch = searchTerms.some(term => msgContent.includes(term));

                if (isMatch) {
                  matchCount++;
                  if (matchedMessages.length < 5) { // Limit matched messages per session
                    matchedMessages.push(message);
                  }
                }
              } catch (e) {
                // Skip invalid lines
              }
            }

            if (matchCount > 0 && messages.length > 0) {
              const timestamps = messages
                .map(m => m.timestamp ? new Date(m.timestamp).getTime() : null)
                .filter((t): t is number => t !== null && !isNaN(t));

              if (timestamps.length > 0) {
                let totalTokens = 0;
                let estimatedCost = 0;

                // Calculate tokens
                for (const msg of messages) {
                  if (msg.message?.usage) {
                    totalTokens += (msg.message.usage.input_tokens || 0) + (msg.message.usage.output_tokens || 0);
                  }
                  if (msg.costUSD) {
                    estimatedCost += msg.costUSD;
                  }
                }

                const session: Session = {
                  id: sessionId,
                  projectName,
                  filePath,
                  messages: [], // Don't include all messages in search results
                  messageCount: messages.length,
                  createdAt: new Date(Math.min(...timestamps)).toISOString(),
                  updatedAt: new Date(Math.max(...timestamps)).toISOString(),
                  totalTokens,
                  estimatedCost,
                };

                results.set(`${projectName}/${sessionId}`, {
                  session,
                  matchedMessages,
                  matchCount,
                });
              }
            }
          } catch (error) {
            console.warn(`Error reading session file ${filePath}:`, error);
          }
        }
      } catch (error) {
        console.warn(`Error reading project ${projectName}:`, error);
      }
    }

    // Convert to array, sort by match count, and limit results
    return Array.from(results.values())
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, limit);
  }
}
