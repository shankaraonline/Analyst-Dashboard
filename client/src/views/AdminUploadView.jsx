import React, { useState, useRef } from 'react';
import { useDashboard, AVAILABLE_VERTICAL_PRESETS } from '../context/DashboardContext';
import { parseExcelWorkbookFile, parsePastedExcelText } from '../utils/excelParser';
import {
  UploadCloud,
  Plus,
  FileSpreadsheet,
  ClipboardPaste,
  ArrowRight,
  Eye,
  RefreshCw,
  Trash2,
  Link,
  CheckCircle2,
  Globe,
  Settings,
  ExternalLink
} from 'lucide-react';
import {
  FacebookIcon,
  InstagramIcon,
  YoutubeIcon,
  LinkedinIcon,
  WhatsappIcon,
  WebsiteIcon,
  CustomChannelIcon
} from '../components/common/SocialIcons';

export default function AdminUploadView() {
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    createNewProject,
    deleteProject,
    activeProject,
    sheetData,
    updatePlatformData,
    clearProjectData,
    viewClientDashboard,
    syncProjectFromGoogleSheet,
    updateProjectSettings,
    isSyncing,
    showNotification,
    allVerticals,
    addCustomVertical,
    deleteCustomVertical
  } = useDashboard();

  // Create Project State
  const [newProjName, setNewProjName] = useState('');
  const [newProjWebsite, setNewProjWebsite] = useState('');
  const [newProjSheetUrl, setNewProjSheetUrl] = useState('');
  const [newProjCategories, setNewProjCategories] = useState(['facebook', 'instagram', 'youtube', 'linkedin']);
  const [customCatInput, setCustomCatInput] = useState('');

  // Active Project Google Sheet URL edit state
  const [editingSheetUrl, setEditingSheetUrl] = useState(activeProject?.googleSheetUrl || '');
  const [isEditingSettings, setIsEditingSettings] = useState(false);

  // Excel File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [lastUploadedFile, setLastUploadedFile] = useState(null);
  const fileInputRef = useRef(null);

  // Direct Excel Copy-Paste State
  const [pastePlatform, setPastePlatform] = useState('instagram');
  const [pastedText, setPastedText] = useState('');

  // Sync editingSheetUrl when activeProject changes
  React.useEffect(() => {
    setEditingSheetUrl(activeProject?.googleSheetUrl || '');
  }, [activeProjectId, activeProject?.googleSheetUrl]);

  // Compute row counts across all project categories
  const activeCategories = activeProject?.categories || ['facebook', 'instagram', 'youtube', 'linkedin'];
  let totalRows = 0;
  activeCategories.forEach(cat => {
    totalRows += (sheetData[cat]?.length || 0);
  });

  const handleSaveSheetUrlAndSync = async (e) => {
    e.preventDefault();
    if (!editingSheetUrl.trim()) return;

    updateProjectSettings(activeProject.id, { googleSheetUrl: editingSheetUrl.trim() });
    await syncProjectFromGoogleSheet(activeProject.id, editingSheetUrl.trim());
  };

  const handleToggleCategory = (catId) => {
    const current = activeProject?.categories || ['facebook', 'instagram', 'youtube', 'linkedin'];
    let updated;
    if (current.includes(catId)) {
      if (current.length <= 1) {
        showNotification('At least one channel must remain active.', 'warning');
        return;
      }
      updated = current.filter(c => c !== catId);
    } else {
      updated = [...current, catId];
    }
    updateProjectSettings(activeProject.id, { categories: updated });
  };

  const handleAddCustomCategory = (e) => {
    e.preventDefault();
    if (!customCatInput.trim()) return;
    addCustomVertical(customCatInput.trim());
    setCustomCatInput('');
  };

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    createNewProject({
      name: newProjName,
      website: newProjWebsite || 'https://example.com',
      googleSheetUrl: newProjSheetUrl.trim(),
      categories: newProjCategories
    });
    setNewProjName('');
    setNewProjWebsite('');
    setNewProjSheetUrl('');
    setNewProjCategories(['facebook', 'instagram', 'youtube', 'linkedin']);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const parsedData = await parseExcelWorkbookFile(file);
      
      let importedCount = 0;
      Object.keys(parsedData).forEach(plat => {
        if (parsedData[plat] && parsedData[plat].length > 0) {
          updatePlatformData(plat, parsedData[plat]);
          importedCount += parsedData[plat].length;
        }
      });

      if (importedCount === 0) {
        showNotification('No matching platform data detected in this file.', 'warning');
      } else {
        setLastUploadedFile({
          name: file.name,
          size: Math.round(file.size / 1024),
          rows: importedCount,
          time: new Date().toLocaleTimeString()
        });
        showNotification(`Successfully imported ${importedCount} rows from "${file.name}"!`);
      }
    } catch (err) {
      console.error('File parsing error:', err);
      showNotification(`Could not parse Excel file: ${err.message}`, 'danger');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImportPastedData = (e) => {
    e.preventDefault();
    if (!pastedText.trim()) return;

    try {
      const parsedRows = parsePastedExcelText(pastedText, pastePlatform);
      if (parsedRows.length === 0) {
        showNotification('No valid rows found in pasted text.', 'warning');
        return;
      }

      updatePlatformData(pastePlatform, parsedRows);
      showNotification(`Successfully imported ${parsedRows.length} rows into ${pastePlatform.toUpperCase()}!`);
      setPastedText('');
    } catch (err) {
      console.error('Paste import error:', err);
      showNotification(`Error importing pasted data: ${err.message}`, 'danger');
    }
  };

  const getCategoryIcon = (catId) => {
    switch (catId) {
      case 'facebook': return <FacebookIcon size={18} color="#1877F2" />;
      case 'instagram': return <InstagramIcon size={18} color="#E1306C" />;
      case 'youtube': return <YoutubeIcon size={18} color="#FF0000" />;
      case 'linkedin': return <LinkedinIcon size={18} color="#0A66C2" />;
      case 'whatsapp': return <WhatsappIcon size={18} color="#25D366" />;
      case 'website_audits': return <WebsiteIcon size={18} color="#8B5CF6" />;
      default: return <CustomChannelIcon size={18} color="#6366F1" />;
    }
  };

  const getCategoryLabel = (catId) => {
    const found = allVerticals?.find(p => p.id === catId);
    if (found) return found.label;
    const preset = AVAILABLE_VERTICAL_PRESETS.find(p => p.id === catId);
    if (preset) return preset.label;
    return catId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* 1. Google Sheet 1-Click Live Sync Card (Primary Feature) */}
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
                  Live Google Sheet Direct Sync
                </h3>
                <span className="badge badge-success" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> Automatic Auto-Sync
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                Connect your monthly Google Sheet. Every tab maps directly to its channel dashboard automatically.
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
            <span>{isSyncing ? 'Syncing All Tabs...' : 'Sync Live Sheet Now 🔄'}</span>
          </button>
        </form>

        <div style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, color: '#38BDF8' }}>Tip:</span>
          <span>Ensure Google Sheet link sharing is set to <strong>"Anyone with the link can view"</strong>. No API tokens or OAuth setup required!</span>
          {activeProject?.googleSheetUrl && (
            <a
              href={activeProject.googleSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#6366F1', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: 600, marginLeft: 'auto' }}
            >
              Open Sheet <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* 2. Active Channels & Categories Configuration */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '22px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
              📂 Active Channels & Verticals for <span style={{ color: '#38BDF8' }}>{activeProject?.name}</span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Enable or disable which verticals to track for this workspace. Custom verticals stay in your library.
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          {(allVerticals || AVAILABLE_VERTICAL_PRESETS).map(preset => {
            const isActive = activeCategories.includes(preset.id);
            const rowCount = sheetData[preset.id]?.length || 0;
            return (
              <div
                key={preset.id}
                onClick={() => handleToggleCategory(preset.id)}
                style={{
                  padding: '14px',
                  background: isActive ? 'var(--bg-card-inner)' : 'transparent',
                  borderRadius: '10px',
                  border: `1px solid ${isActive ? '#6366F1' : 'var(--border-color)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  opacity: isActive ? 1 : 0.6,
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {getCategoryIcon(preset.id)}
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{preset.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{rowCount} monthly rows</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className={isActive ? 'badge badge-success' : 'badge'} style={{ fontSize: '0.65rem' }}>
                    {isActive ? 'Enabled' : 'Disabled'}
                  </span>
                  {preset.isCustom && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete "${preset.label}" from all verticals?`)) {
                          deleteCustomVertical(preset.id);
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        opacity: 0.75,
                        transition: 'opacity 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.75'}
                      title={`Remove "${preset.label}" custom vertical`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Custom Vertical Category Form */}
        <form onSubmit={handleAddCustomCategory} style={{ display: 'flex', gap: '10px', alignItems: 'center', maxWidth: '480px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Add custom channel (e.g. SEO Audits, Email Marketing)..."
            value={customCatInput}
            onChange={(e) => setCustomCatInput(e.target.value)}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          />
          <button type="submit" className="btn btn-outline btn-sm" style={{ whiteSpace: 'nowrap' }}>
            <Plus size={14} /> Add Vertical
          </button>
        </form>
      </div>

      {/* 3. Manual Upload & Paste Fallbacks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Upload Excel / CSV File */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '22px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
              <UploadCloud size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>Manual Excel / CSV File Upload</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Upload local offline files (multi-tab & matrices supported)</span>
            </div>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--border-color-subtle)',
              borderRadius: '12px',
              padding: '26px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'var(--bg-card-inner)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#6366F1'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color-subtle)'}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <FileSpreadsheet size={30} color="#6366F1" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isUploading ? 'Parsing & Ingesting...' : 'Click to select Excel (.xlsx) file'}
            </div>
          </div>

          {lastUploadedFile && (
            <div style={{ marginTop: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#10B981', fontWeight: 600 }}>
                ✓ Ingested "{lastUploadedFile.name}" ({lastUploadedFile.rows} rows)
              </span>
              <span style={{ color: 'var(--text-muted)' }}>{lastUploadedFile.time}</span>
            </div>
          )}
        </div>

        {/* Direct Paste from Excel */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '22px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1' }}>
              <ClipboardPaste size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>Paste Rows Directly from Clipboard</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Copy cells in Excel / Google Sheets and paste here</span>
            </div>
          </div>

          <form onSubmit={handleImportPastedData} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Target Channel:</label>
              <select
                className="form-select"
                style={{ padding: '4px 10px', fontSize: '0.8rem', width: 'auto' }}
                value={pastePlatform}
                onChange={(e) => setPastePlatform(e.target.value)}
              >
                {activeCategories.map(cat => (
                  <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                ))}
              </select>
            </div>

            <textarea
              className="form-input"
              rows={3}
              style={{ fontSize: '0.75rem', fontFamily: 'monospace', resize: 'vertical' }}
              placeholder="Paste copied cells here..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!pastedText.trim()}
                style={{ opacity: !pastedText.trim() ? 0.5 : 1 }}
              >
                Import into {pastePlatform.toUpperCase()} <ArrowRight size={14} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 4. Projects List & Create Workspace Modal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Active Projects List */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '22px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '14px', fontWeight: 700 }}>
            Client Workspaces ({projects.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {projects.map(p => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: activeProjectId === p.id ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card-inner)',
                  border: `1px solid ${activeProjectId === p.id ? '#6366F1' : 'var(--border-color)'}`,
                  borderRadius: '10px'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Website: {p.website || p.client || 'Direct'} • {p.categories?.length || 4} channels
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => viewClientDashboard(p.id)}
                    style={{ background: '#10B981', border: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                  >
                    <Eye size={12} /> View
                  </button>

                  {activeProjectId !== p.id && (
                    <button className="btn btn-outline btn-sm" onClick={() => setActiveProjectId(p.id)} style={{ fontSize: '0.75rem' }}>
                      Select
                    </button>
                  )}
                  {projects.length > 1 && (
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ color: '#EF4444', fontSize: '0.75rem', padding: '6px 8px' }}
                      onClick={() => deleteProject(p.id)}
                      title="Delete Workspace"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
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
                Project / Campaign Name *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Art of Living Australia"
                value={newProjName}
                onChange={(e) => setNewProjName(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Website
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. ssrdp.org"
                value={newProjWebsite}
                onChange={(e) => setNewProjWebsite(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Google Sheet URL (Optional)
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
