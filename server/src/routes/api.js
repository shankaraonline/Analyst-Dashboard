import { Router } from 'express';
import { Project } from '../models/Project.js';
import { fetchAndParseGoogleSheet } from '../services/sheetSyncService.js';
import { verifyAdminToken } from '../middleware/auth.js';

const router = Router();

// Health Check Endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Social Dashboard Lightweight API' });
});

// -------------------------------------------------------------
// LIGHTWEIGHT PROJECT CRUD ROUTES (MongoDB Compass / Atlas)
// Stores ONLY Name, Website, Description & Google Sheet URL
// -------------------------------------------------------------

// 1. Get all projects (Public / Read-only for Client View)
router.get('/projects', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json({ success: true, projects });
  } catch (error) {
    console.error('Error fetching projects from MongoDB:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Create new project (Protected: SuperAdmin Only)
router.post('/projects', verifyAdminToken, async (req, res) => {
  try {
    const { name, website, description, googleSheetUrl, color } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Project name is required' });
    }

    const project = new Project({
      name: name.trim(),
      website: (website || '').trim(),
      description: (description || '').trim(),
      googleSheetUrl: (googleSheetUrl || '').trim(),
      color: color || '#6366F1'
    });

    await project.save();
    console.log(`✅ Saved lightweight project to MongoDB: "${project.name}"`);
    res.status(201).json({ success: true, project });
  } catch (error) {
    console.error('Error creating project in MongoDB:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Update existing project (Protected: SuperAdmin Only)
router.put('/projects/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, website, description, googleSheetUrl, lastSyncedAt, color } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (website !== undefined) updates.website = website;
    if (description !== undefined) updates.description = description;
    if (googleSheetUrl !== undefined) updates.googleSheetUrl = googleSheetUrl;
    if (lastSyncedAt !== undefined) updates.lastSyncedAt = lastSyncedAt;
    if (color !== undefined) updates.color = color;

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

// 4. Delete project (Protected: SuperAdmin Only)
router.delete('/projects/:id', verifyAdminToken, async (req, res) => {
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
// LIVE ON-DEMAND GOOGLE SHEET SYNC ROUTES
// Parses live data in-memory without bloating MongoDB
// -------------------------------------------------------------

// Direct Sync for a project (Protected: SuperAdmin Only)
router.post('/projects/:id/sync', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { sheetUrl: overrideUrl } = req.body;

    let project = null;
    try {
      if (id && !id.startsWith('proj-')) {
        project = await Project.findById(id);
      }
    } catch {
      // Ignore cast error for local fallback IDs
    }

    const sheetUrl = overrideUrl || project?.googleSheetUrl;
    if (!sheetUrl) {
      return res.status(400).json({ success: false, error: 'Google Sheet URL is required' });
    }

    // Parse live on-demand
    const syncResult = await fetchAndParseGoogleSheet(sheetUrl);
    const now = new Date().toLocaleString();

    // Update metadata only in DB
    if (project) {
      project.googleSheetUrl = sheetUrl;
      project.lastSyncedAt = now;
      await project.save();
    }

    console.log(`🔄 Live parsed Google Sheet for "${project?.name || id}": ${syncResult.tabs.length} tabs (${syncResult.totalRows} rows) - Delivered in-memory`);

    res.json({
      success: true,
      project: project || { id, googleSheetUrl: sheetUrl, lastSyncedAt: now },
      tabs: syncResult.tabs,
      sheetData: syncResult.sheetData,
      totalRows: syncResult.totalRows,
      syncedAt: now
    });
  } catch (error) {
    console.error('Live sync error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to sync Google Sheet' });
  }
});

// Generic Google Sheet Live Sync Endpoint (Protected: SuperAdmin Only)
router.post('/sync-sheet', verifyAdminToken, async (req, res) => {
  try {
    const { sheetUrl } = req.body;
    if (!sheetUrl) {
      return res.status(400).json({ error: 'sheetUrl is required' });
    }

    const syncResult = await fetchAndParseGoogleSheet(sheetUrl);
    res.json({
      success: true,
      syncedAt: new Date().toLocaleString(),
      tabs: syncResult.tabs,
      sheetData: syncResult.sheetData,
      totalRows: syncResult.totalRows
    });
  } catch (error) {
    console.error('API /sync-sheet error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync Google Sheet'
    });
  }
});

// -------------------------------------------------------------
// KPI VISIBILITY ROUTES
// Stores per-tab admin-selected KPI metric keys (Omnichannel display preferences)
// -------------------------------------------------------------

// 5. Get KPI visibility map for a project (Public / Read-only for Client View)
router.get('/projects/:id/kpi-visibility', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id.startsWith('proj-')) {
      return res.json({ success: true, kpiVisibility: {} });
    }
    const project = await Project.findById(id).select('kpiVisibility');
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    res.json({ success: true, kpiVisibility: project.kpiVisibility || {} });
  } catch (error) {
    console.error('Error fetching kpiVisibility:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Update KPI visibility for a specific tab within a project (Protected: SuperAdmin Only)
router.put('/projects/:id/kpi-visibility', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { tabId, visibleKeys } = req.body;

    if (!tabId) return res.status(400).json({ success: false, error: 'tabId is required' });
    if (!Array.isArray(visibleKeys)) return res.status(400).json({ success: false, error: 'visibleKeys must be an array' });

    if (!id || id.startsWith('proj-')) {
      return res.json({ success: true, kpiVisibility: { [tabId]: visibleKeys } });
    }

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    if (!project.kpiVisibility) project.kpiVisibility = {};
    project.kpiVisibility[tabId] = visibleKeys;
    project.markModified('kpiVisibility'); // Required for Mixed type
    await project.save();

    console.log(`✅ Updated kpiVisibility for tab "${tabId}" in project "${project.name}"`);
    res.json({ success: true, kpiVisibility: project.kpiVisibility });
  } catch (error) {
    console.error('Error updating kpiVisibility:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
