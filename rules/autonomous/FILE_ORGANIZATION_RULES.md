# File Organization Rules

## Project Structure

```
project-root/
├── src/
│   ├── api/              # API routes and handlers
│   ├── services/         # Business logic
│   ├── models/           # Data models
│   ├── utils/            # Helper functions
│   ├── types/            # TypeScript types
│   ├── middleware/       # Express middleware
│   ├── config/           # Configuration
│   └── index.ts          # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom hooks
│   │   ├── utils/        # Frontend utilities
│   │   ├── styles/       # CSS/SCSS
│   │   └── App.tsx       # Main app
│   └── public/           # Static assets
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
├── scripts/              # Automation scripts
├── docs/                 # Documentation
├── config/               # Config files
├── prisma/               # Database schema
├── rules/                # Agent rules
└── clones/               # Output directory
```

## Naming Conventions

### Files
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserProfile.tsx` |
| Utilities | camelCase | `formatDate.ts` |
| Constants | SCREAMING_SNAKE | `API_CONSTANTS.ts` |
| Types | PascalCase | `UserTypes.ts` |
| Tests | *.test.ts | `auth.test.ts` |
| Config | kebab-case | `eslint-config.js` |

### Directories
- All lowercase
- Use hyphens for multi-word: `user-management/`
- Group by feature or layer

## File Size Limits

| File Type | Max Lines | Action If Exceeded |
|-----------|-----------|-------------------|
| Component | 300 | Split into smaller components |
| Service | 500 | Split by domain |
| Utility | 200 | Split by function category |
| Test file | 500 | Split by test category |
| Config | 100 | Use separate configs |

## When to Create New Files

### Create New File When:
- Function exceeds 100 lines
- Class has single responsibility
- Component can be reused
- Utility is used in multiple places
- Test covers different feature

### Don't Create New File When:
- Just a few lines of code
- Only used once
- Tightly coupled to existing code
- Would create circular dependency

## Import Organization

```typescript
// 1. Node built-ins
import fs from 'fs';
import path from 'path';

// 2. External packages (alphabetical)
import express from 'express';
import { PrismaClient } from '@prisma/client';

// 3. Internal absolute imports
import { UserService } from '@/services/UserService';
import { logger } from '@/utils/logger';

// 4. Relative imports (parent first, then siblings)
import { ParentComponent } from '../ParentComponent';
import { SiblingUtil } from './siblingUtil';

// 5. Types (always last)
import type { User } from '@/types';
```

## Forbidden Locations

### Never Put In Root:
- Source code files
- Test files
- Temporary files
- Log files
- Cache files

### Never Commit:
- node_modules/
- .env (only .env.example)
- dist/ or build/
- *.log files
- .DS_Store
- coverage/
- .cache/

## Cleanup Rules

### Delete When:
- File not imported anywhere
- Commented out for > 1 week
- Duplicate functionality
- Test for deleted code
- Old backup files

### Archive When:
- Might need later
- Reference implementation
- Historical significance
