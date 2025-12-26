# Code Quality Standards

## Core Principles

1. **Production-Grade Only** - No shortcuts, no hacks
2. **Comprehensive Error Handling** - Catch and handle everything
3. **Proper Logging** - Know what's happening
4. **TypeScript Strict Mode** - Type everything
5. **No Magic** - Explicit over implicit

---

## Code Structure

### File Organization
```
src/
├── components/        # React components
├── hooks/             # Custom hooks
├── services/          # API calls, business logic
├── utils/             # Pure utility functions
├── types/             # TypeScript types
└── constants/         # Constants and config
```

### Function Length
- Max 50 lines per function
- Split into smaller functions if longer
- Each function does ONE thing

### File Length
- Max 300 lines per file
- Split into multiple files if longer
- Group related code together

---

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `QuickIntake` |
| Functions | camelCase | `generateWebsite` |
| Variables | camelCase | `industryData` |
| Constants | SCREAMING_SNAKE | `MAX_RETRIES` |
| Types/Interfaces | PascalCase | `IndustryDNA` |
| Files (component) | PascalCase | `QuickIntake.tsx` |
| Files (utility) | camelCase | `htmlGenerator.ts` |

---

## Comments

### When to Comment:
- Complex business logic
- Non-obvious decisions
- Workarounds (with TODO to fix)
- API documentation

### When NOT to Comment:
- Obvious code
- Self-documenting names
- Every function

### Comment Format:
```typescript
// Single line for quick notes

/**
 * Multi-line for complex explanations
 * or function documentation
 */
```

---

## Error Messages

### Good:
```typescript
throw new Error(`[Merlin] Industry "${industryId}" not found in DNA database`);
```

### Bad:
```typescript
throw new Error("Error");
```

---

## Logging

```typescript
// Use prefixes for easy filtering
console.log('[Merlin] Starting generation...');
console.error('[Merlin] Failed to generate image:', error);
console.warn('[Merlin] Using fallback image');
```

---

## Forbidden Practices

- `any` type without justification
- `// @ts-ignore` without comment
- Commented-out code in commits
- Magic numbers/strings
- console.log in production
- Inline styles
- DOM manipulation outside React

---

## Required Practices

- Error boundaries
- Loading states
- Null checks
- Input validation
- Proper TypeScript types
- Consistent formatting

---

## Performance

- Memoize expensive computations
- Lazy load non-critical components
- Debounce user input
- Optimize images
- No blocking operations

---

## Security

- Validate all user input
- Sanitize output
- No secrets in code
- HTTPS only
- Proper CORS config

---

## Review Checklist

Before considering code "done":

- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Proper error handling
- [ ] Appropriate logging
- [ ] Tested manually
- [ ] Mobile-responsive
- [ ] Performance acceptable
