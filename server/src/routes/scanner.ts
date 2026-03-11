import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ProjectScanner } from '../scanner.js';

const execAsync = promisify(exec);

const router = Router();

// 单例扫描器实例
let scannerInstance: ProjectScanner | null = null;

const getScanner = () => {
  if (!scannerInstance) {
    const basePath = process.env.CLAUDE_PROJECTS_PATH ||
      `${process.env.HOME || process.env.USERPROFILE}/.claude/projects`;
    scannerInstance = new ProjectScanner(basePath);
  }
  return scannerInstance;
};

// 导出扫描器实例以便其他模块使用（如 watcher）
export const getScannerInstance = getScanner;

// GET /api/scanner/projects
router.get('/projects', async (req, res) => {
  try {
    const scanner = getScanner();
    const projects = await scanner.scanAllProjects();
    res.json({ projects });
  } catch (error) {
    console.error('Error scanning projects:', error);
    res.status(500).json({ error: 'Failed to scan projects' });
  }
});

// GET /api/scanner/projects/:name
router.get('/projects/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const scanner = getScanner();
    // 使用 scanSingleProject 避免扫描所有项目
    const project = await scanner.scanSingleProject(name);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

// GET /api/scanner/projects/:name/markdown?path=relative/path/to/file.md
router.get('/projects/:name/markdown', async (req, res) => {
  try {
    const { name } = req.params;
    const { path: relativePath } = req.query;

    if (!relativePath || typeof relativePath !== 'string') {
      return res.status(400).json({ error: 'Path parameter is required' });
    }

    const scanner = getScanner();

    // Get project to find sourcePath - 使用 scanSingleProject 优化
    const project = await scanner.scanSingleProject(name);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Use sourcePath if available
    const basePath = project.sourcePath;
    const content = await scanner.readMarkdownFile(name, relativePath, basePath);

    if (content === null) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ content, path: relativePath });
  } catch (error) {
    console.error('Error reading markdown:', error);
    res.status(500).json({ error: 'Failed to read markdown file' });
  }
});

// POST /api/scanner/projects/:name/description
router.post('/projects/:name/description', async (req, res) => {
  try {
    const { name } = req.params;
    const { description } = req.body;

    if (typeof description !== 'string') {
      return res.status(400).json({ error: 'Description is required' });
    }

    const scanner = getScanner();
    const success = await scanner.saveProjectDescription(name, description);

    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to save description' });
    }
  } catch (error) {
    console.error('Error saving description:', error);
    res.status(500).json({ error: 'Failed to save description' });
  }
});

// POST /api/scanner/projects/:name/display-name
router.post('/projects/:name/display-name', async (req, res) => {
  try {
    const { name } = req.params;
    const { displayName } = req.body;

    if (typeof displayName !== 'string') {
      return res.status(400).json({ error: 'Display name is required' });
    }

    const scanner = getScanner();
    const success = await scanner.saveProjectDisplayName(name, displayName);

    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to save display name' });
    }
  } catch (error) {
    console.error('Error saving display name:', error);
    res.status(500).json({ error: 'Failed to save display name' });
  }
});

// POST /api/scanner/projects/:name/avatar
router.post('/projects/:name/avatar', async (req, res) => {
  try {
    const { name } = req.params;
    const { avatar } = req.body;

    if (typeof avatar !== 'string') {
      return res.status(400).json({ error: 'Avatar is required' });
    }

    const scanner = getScanner();
    const success = await scanner.saveProjectAvatar(name, avatar);

    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to save avatar' });
    }
  } catch (error) {
    console.error('Error saving avatar:', error);
    res.status(500).json({ error: 'Failed to save avatar' });
  }
});

// POST /api/scanner/projects/:name/open-folder
router.post('/projects/:name/open-folder', async (req, res) => {
  try {
    const { name } = req.params;
    const scanner = getScanner();
    // 使用 scanSingleProject 避免扫描所有项目
    const project = await scanner.scanSingleProject(name);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Use sourcePath if available, otherwise fallback to path
    const openPath = project.sourcePath || project.path;

    const platform = process.platform;
    let command: string;

    if (platform === 'win32') {
      command = `explorer "${openPath}"`;
    } else if (platform === 'darwin') {
      command = `open "${openPath}"`;
    } else {
      command = `xdg-open "${openPath}"`;
    }

    await execAsync(command);
    res.json({ success: true });
  } catch (error) {
    console.error('Error opening folder:', error);
    res.status(500).json({ error: 'Failed to open folder' });
  }
});

// GET /api/scanner/search?q=query&project=xxx&role=xxx&dateFrom=xxx&dateTo=xxx
router.get('/search', async (req, res) => {
  try {
    const { q: query, project, role, dateFrom, dateTo } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const scanner = getScanner();
    const results = await scanner.searchMessages(query, {
      project: project as string | undefined,
      role: role as string | undefined,
      dateFrom: dateFrom as string | undefined,
      dateTo: dateTo as string | undefined,
      limit: 50,
    });

    res.json({
      results,
      total: results.length,
      query,
    });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: 'Failed to search' });
  }
});

export { router as scannerRouter };
