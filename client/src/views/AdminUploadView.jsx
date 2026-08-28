import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { getTabIconComponent } from './UniversalTabView';
import { cleanValue, inferColumnType } from '../utils/googleSheetSync';
import {
  Plus,
  ArrowRight,
  Eye,
  RefreshCw,
  Trash2,
  Link,
  CheckCircle2,
  Layers,
  ExternalLink,
  ClipboardPaste,
  Table,
  Save
} from 'lucide-react';

export default function AdminUploadView() {
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    createNewProject,
    deleteProject,
    activeProject,
    activeTabs,
    sessionTabsMap,
    sheetData,
    viewClientDashboard,
    syncProjectFromGoogleSheet,
    updateProjectSettings,
    addCustomTab,
    deleteTab,
    isSyncing,
    showNotification,
    setCurrentView
  } = useDashboard();

  // Create Project State
  const [newProjName, setNewProjName] = useState('');
  const [newProjDescription, setNewProjDescription] = useState('');
  const [newProjSheetUrl, setNewProjSheetUrl] = useState('');

  // Active Project Google Sheet URL edit state
  const [editingSheetUrl, setEditingSheetUrl] = useState(activeProject?.googleSheetUrl || '');

  // Direct Table Insertion / Paste State
  const [targetTabOption, setTargetTabOption] = useState('new'); // 'new' | existing tabId
  const [customTabName, setCustomTabName] = useState('');
  const [pastedRawText, setPastedRawText] = useState('');
  const [assignedColumns, setAssignedColumns] = useState([]);
  const [previewPastedRows, setPreviewPastedRows] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  // Sync editingSheetUrl when activeProject changes
  React.useEffect(() => {
    setEditingSheetUrl(activeProject?.googleSheetUrl || '');
  }, [activeProjectId, activeProject?.googleSheetUrl]);

  const handleSaveSheetUrlAndSync = async (e) => {
    e.preventDefault();
    if (!editingSheetUrl.trim()) return;

    updateProjectSettings(activeProject.id || activeProject._id, { googleSheetUrl: editingSheetUrl.trim() });
    await syncProjectFromGoogleSheet(activeProject.id || activeProject._id, editingSheetUrl.trim());
  };

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    createNewProject({
      name: newProjName.trim(),
      description: newProjDescription.trim(),
      googleSheetUrl: newProjSheetUrl.trim()
    });
    setNewProjName('');
    setNewProjDescription('');
    setNewProjSheetUrl('');
  };

  // Direct Table / Cells Paste Parser
  const handleParsePastedText = (text) => {
    setPastedRawText(text);
    if (!text.trim()) {
      setAssignedColumns([]);
      setPreviewPastedRows([]);
      return;
    }

    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) return;

    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';

    const headerCells = firstLine.split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());
    const dataLines = lines.slice(1);

    const cols = headerCells.map((h, idx) => {
      const key = (h || `col_${idx + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      const sampleVals = dataLines.slice(0, 5).map(line => {
        const parts = line.split(delimiter);
        return cleanValue(parts[idx]);
      });
      const inferred = inferColumnType(h, sampleVals);

      return {
        key: key || `col_${idx + 1}`,
        label: h || `Column ${idx + 1}`,
        type: inferred,
        align: inferred === 'date' || inferred === 'text' ? 'left' : 'right'
      };
    });

    const parsedRows = dataLines.map((line, rIdx) => {
      const parts = line.split(delimiter);
      const rowObj = { _rowId: Date.now() + rIdx };
      cols.forEach((c, cIdx) => {
        rowObj[c.key] = cleanValue(parts[cIdx]);
      });
      return rowObj;
    });

    setAssignedColumns(cols);
    setPreviewPastedRows(parsedRows);
  };

  const handleUpdateAssignedColumn = (idx, field, value) => {
    setAssignedColumns(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleImportTableData = async (e) => {
    e.preventDefault();
    if (previewPastedRows.length === 0) {
      showNotification('Please paste valid table rows first.', 'warning');
      return;
    }

    let tabId = targetTabOption;
    let tabName = customTabName.trim();

    if (targetTabOption === 'new') {
      if (!tabName) {
        showNotification('Please enter a tab/channel name.', 'warning');
        return;
      }
      tabId = tabName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    } else {
      const existing = activeTabs.find(t => t.id === targetTabOption);
      tabName = existing ? existing.name : targetTabOption;
    }

    setIsImporting(true);
    try {
      await addCustomTab(tabId, tabName, assignedColumns, previewPastedRows);
      setPastedRawText('');
      setAssignedColumns([]);
      setPreviewPastedRows([]);
      setCustomTabName('');
      setTargetTabOption('new');
    } catch (err) {
      console.error('Import error:', err);
      showNotification('Failed to save table.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* 1. Google Sheet 1-Click Live Sync Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1' }}>
              <Link size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                  Multi-Tab Google Sheet Direct Sync
                </h3>
                <span className="badge badge-success" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> Auto Tab Discovery
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                Paste your Google Sheet link. Every tab in your sheet will automatically become a distinct channel ledger in the sidebar.
              </p>
            </div>
          </div>

          {activeProject?.lastSyncedAt && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Last Synced: <strong>{activeProject.lastSyncedAt}</strong>
            </span>
          )}
        </div>

        <form onSubmit={handleSaveSheetUrlAndSync} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="url"
            className="form-input"
            style={{ flex: 1, minWidth: '280px', fontSize: '0.85rem', padding: '10px 14px' }}
            placeholder="Paste Google Sheet URL (e.g. https://docs.google.com/spreadsheets/d/1BxiMVs.../edit)"
            value={editingSheetUrl}
            onChange={(e) => setEditingSheetUrl(e.target.value)}
          />

          <button
            type="submit"
            disabled={isSyncing || !editingSheetUrl.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: isSyncing || !editingSheetUrl.trim() ? 'not-allowed' : 'pointer',
              opacity: isSyncing || !editingSheetUrl.trim() ? 0.6 : 1,
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Discovering & Syncing Tabs...' : 'Sync Live Sheet Now 🔄'}</span>
          </button>
        </form>

        <div style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, color: '#38BDF8' }}>Tip:</span>
          <span>Ensure Google Sheet link sharing is set to <strong>"Anyone with the link can view"</strong>.</span>
          {activeProject?.googleSheetUrl && (
            <a
              href={activeProject.googleSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#6366F1', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: 600, marginLeft: 'auto' }}
            >
              Open Google Sheet <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* 2. Direct Table Insertion & Column Assignment (Beside Google Sheet sync) */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '22px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1' }}>
            <ClipboardPaste size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
              Manual Table Insertion & Column Assignment
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Paste table rows directly, assign/configure column headers & data types, and save to MongoDB.
            </span>
          </div>
        </div>

        <form onSubmit={handleImportTableData} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Target Tab Selection */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1', minWidth: '220px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>
                Target Channel / Tab:
              </label>
              <select
                className="form-select"
                style={{ width: '100%', fontSize: '0.8rem', padding: '6px 12px' }}
                value={targetTabOption}
                onChange={(e) => setTargetTabOption(e.target.value)}
              >
                <option value="new">➕ Create New Custom Tab</option>
                {activeTabs.map(t => (
                  <option key={t.id} value={t.id}>{t.name} (Replace / Append)</option>
                ))}
              </select>
            </div>

            {targetTabOption === 'new' && (
              <div style={{ flex: '1', minWidth: '220px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>
                  New Tab Name: *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sales Q3, Lead Gen, Twitter Ads"
                  style={{ width: '100%', fontSize: '0.8rem', padding: '6px 12px' }}
                  value={customTabName}
                  onChange={(e) => setCustomTabName(e.target.value)}
                  required={targetTabOption === 'new'}
                />
              </div>
            )}
          </div>

          {/* Paste Textarea */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Paste Table Cells (from Excel, Google Sheets, or CSV):
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Includes column headers on row 1
              </span>
            </div>
            <textarea
              className="form-input"
              rows={4}
              style={{ width: '100%', fontFamily: 'inherit', fontSize: '0.8rem', resize: 'vertical' }}
              placeholder="Copy cells from your spreadsheet (including headers) and paste here (Ctrl+V)..."
              value={pastedRawText}
              onChange={(e) => handleParsePastedText(e.target.value)}
            />
          </div>

          {/* Column Assignor Grid */}
          {assignedColumns.length > 0 && (
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Table size={16} color="#6366F1" />
                <span>Assign Column Headers & Data Types ({assignedColumns.length} columns detected)</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                {assignedColumns.map((col, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '10px'
                    }}
                  >
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: '0.78rem', padding: '4px 8px', marginBottom: '6px', fontWeight: 700 }}
                      value={col.label}
                      onChange={(e) => handleUpdateAssignedColumn(idx, 'label', e.target.value)}
                    />
                    <select
                      className="form-select"
                      style={{ fontSize: '0.75rem', padding: '4px 8px', width: '100%' }}
                      value={col.type}
                      onChange={(e) => handleUpdateAssignedColumn(idx, 'type', e.target.value)}
                    >
                      <option value="metric">Volume Metric (Reach/Views)</option>
                      <option value="currency">Currency (₹ Spend/Cost)</option>
                      <option value="percent">Percentage (%)</option>
                      <option value="date">Date / Month</option>
                      <option value="plusMetric">Gained / Plus Metric (+)</option>
                      <option value="number">Total / Number</option>
                      <option value="text">General Text</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview of Parsed Rows */}
          {previewPastedRows.length > 0 && (
            <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)' }}>
                    {assignedColumns.map((c, i) => (
                      <th key={i} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>
                        {c.label} ({c.type})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewPastedRows.slice(0, 5).map((r, ri) => (
                    <tr key={ri} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {assignedColumns.map((c, ci) => (
                        <td key={ci} style={{ padding: '6px 10px', textAlign: 'right' }}>
                          {String(r[c.key] || '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={previewPastedRows.length === 0 || isImporting}
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                fontWeight: 700
              }}
            >
              <Save size={14} />
              <span>{isImporting ? 'Saving to Database...' : `Save & Insert ${previewPastedRows.length} Rows into Tab`}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Discovered Tabs for Active Project */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '22px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#6366F1" />
              <span>Active Spreadsheet Tabs for <span style={{ color: '#38BDF8' }}>{activeProject?.name}</span></span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {activeTabs.length} tabs in this project. Click any tab to open its presentation view.
            </span>
          </div>
        </div>

        {activeTabs.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            {activeTabs.map(tab => {
              const { icon: TabIcon, color: tColor } = getTabIconComponent(tab.name);
              const rCount = (sheetData[tab.id] || []).length || tab.rowCount || 0;
              const colCount = tab.columns?.length || 0;
              return (
                <div
                  key={tab.id}
                  onClick={() => setCurrentView(tab.id)}
                  style={{ padding: '16px', background: 'var(--bg-card-inner)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = tColor}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${tColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TabIcon size={20} color={tColor} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{tab.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {rCount} monthly rows • {colCount > 0 ? `${colCount} columns` : 'Auto-structured'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                      onClick={(e) => { e.stopPropagation(); setCurrentView(tab.id); }}
                    >
                      View <ArrowRight size={12} />
                    </button>
                    {activeTabs.length > 1 && (
                      <button
                        style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                        onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete tab "${tab.name}"?`)) deleteTab(tab.id); }}
                        title="Delete Tab"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No tabs loaded yet. Paste your Google Sheet URL above or use the table insertion tool to add tabs.
          </div>
        )}
      </div>

      {/* 4. Projects List & Create Workspace Modal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Active Projects List */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '22px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '14px', fontWeight: 700 }}>
            Client Workspaces ({projects.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {projects.map(p => {
              const pId = p.id || p._id;
              const activeId = activeProject ? (activeProject.id || activeProject._id) : activeProjectId;
              const pTabs = (sessionTabsMap && (sessionTabsMap[pId] || sessionTabsMap[p.id] || sessionTabsMap[p._id])) ||
                (pId === activeId ? activeTabs : (p.tabs || []));
              const tabCount = Array.isArray(pTabs) && pTabs.length > 0 ? pTabs.length : (p.tabCount || 0);

              return (
                <div
                  key={pId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: activeId === pId ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card-inner)',
                    border: `1px solid ${activeId === pId ? '#6366F1' : 'var(--border-color)'}`,
                    borderRadius: '10px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {p.description || 'Omnichannel Analytics'} • {tabCount} {tabCount === 1 ? 'tab' : 'tabs'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => viewClientDashboard(p.id || p._id)}
                      style={{ background: '#10B981', border: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                    >
                      <Eye size={12} /> View
                    </button>

                    {activeProjectId !== (p.id || p._id) && (
                      <button className="btn btn-outline btn-sm" onClick={() => setActiveProjectId(p.id || p._id)} style={{ fontSize: '0.75rem' }}>
                        Select
                      </button>
                    )}
                    {projects.length > 1 && (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ color: '#EF4444', fontSize: '0.75rem', padding: '6px 8px' }}
                        onClick={() => deleteProject(p.id || p._id)}
                        title="Delete Workspace"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Create Workspace */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '22px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '14px', fontWeight: 700 }}>
            ➕ Create New Client Workspace
          </h3>

          <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Project / Workspace Name *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Art of Living Foundation"
                value={newProjName}
                onChange={(e) => setNewProjName(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Description
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Multi-Channel Performance Reporting & Campaign Intelligence"
                value={newProjDescription}
                onChange={(e) => setNewProjDescription(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Google Sheet URL (Optional - Auto-Syncs Tabs)
              </label>
              <input
                type="url"
                className="form-input"
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                value={newProjSheetUrl}
                onChange={(e) => setNewProjSheetUrl(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '6px' }}>
              <Plus size={15} /> Add Workspace
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
