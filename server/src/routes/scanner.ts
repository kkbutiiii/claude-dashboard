import { Router } from 'express';
import { ProjectScanner } from '../scanner.js';

const router = Router();

const getScanner = () => {
  const basePath = process.env.CLAUDE_PROJECTS_PATH ||
    `${process.env.HOME || process.env.USERPROFILE}/.claude/projects`;
  console.log('Scanner base path:', basePath);
  return new ProjectScanner(basePath);
};

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
    const projects = await scanner.scanAllProjects();
    const project = projects.find(p => p.name === name);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

export { router as scannerRouter };
