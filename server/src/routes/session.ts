import { Router } from 'express';
import { ProjectScanner } from '../scanner.js';
import { saveSessionDisplayName } from '../db/index.js';

const router = Router();

const getScanner = () => {
  const basePath = process.env.CLAUDE_PROJECTS_PATH ||
    `${process.env.HOME || process.env.USERPROFILE}/.claude/projects`;
  return new ProjectScanner(basePath);
};

// GET /api/sessions/:projectName/:sessionId
router.get('/:projectName/:sessionId', async (req, res) => {
  try {
    const { projectName, sessionId } = req.params;
    const scanner = getScanner();
    const session = await scanner.getSession(projectName, sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// GET /api/sessions/:projectName/:sessionId/export/markdown
router.get('/:projectName/:sessionId/export/markdown', async (req, res) => {
  try {
    const { projectName, sessionId } = req.params;
    const scanner = getScanner();
    const session = await scanner.getSession(projectName, sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    let markdown = `# Claude Code Session: ${sessionId}\n\n`;
    markdown += `**Project:** ${projectName}\n\n`;
    markdown += `**Date:** ${new Date(session.createdAt).toLocaleString()}\n\n`;
    markdown += `**Messages:** ${session.messageCount}\n\n`;
    markdown += `---\n\n`;

    for (const message of session.messages) {
      const role = message.message?.role || message.type;
      const timestamp = new Date(message.timestamp).toLocaleString();

      markdown += `## ${role} (${timestamp})\n\n`;

      const content = message.message?.content;
      if (typeof content === 'string') {
        markdown += `${content}\n\n`;
      } else if (Array.isArray(content)) {
        for (const item of content) {
          if (item.type === 'text' && item.text) {
            markdown += `${item.text}\n\n`;
          } else if (item.type === 'thinking' && item.thinking) {
            markdown += `> 💭 *Thinking: ${item.thinking}*\n\n`;
          } else if (item.type === 'tool_use') {
            markdown += `> 🔧 *Tool: ${item.name}*\n\n`;
          }
        }
      }
    }

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${sessionId}.md"`);
    res.send(markdown);
  } catch (error) {
    console.error('Error exporting session:', error);
    res.status(500).json({ error: 'Failed to export session' });
  }
});

// POST /api/sessions/:projectName/:sessionId/display-name
router.post('/:projectName/:sessionId/display-name', async (req, res) => {
  try {
    const { projectName, sessionId } = req.params;
    const { displayName } = req.body;

    if (typeof displayName !== 'string') {
      return res.status(400).json({ error: 'Display name is required' });
    }

    // Verify session exists
    const scanner = getScanner();
    const session = await scanner.getSession(projectName, sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Save display name to database
    saveSessionDisplayName(sessionId, displayName);

    res.json({ success: true, displayName });
  } catch (error) {
    console.error('Error saving session display name:', error);
    res.status(500).json({ error: 'Failed to save session display name' });
  }
});

export { router as sessionRouter };
