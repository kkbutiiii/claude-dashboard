import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import type { Bookmark } from '../types.js';

const router = Router();

const getDataPath = () => {
  return process.env.DASHBOARD_DATA_PATH || './data';
};

const getBookmarksPath = () => {
  return path.join(getDataPath(), 'bookmarks.json');
};

const readBookmarks = async (): Promise<Bookmark[]> => {
  try {
    const data = await fs.readFile(getBookmarksPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const writeBookmarks = async (bookmarks: Bookmark[]) => {
  const dataPath = getDataPath();
  await fs.mkdir(dataPath, { recursive: true });
  await fs.writeFile(getBookmarksPath(), JSON.stringify(bookmarks, null, 2));
};

// GET /api/bookmarks
router.get('/', async (req, res) => {
  try {
    const bookmarks = await readBookmarks();
    res.json({ bookmarks });
  } catch (error) {
    console.error('Error reading bookmarks:', error);
    res.status(500).json({ error: 'Failed to read bookmarks' });
  }
});

// POST /api/bookmarks
router.post('/', async (req, res) => {
  try {
    const { messageUuid, sessionId, projectName, note } = req.body;

    if (!messageUuid || !sessionId || !projectName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const bookmarks = await readBookmarks();

    const newBookmark: Bookmark = {
      id: crypto.randomUUID(),
      messageUuid,
      sessionId,
      projectName,
      note,
      createdAt: new Date().toISOString(),
    };

    bookmarks.push(newBookmark);
    await writeBookmarks(bookmarks);

    res.status(201).json({ bookmark: newBookmark });
  } catch (error) {
    console.error('Error creating bookmark:', error);
    res.status(500).json({ error: 'Failed to create bookmark' });
  }
});

// DELETE /api/bookmarks/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bookmarks = await readBookmarks();
    const filtered = bookmarks.filter(b => b.id !== id);

    if (filtered.length === bookmarks.length) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    await writeBookmarks(filtered);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

export { router as bookmarkRouter };
