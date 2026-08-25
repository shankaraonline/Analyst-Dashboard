# Social Analytics & Omnichannel Performance Dashboard

A full-stack, client-presentation social intelligence dashboard that tracks multi-channel performance across **Instagram, Facebook, YouTube, LinkedIn, WhatsApp Marketing, and Website Audits** with **1-Click Live Google Sheet Sync**.

---

## 📁 Project Structure

```
Dashboard/
├── client/                     # Frontend Application (React 19 + Vite)
│   ├── public/                 # Logos, favicon, static icons
│   ├── src/
│   │   ├── assets/             # Images & design assets
│   │   ├── components/         # Layout & Presentation components
│   │   │   ├── common/         # Social channel icons
│   │   │   ├── layout/         # Sidebar, Navbar, App Layout
│   │   │   └── presentation/   # MetricCard, SocialSpreadsheetTable
│   │   ├── context/            # DashboardContext (state, projects, sync)
│   │   ├── data/               # Master sample datasets
│   │   ├── utils/              # excelParser.js, googleSheetSync.js
│   │   ├── views/              # Overview, Instagram, Admin, etc.
│   │   ├── App.jsx             # Main router
│   │   ├── index.css           # Global design system & theme tokens
│   │   └── main.jsx            # Frontend entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Backend API Service (Node.js + Express)
│   ├── src/
│   │   ├── routes/
│   │   │   └── api.js          # API endpoints (/api/health, /api/sync-sheet)
│   │   ├── services/
│   │   │   └── sheetSyncService.js # Google Sheet sync service
│   │   └── index.js            # Express server entry point
│   └── package.json
│
├── package.json                # Root package.json with convenience scripts
└── README.md
```

---

## 🚀 Running the Project

### Option A: From the Root Directory
```bash
# Start the Frontend
npm run dev

# Start the Backend Server
npm run dev:server

# Build the Frontend Production Bundle
npm run build
```

### Option B: From the `client/` Folder
```bash
cd client
npm run dev
```

---

## 🌟 Key Features

1. **Per-Project Google Sheet Live Sync**:
   * Attach a dedicated Google Sheet URL to each project.
   * Click **"Sync Live Sheet Now 🔄"** to fetch and update all tabs in real-time.
   * Zero OAuth / API tokens needed — simply set sheet sharing to *"Anyone with the link can view"*.

2. **Multi-Tab Architecture**:
   * Reads multiple tabs in one sheet (`Instagram`, `Facebook`, `YouTube`, `WhatsApp`, `Website Audits`, etc.) simultaneously.

3. **Dynamic Custom Verticals**:
   * Add and configure any custom marketing vertical (e.g. WhatsApp, Website, SEO) with automatic sidebar links and dedicated performance pages.
