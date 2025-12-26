# TypeScript/React Standards

## File Naming

- Components: `PascalCase.tsx` (e.g., `QuickIntake.tsx`)
- Utilities: `camelCase.ts` (e.g., `htmlGenerator.ts`)
- Types: `types.ts` or inline
- Tests: `*.test.ts` or `*.spec.ts`

---

## Component Structure

```typescript
/**
 * ═══════════════════════════════════════════════════════════════════
 * COMPONENT NAME - Brief Description
 * ═══════════════════════════════════════════════════════════════════
 */

import React from 'react';
// imports...

interface Props {
  // typed props
}

export default function ComponentName({ prop1, prop2 }: Props) {
  // hooks first
  const [state, setState] = useState();

  // effects
  useEffect(() => {}, []);

  // handlers
  const handleClick = () => {};

  // render
  return (
    <div>...</div>
  );
}
```

---

## Error Handling

```typescript
try {
  const result = await apiCall();
  // handle success
} catch (error) {
  console.error('[Module Name] Error:', error);
  // user-friendly error handling
}
```

---

## Import Order

1. React/Node built-ins
2. External packages
3. Internal modules
4. Types
5. Styles

```typescript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui';
import { UserType } from '@/types';
import './styles.css';
```

---

## Typing Rules

- Always type function parameters
- Always type return values for public functions
- Use interfaces for objects
- Use type for unions/intersections
- Avoid `any` - use `unknown` if needed

```typescript
// Good
function processData(input: InputType): OutputType {
  return result;
}

// Bad
function processData(input: any): any {
  return result;
}
```

---

## React Best Practices

### State Management
- Use local state for UI state
- Use context for shared state
- Avoid prop drilling (use context)

### Effects
- Always include dependencies
- Clean up subscriptions
- Avoid async directly in useEffect

```typescript
useEffect(() => {
  const controller = new AbortController();

  async function fetchData() {
    try {
      const result = await fetch(url, { signal: controller.signal });
      setData(result);
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(error);
      }
    }
  }

  fetchData();

  return () => controller.abort();
}, [url]);
```

### Memoization
- Use useMemo for expensive calculations
- Use useCallback for callbacks passed to children
- Don't over-optimize

---

## Forbidden Patterns

- No `any` types without justification
- No `// @ts-ignore` without comment
- No inline styles (use Tailwind)
- No console.log in production code
- No magic numbers/strings (use constants)

---

## Required Patterns

- Error boundaries around major sections
- Loading states for async operations
- Proper TypeScript strict mode
- Exhaustive switch statements
