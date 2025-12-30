# Frozen Stack - DO NOT CHANGE

## Technology Stack

These technologies are LOCKED. Do not suggest alternatives.

### Operating System
- **Windows 10/11 Pro**

### Runtime & Package Manager
- **Node.js LTS** (current)
- **npm** (no yarn, no pnpm, no bun)

### Frontend
- **React 18.x**
- **Vite 5.x**
- **TypeScript 5.x**
- **TailwindCSS**

### Backend
- **Express 4.x**
- **TypeScript**
- **SQLite** (via better-sqlite3)

### Browser Automation (CORE)
- **Puppeteer** - Primary browser engine
- **Playwright** - Multi-browser support (Chrome, Firefox, Safari, Edge)

### Anti-Detection Stack (120% UPGRADE)
- **fingerprint-generator** - 100k+ real browser fingerprints
- **fingerprint-injector** - Fingerprint injection
- **crawlee** - Advanced crawling framework

### Export & Archive
- **archiver** - ZIP/WACZ creation
- **sharp** - Image optimization

### Utility Libraries
- **p-limit** - Concurrency control
- **cheerio** - HTML parsing

---

## Project Rules

### Clone Engine Services
Located in `src/services/`:
- **websiteCloner.ts** - Main cloner orchestrator
- **resumeManager.ts** - Checkpoint/resume system
- **multiBrowserEngine.ts** - Puppeteer + Playwright unified
- **fingerprintGenerator.ts** - Real fingerprint generation
- **authCloner.ts** - Authentication cloning (2FA, OAuth)
- **waczExporter.ts** - WACZ archive format
- **cloneApiService.ts** - REST API service
- **advancedFeatures.ts** - Integration module

### Learning System
- **learningSystem.ts** - AI that learns from clone experiences
- **merlin-learning.json** - Persistent learning data

---

## Commands

### Start Development
```powershell
cd "C:\Cursor Projects\Mirror Site"
npm run dev
```

### Build
```powershell
npm run build
```

### Run Clone Test
```powershell
npx tsx src/test/quick-test.ts
```

### Health Check
```powershell
curl http://localhost:3000/api/health
```

---

## Project Location

- **Path**: `C:\Cursor Projects\Mirror Site`
- **Backend URL**: http://localhost:3000
- **Frontend URL**: http://localhost:5173

---

## PowerShell Notes

Use semicolons for command chaining (not &&):
```powershell
# Correct
cd "C:\Cursor Projects\Mirror Site"; npm run dev

# Wrong (bash syntax)
cd "C:\Cursor Projects\Mirror Site" && npm run dev
```

Paths with spaces need quotes:
```powershell
cd "C:\Cursor Projects\Mirror Site"
```

---

**DO NOT propose changing any of these technologies.**
