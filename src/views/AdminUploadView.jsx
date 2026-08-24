import React, { useState, useRef } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { parseExcelWorkbookFile, parsePastedExcelText } from '../utils/excelParser';
import { UploadCloud, Plus, FileSpreadsheet, ClipboardPaste, ArrowRight, Eye, RefreshCw, Trash2 } from 'lucide-react';
import { FacebookIcon, InstagramIcon, YoutubeIcon, LinkedinIcon } from '../components/common/SocialIcons';

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
    resetProjectToMaster,
    clearProjectData,
    viewClientDashboard,
    showNotification
  } = useDashboard();

  const [newProjName, setNewProjName] = useState('');
  const [newProjClient, setNewProjClient] = useState('');
  const [prefillSample, setPrefillSample] = useState(false);
  
  // Excel File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [lastUploadedFile, setLastUploadedFile] = useState(null);
  const fileInputRef = useRef(null);

  // Direct Excel Copy-Paste State
  const [pastePlatform, setPastePlatform] = useState('instagram');
  const [pastedText, setPastedText] = useState('');

  const fbCount = sheetData.facebook?.length || 0;
  const igCount = sheetData.instagram?.length || 0;
  const ytCount = sheetData.youtube?.length || 0;
  const liCount = sheetData.linkedin?.length || 0;
  const totalRows = fbCount + igCount + ytCount + liCount;

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    createNewProject({
      name: newProjName,
      client: newProjClient || 'Direct Client',
      prefillSampleData: prefillSample
    });
    setNewProjName('');
    setNewProjClient('');
    setPrefillSample(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const parsedData = await parseExcelWorkbookFile(file);
      
      let importedCount = 0;
      ['facebook', 'instagram', 'youtube', 'linkedin'].forEach(plat => {
        if (parsedData[plat] && parsedData[plat].length > 0) {
          updatePlatformData(plat, parsedData[plat]);
          importedCount += parsedData[plat].length;
        }
      });

      if (importedCount === 0) {
        showNotification('No matching platform data detected in this file. Please verify sheet format.', 'warning');
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
        showNotification('No valid rows found in pasted text. Please check your data format.', 'warning');
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

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '22px 26px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚙️ Admin Portal — Worksheets & Projects
            </span>
          </div>
          <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', margin: 0 }}>
            Active Project: {activeProject?.name}
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Upload Excel sheets (horizontal or vertical), paste rows, or launch the client dashboard.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {totalRows > 0 && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                if (window.confirm(`Clear all ${totalRows} rows of data for "${activeProject?.name}" to start fresh?`)) {
                  clearProjectData();
                }
              }}
              style={{ color: '#EF4444' }}
              title="Clear all channel data for this project"
            >
              <Trash2 size={14} /> Clear All Data
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={resetProjectToMaster} title="Load sample dataset">
            <RefreshCw size={14} /> Load Sample Data
          </button>
          <button
            className="btn btn-primary"
            onClick={() => viewClientDashboard()}
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              fontWeight: 700,
              padding: '10px 20px',
              fontSize: '0.875rem',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            <Eye size={16} /> View Client Dashboard
          </button>
        </div>
      </div>

      {/* Clean Worksheets Status for Current Project */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
            📋 Connected Worksheets for <span style={{ color: '#38BDF8' }}>{activeProject?.name}</span>
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Total: {totalRows} monthly rows
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '14px', background: 'var(--bg-card-inner)', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FacebookIcon size={20} color="#1877F2" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Facebook Sheet</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fbCount} monthly rows</div>
              </div>
            </div>
            {fbCount > 0 ? (
              <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Active</span>
            ) : (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Empty</span>
            )}
          </div>

          <div style={{ padding: '14px', background: 'var(--bg-card-inner)', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <InstagramIcon size={20} color="#E1306C" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Instagram Sheet</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{igCount} monthly rows</div>
              </div>
            </div>
            {igCount > 0 ? (
              <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Active</span>
            ) : (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Empty</span>
            )}
          </div>

          <div style={{ padding: '14px', background: 'var(--bg-card-inner)', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <YoutubeIcon size={20} color="#FF0000" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>YouTube Sheet</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ytCount} monthly rows</div>
              </div>
            </div>
            {ytCount > 0 ? (
              <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Active</span>
            ) : (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Empty</span>
            )}
          </div>

          <div style={{ padding: '14px', background: 'var(--bg-card-inner)', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <LinkedinIcon size={20} color="#0A66C2" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>LinkedIn Sheet</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{liCount} monthly rows</div>
              </div>
            </div>
            {liCount > 0 ? (
              <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Active</span>
            ) : (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Empty</span>
            )}
          </div>
        </div>
      </div>

      {/* Upload & Paste Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* 1. Upload Excel / CSV File */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '22px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
              <UploadCloud size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>Upload Excel (.xlsx) / CSV Sheet</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Supports horizontal (months across columns) & vertical formats</span>
            </div>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--border-color-subtle)',
              borderRadius: '12px',
              padding: '28px 20px',
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
            <FileSpreadsheet size={32} color="#6366F1" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isUploading ? 'Parsing & Ingesting...' : 'Click to select Excel (.xlsx) or CSV file'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Auto-detects Facebook, Instagram, YouTube, and LinkedIn structures
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

        {/* 2. Direct Paste from Excel */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '22px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1' }}>
              <ClipboardPaste size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>Paste Rows Directly from Excel</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Copy any table or matrix in Excel & Paste here</span>
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
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="youtube">YouTube</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </div>

            <textarea
              className="form-input"
              rows={3}
              style={{ fontSize: '0.75rem', fontFamily: 'monospace', resize: 'vertical' }}
              placeholder="Paste copied cells here (e.g. horizontal matrix with months in header or vertical rows)..."
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

      {/* Projects List & Create Workspace */}
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
                    Client: {p.client} • {p.createdAt}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => viewClientDashboard(p.id)}
                    style={{ background: '#10B981', border: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                  >
                    <Eye size={12} /> View Dashboard
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
                Client / Brand Name or Website
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. ssrdp.org"
                value={newProjClient}
                onChange={(e) => setNewProjClient(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <input
                type="checkbox"
                id="prefillSample"
                checked={prefillSample}
                onChange={(e) => setPrefillSample(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="prefillSample" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Pre-fill with sample 25-month demo data (uncheck to start with clean empty sheets)
              </label>
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
