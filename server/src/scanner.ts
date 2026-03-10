import fs from 'fs/promises';
import path from 'path';
import type { Project, Session, ClaudeMessage } from './types.js';

export class ProjectScanner {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async scanAllProjects(): Promise<Project[]> {
    const projects: Project[] = [];

    try {
      console.log('Scanning base path:', this.basePath);
      const entries = await fs.readdir(this.basePath, { withFileTypes: true });
      console.log('Found entries:', entries.length);

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

  private async scanProject(projectName: string): Promise<Project | null> {
    const projectPath = path.join(this.basePath, projectName);

    try {
      const sessions: Session[] = [];

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
            sessionId
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

      return {
        name: projectName,
        path: projectPath,
        sessions,
        sessionCount: sessions.length,
        lastUpdated: sessions[0]?.updatedAt || new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Error scanning project ${projectName}:`, error);
      return null;
    }
  }

  private async readSession(
    projectName: string,
    sessionsPath: string,
    fileName: string,
    sessionId: string
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
          const message: ClaudeMessage = JSON.parse(line);

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

    return this.readSession(projectName, projectPath, fileName, sessionId);
  }
}
