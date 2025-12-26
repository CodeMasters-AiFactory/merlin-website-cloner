# Merlin Website Builder Rules

## Project Overview

**Product:** Merlin Website Wizard - AI-powered website generator
**Version:** Merlin 8.0
**Status:** Active (only service running)

---

## What Merlin Does

1. User provides business details
2. System loads Industry DNA (colors, fonts, style)
3. Leonardo AI generates custom images
4. HTML/CSS website is generated
5. User previews and downloads

---

## Key Files

| File | Purpose |
|------|---------|
| `server/engines/merlin8/orchestrator.ts` | Main generation logic |
| `server/engines/merlin8/industryDNA.ts` | Industry profiles |
| `server/engines/merlin8/htmlGenerator.ts` | HTML/CSS generation |
| `server/engines/merlin8/leonardoIntegration.ts` | Leonardo AI images |
| `client/components/QuickIntake.tsx` | User intake form |
| `client/components/GeneratingProgress.tsx` | Progress display |

---

## Current Status

### Completed
- Merlin 8.0 engine (orchestrator, HTML generator, Leonardo AI)
- Industry DNA system (10 industries)
- Build choice UI (template vs scratch)
- Quick intake form
- SSE progress streaming

### In Progress
- Enhanced progress display (task-by-task feedback)
- End-to-end testing
- 44 more industries to add

### Pending
- PostgreSQL database setup
- Docker deployment
- Template gallery UI

---

## Rules

### Generator
- **USE ONLY:** Merlin Design LLM v6.x
- **DO NOT USE:** Sterling, Unified, or other generators

### Services
- **ONLY:** Merlin Website Wizard is active
- **REMOVED:** Stargate IDE, PANDORA, Quantum Core, Regis Core, Nero Core, Titan

---

## User Flow

```
1. Home -> "Merlin Websites"
2. Select Package (Essential/Professional/SEO/Deluxe/Ultra)
3. Select Site Type (Personal/Business/Corporate/E-commerce)
4. Choose Mode (Auto/Guided)
5. Fill Project Overview
6. Complete Business Details
7. Add Services/Products
8. Complete Branding
9. Generate -> View Progress -> Download
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/merlin8/industries` | GET | List all industries |
| `/api/merlin8/industry/:id` | GET | Get industry DNA |
| `/api/merlin8/generate` | POST | Generate website (SSE) |
| `/api/merlin8/generate-sync` | POST | Generate website (JSON) |

---

## Quality Standards

### Generated Websites Must Have:
- Responsive design (mobile-first)
- Professional styling
- Readable text (proper contrast)
- Working navigation
- No lorem ipsum (real content)
- Industry-appropriate colors/fonts

### What Makes a Good Website:
1. Industry DNA is correct
2. Images are relevant
3. Text is readable on images
4. Colors are professional
5. Layout is clean
6. Mobile works well

---

## Testing Merlin

When testing "Create from Scratch":
1. Select a package
2. Choose a site type
3. Pick an industry
4. Fill in business details
5. Complete the wizard
6. Verify generation works
7. Check output quality

---

## Known Good Example

**F1 Racing Site** (Phoenix Racing Team)
- Industry: Racing
- Colors: Deep black, racing red, metallic silver
- Fonts: Bold geometric headings
- Style: High-speed, premium, technical
- Result: Professional, visually stunning

Use this as the quality benchmark.
