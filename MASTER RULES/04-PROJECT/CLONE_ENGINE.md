# Clone Engine - 120% Advanced Features

## Overview

Merlin Website Cloner is the **#1 website cloner in the world** with features no competitor has.

---

## Core Services Architecture

```
src/services/
├── websiteCloner.ts          ← Main orchestrator
├── advancedFeatures.ts       ← 120% features integration
│
├── RESUME SYSTEM
│   └── resumeManager.ts      ← Checkpoint/resume (HTTrack parity)
│
├── MULTI-BROWSER
│   └── multiBrowserEngine.ts ← Puppeteer + Playwright unified
│
├── ANTI-DETECTION
│   ├── fingerprintGenerator.ts  ← 100k+ real fingerprints
│   ├── behavioralSimulation.ts  ← Mouse/scroll/typing simulation
│   └── stealthMode.ts           ← WebDriver detection bypass
│
├── AUTHENTICATION
│   └── authCloner.ts         ← Cookies, OAuth, 2FA support
│
├── EXPORT FORMATS
│   ├── waczExporter.ts       ← Library of Congress standard
│   └── exportFormats.ts      ← ZIP, TAR, MHTML, WARC
│
├── API SERVICE
│   └── cloneApiService.ts    ← REST API with webhooks
│
└── LEARNING SYSTEM
    └── learningSystem.ts     ← AI learns from clone experiences
```

---

## Feature Matrix

| Feature | HTTrack | WebCopy | Scrapy | **MERLIN** |
|---------|---------|---------|--------|------------|
| Static sites | Yes | Yes | Yes | **Yes** |
| JavaScript/SPA | No | No | No | **Yes** |
| Anti-bot bypass | No | No | Basic | **Advanced** |
| Resume downloads | Yes | Yes | N/A | **Yes** |
| Multi-browser | No | No | No | **Yes (4)** |
| Authentication | Limited | Limited | Manual | **Full (2FA)** |
| Real fingerprints | No | No | No | **Yes (100k+)** |
| WACZ/Archive | No | No | No | **Yes** |
| REST API | No | No | Yes | **Yes** |
| Learning AI | No | No | No | **Yes** |

---

## How to Use Advanced Features

### Resume Manager

```typescript
import { createResumeManager } from './resumeManager.js';

const manager = createResumeManager(outputDir);
const result = await manager.checkForResume();

if (result.canResume) {
  manager.restoreCheckpoint(result.checkpoint);
  const pendingUrls = manager.getPendingUrls();
  // Continue from where we left off
}
```

### Multi-Browser Engine

```typescript
import { createMultiBrowserEngine } from './multiBrowserEngine.js';

const engine = createMultiBrowserEngine({
  preferredEngine: 'puppeteer',
  fallbackEngines: ['playwright-firefox', 'playwright-webkit'],
  autoFallback: true,
});

const { browser, engine: usedEngine, id } = await engine.launch();
```

### Fingerprint Generation

```typescript
import { generateFromProfile, injectFingerprintPuppeteer } from './fingerprintGenerator.js';

const fingerprint = await generateFromProfile('desktop');
await injectFingerprintPuppeteer(page, fingerprint);
```

### Authentication Cloning

```typescript
import { createAuthCloner } from './authCloner.js';

const cloner = createAuthCloner();

// From cookie file
await cloner.applyAuth(page, { cookieFile: './cookies.json' });

// Automated login with 2FA
await cloner.performLogin(page, {
  credentials: { username: 'user', password: 'pass' },
  twoFactorCallback: async () => prompt('Enter 2FA code:'),
});
```

### WACZ Export

```typescript
import { exportCloneToWACZ } from './waczExporter.js';

const result = await exportCloneToWACZ(
  './clone-output',
  'https://example.com',
  './archive.wacz'
);
```

### REST API

```typescript
import { initializeCloneApi } from './cloneApiService.js';

const apiService = initializeCloneApi(app, '/api/v1/clone');
apiService.setCloneHandler(async (job) => {
  // Execute clone
  return { outputPath, pagesCloned, ... };
});
```

---

## Quality Standards

### Clone Score Requirements
- **90%+** visual fidelity to original
- **100%** internal links working
- **100%** assets downloaded locally
- CSS styling fully preserved
- JavaScript functionality preserved where possible

### Testing Protocol
1. Run clone on target URL
2. Check verification score (must be 90%+)
3. Open in browser for visual comparison
4. Test internal navigation
5. Verify asset loading

---

## Anti-Detection Best Practices

1. **Always use fingerprints** - Real browser fingerprints prevent detection
2. **Rotate user agents** - Match fingerprint to UA
3. **Behavioral simulation** - Mouse/scroll patterns matter
4. **Time-of-day awareness** - Browse like a human
5. **Session consistency** - Keep same fingerprint per session

---

## Error Handling

| Error Type | Recovery |
|------------|----------|
| Protocol timeout | Increase protocolTimeout, reduce concurrency |
| Target closed | Add delays, reduce parallelism |
| Anti-bot detected | Switch browser engine, new fingerprint |
| Network timeout | Use resume manager, retry |
| Memory exhausted | Reduce concurrency, enable incremental |

---

**Version:** 120% Upgrade Complete
**Date:** 2024-12-26
