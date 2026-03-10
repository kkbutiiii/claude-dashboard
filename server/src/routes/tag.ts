import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import type { Tag, SessionTag } from '../types.js';

const router = Router();

const getDataPath = () => {
  return process.env.DASHBOARD_DATA_PATH || './data';
};

const getTagsPath = () => path.join(getDataPath(), 'tags.json');
const getSessionTagsPath = () => path.join(getDataPath(), 'session-tags.json');

const readTags = async (): Promise<Tag[]> => {
  try {
    const data = await fs.readFile(getTagsPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const writeTags = async (tags: Tag[]) => {
  const dataPath = getDataPath();
  await fs.mkdir(dataPath, { recursive: true });
  await fs.writeFile(getTagsPath(), JSON.stringify(tags, null, 2));
};

const readSessionTags = async (): Promise<SessionTag[]> => {
  try {
    const data = await fs.readFile(getSessionTagsPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const writeSessionTags = async (sessionTags: SessionTag[]) => {
  const dataPath = getDataPath();
  await fs.mkdir(dataPath, { recursive: true });
  await fs.writeFile(getSessionTagsPath(), JSON.stringify(sessionTags, null, 2));
};

// GET /api/tags
router.get('/', async (req, res) => {
  try {
    const tags = await readTags();
    res.json({ tags });
  } catch (error) {
    console.error('Error reading tags:', error);
    res.status(500).json({ error: 'Failed to read tags' });
  }
});

// POST /api/tags
router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const tags = await readTags();

    if (tags.some(t => t.name === name)) {
      return res.status(409).json({ error: 'Tag already exists' });
    }

    const newTag: Tag = {
      id: crypto.randomUUID(),
      name,
      color: color || '#' + Math.floor(Math.random() * 16777215).toString(16),
      createdAt: new Date().toISOString(),
    };

    tags.push(newTag);
    await writeTags(tags);

    res.status(201).json({ tag: newTag });
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// DELETE /api/tags/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tags = await readTags();
    const filtered = tags.filter(t => t.id !== id);

    if (filtered.length === tags.length) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    await writeTags(filtered);

    // Also remove session-tag associations
    const sessionTags = await readSessionTags();
    const filteredSessionTags = sessionTags.filter(st => st.tagId !== id);
    await writeSessionTags(filteredSessionTags);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// GET /api/tags/session/:sessionId
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const tags = await readTags();
    const sessionTags = await readSessionTags();

    const sessionTagIds = sessionTags
      .filter(st => st.sessionId === sessionId)
      .map(st => st.tagId);

    const sessionTagsList = tags.filter(t => sessionTagIds.includes(t.id));

    res.json({ tags: sessionTagsList });
  } catch (error) {
    console.error('Error reading session tags:', error);
    res.status(500).json({ error: 'Failed to read session tags' });
  }
});

// POST /api/tags/session/:sessionId
router.post('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { tagId } = req.body;

    if (!tagId) {
      return res.status(400).json({ error: 'tagId is required' });
    }

    const sessionTags = await readSessionTags();

    if (sessionTags.some(st => st.sessionId === sessionId && st.tagId === tagId)) {
      return res.status(409).json({ error: 'Tag already assigned to session' });
    }

    sessionTags.push({ sessionId, tagId });
    await writeSessionTags(sessionTags);

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error adding tag to session:', error);
    res.status(500).json({ error: 'Failed to add tag to session' });
  }
});

// DELETE /api/tags/session/:sessionId/:tagId
router.delete('/session/:sessionId/:tagId', async (req, res) => {
  try {
    const { sessionId, tagId } = req.params;
    const sessionTags = await readSessionTags();

    const filtered = sessionTags.filter(
      st => !(st.sessionId === sessionId && st.tagId === tagId)
    );

    if (filtered.length === sessionTags.length) {
      return res.status(404).json({ error: 'Tag assignment not found' });
    }

    await writeSessionTags(filtered);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing tag from session:', error);
    res.status(500).json({ error: 'Failed to remove tag from session' });
  }
});

export { router as tagRouter };
