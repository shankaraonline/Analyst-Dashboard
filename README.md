# ViewPoint — Social Analytics & Omnichannel Performance Dashboard

A full-stack, client-presentation social intelligence dashboard that tracks multi-channel performance across **Instagram, Facebook, YouTube, LinkedIn, WhatsApp Marketing, and Website Audits** with **1-Click Live Google Sheet Sync** and **MongoDB Atlas cloud persistence**.

---

## 📁 Project Structure

```
Dashboard/
├── client/                      # Frontend Application (React 19 + Vite)
│   ├── public/                  # Logos, favicon, static icons
│   ├── src/
│   │   ├── assets/              # Images & design assets
│   │   ├── components/          # Layout & Presentation components
│   │   │   ├── common/          # Social channel icons
│   │   │   ├── layout/          # Sidebar, Navbar, App Layout
│   │   │   ├── export/          # PdfExportModal
│   │   │   └── presentation/    # MetricCard, UniversalSpreadsheetTable
│   │   ├── context/             # DashboardContext (state, projects, sync)
│   │   ├── data/                # Master sample datasets
│   │   ├── utils/               # excelParser.js, googleSheetSync.js, computeTabKpiCards.js
│   │   ├── views/               # Overview, Instagram, Admin, etc.
│   │   ├── App.jsx              # Main router
│   │   ├── index.css            # Global design system & theme tokens
│   │   └── main.jsx             # Frontend entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/                      # Backend API Service (Node.js + Express)
│   ├── src/
│   │   ├── routes/
│   │   │   └── api.js           # API endpoints (/api/health, /api/sync-sheet, /api/projects)
│   │   ├── services/
│   │   │   └── sheetSyncService.js  # Google Sheet sync service
│   │   ├── db.js                # MongoDB connection (reads from .env)
│   │   └── index.js             # Express server entry point
│   ├── .env                     # ⚠️ NOT committed — create from .env.example
│   ├── .env.example             # Template — safe to commit
│   └── package.json
│
├── .gitignore
├── package.json                 # Root package.json with npm workspace scripts
└── README.md
```

---

## ⚙️ Environment Setup

The server requires a `.env` file inside the `server/` folder. **Never commit real credentials.**

### Step 1 — Copy the example file
```bash
cp server/.env.example server/.env
```

### Step 2 — Fill in your values

Open `server/.env` and set your MongoDB connection:

```env
PORT=5000

# Option A: MongoDB Atlas (Cloud) — use for production & live data
MONGODB_URI=mongodb+srv://<your-username>:<your-password>@<your-cluster>.mongodb.net/ViewPoint?retryWrites=true&w=majority

# Option B: Local MongoDB Compass — uncomment for offline testing
# MONGODB_URI=mongodb://127.0.0.1:27017/ViewPoint
```

> **Note**: Your actual Atlas URI is private. Get it from your MongoDB Atlas project under  
> **Connect → Drivers → Node.js** and paste it in `.env` only. Never paste it in code or README.

---

## 🚀 Running the Project

### Option A: From the Root Directory (Recommended)
```bash
# Install all dependencies (client + server)
npm install

# Start Frontend (Vite dev server on port 5173)
npm run dev

# Start Backend Server (Express on port 5000)
npm run dev:server
```

### Option B: From individual folders
```bash
# Frontend
cd client && npm run dev

# Backend
cd server && npm run dev
```

### Production Build
```bash
npm run build
```

---

## 🌟 Key Features

1. **Per-Project Google Sheet Live Sync**
   - Attach a dedicated Google Sheet URL to each project.
   - Click **"Sync Live Sheet Now 🔄"** to fetch and update all tabs in real-time.
   - Zero OAuth / API tokens needed — set sheet sharing to *"Anyone with the link can view"*.

2. **MongoDB Atlas Cloud Persistence**
   - All projects, tabs, and synced data are saved to MongoDB Atlas.
   - Supports offline/fallback mode automatically when DB is unreachable.

3. **Omnichannel Overview (Top 4 KPIs per Tab)**
   - Automatically selects the 4 most impactful metrics per platform tab.
   - Displayed as cards in a clean 4-column grid on the Omnichannel dashboard.

4. **Multi-Tab Architecture**
   - Reads multiple tabs in one sheet (`Instagram`, `Facebook`, `YouTube`, `WhatsApp`, `Website Audits`, etc.) simultaneously.

5. **PDF Export**
   - One-click download of the full report as a print-optimized PDF.
   - Clean page breaks, portrait/landscape support, suppressed browser headers.

6. **Dynamic Custom Verticals**
   - Add any custom marketing channel (e.g. WhatsApp, SEO, OTT) with automatic sidebar links and dedicated performance pages.

---

## 🔐 Security Notes

- `.env` is listed in `.gitignore` — it will **never** be committed to Git.
- All secrets (MongoDB URI, API keys) must live only in `server/.env`.
- Use `server/.env.example` as a safe, committed template for other contributors.
