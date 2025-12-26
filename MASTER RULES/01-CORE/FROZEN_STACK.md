# Frozen Stack - DO NOT CHANGE

## Technology Stack

These technologies are LOCKED. Do not suggest alternatives.

### Operating System
- **Windows 10 Pro**

### Runtime & Package Manager
- **Node.js LTS** (current)
- **npm** (no yarn, no pnpm, no bun)

### Frontend
- **React 18.3.1**
- **Vite 5.4.21**
- **TypeScript 5.6.3**
- **TailwindCSS**
- **shadcn/ui**

### Backend
- **Express 4.21.2**
- **Drizzle ORM**
- **PostgreSQL**

### AI Services
- **Leonardo AI** - Image generation
- **Merlin Design LLM v6.x** - Website generation

---

## Project Rules

### Generator
- USE ONLY: **Merlin Design LLM v6.x**
- DO NOT use: Sterling, Unified, or other generators

### Services
- ONLY: **Merlin Website Wizard** is active
- REMOVED: Stargate IDE, PANDORA, Quantum Core, Regis Core, Nero Core, Titan services

---

## Commands

### Start Development
```powershell
cd "C:\CURSOR PROJECTS\StargatePortal"
npm run dev
```

### Build
```powershell
npm run build
```

### Health Check
```powershell
curl http://localhost:5000/api/health
```

---

## Project Location

- **Path**: `C:\CURSOR PROJECTS\StargatePortal` (NOT C:\StargatePortal)
- **Local URL**: http://localhost:5000
- **Azure**: https://stargate-linux.azurewebsites.net/

---

## PowerShell Notes

Use semicolons for command chaining (not &&):
```powershell
# Correct
cd "C:\CURSOR PROJECTS\StargatePortal"; npm run dev

# Wrong (bash syntax)
cd "C:\CURSOR PROJECTS\StargatePortal" && npm run dev
```

Paths with spaces need quotes:
```powershell
cd "C:\CURSOR PROJECTS\StargatePortal"
```

---

**DO NOT propose changing any of these technologies.**
