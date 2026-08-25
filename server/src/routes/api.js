import { Router } from 'express';
import { Project } from '../models/Project.js';
import { fetchAndParseGoogleSheet } from '../services/sheetSyncService.js';

const router = Router();

// Health Check Endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Social Dashboard API' });
});

// -------------------------------------------------------------
// PROJECT CRUD ROUTES (MongoDB Compass / Atlas)
// Storing only Project metadata, Website, Verticals & Google Sheet URL
// -------------------------------------------------------------

// 1. Get all projects
router.get('/projects', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json({ success: true, projects });
  } catch (error) {
    console.error('Error fetching projects from MongoDB:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Create new project (stores Name, Website, Verticals & Sheet URL only)
router.post('/projects', async (req, res) => {
  try {
    const { name, website, categories, googleSheetUrl } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Project name is required' });
    }

    const project = new Project({
      name: name.trim(),
      website: (website || '').trim(),
      categories: categories && categories.length > 0 ? categories : ['facebook', 'instagram', 'youtube', 'linkedin'],
      googleSheetUrl: (googleSheetUrl || '').trim()
    });

    await project.save();
    console.log(`✅ Saved project to MongoDB: "${project.name}" | URL: "${project.googleSheetUrl}"`);
    res.status(201).json({ success: true, project });
  } catch (error) {
    console.error('Error creating project in MongoDB:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Update existing project
router.put('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, website, categories, googleSheetUrl, lastSyncedAt, color, description } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (website !== undefined) updates.website = website;
    if (categories !== undefined) updates.categories = categories;
    if (googleSheetUrl !== undefined) updates.googleSheetUrl = googleSheetUrl;
    if (lastSyncedAt !== undefined) updates.lastSyncedAt = lastSyncedAt;
    if (color !== undefined) updates.color = color;
    if (description !== undefined) updates.description = description;

    const project = await Project.findByIdAndUpdate(id, updates, { new: true });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true, project });
  } catch (error) {
    console.error('Error updating project in MongoDB:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Delete project
router.delete('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findByIdAndDelete(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    console.log(`🗑️ Deleted project from MongoDB: "${project.name}" (ID: ${id})`);
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    console.error('Error deleting project from MongoDB:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// -------------------------------------------------------------
// GOOGLE SHEET SYNC ROUTES
// Parses the Google Sheet live on demand
// -------------------------------------------------------------

// Direct sync for a project (updates lastSyncedAt & googleSheetUrl in DB, returns live parsed data)
router.post('/projects/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    const { sheetUrl: overrideUrl, categories: reqCategories } = req.body;

    let project = null;
    try {
      if (id && !id.startsWith('proj-')) {
        project = await Project.findById(id);
      }
    } catch (e) {
      // Ignore cast error for local IDs
    }

    const sheetUrl = overrideUrl || project?.googleSheetUrl;
    if (!sheetUrl) {
      return res.status(400).json({ success: false, error: 'Google Sheet URL is required' });
    }

    const categories = reqCategories || (project?.categories && project.categories.length > 0
      ? project.categories
      : ['facebook', 'instagram', 'youtube', 'linkedin']);

    const parsedData = await fetchAndParseGoogleSheet(sheetUrl, categories);
    const now = new Date().toLocaleString();

    if (project) {
      project.googleSheetUrl = sheetUrl;
      project.lastSyncedAt = now;
      await project.save().catch(err => console.warn('Could not save synced status to DB:', err.message));
    }

    console.log(`🔄 Synced Google Sheet for project: "${project?.name || id}"`);

    res.json({
      success: true,
      project: project || { id, googleSheetUrl: sheetUrl, lastSyncedAt: now },
      data: parsedData,
      syncedAt: now
    });
  } catch (error) {
    console.error('Project sync error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to sync Google Sheet' });
  }
});

// Generic Google Sheet Live Sync Endpoint
router.post('/sync-sheet', async (req, res) => {
  try {
    const { sheetUrl, categories = [] } = req.body;
    if (!sheetUrl) {
      return res.status(400).json({ error: 'sheetUrl is required' });
    }

    const data = await fetchAndParseGoogleSheet(sheetUrl, categories);
    res.json({
      success: true,
      syncedAt: new Date().toLocaleString(),
      data
    });
  } catch (error) {
    console.error('API /sync-sheet error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync Google Sheet'
    });
  }
});

export default router;
