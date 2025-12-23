# Refactoring Rules

## When to Refactor

### Refactor NOW
- Code you're about to modify
- Duplicated code (3+ occurrences)
- Functions > 50 lines
- Files > 300 lines
- Obvious code smells

### Refactor LATER (Document)
- Working code you're not touching
- Large architectural changes
- When deadline is tight
- Performance optimizations (measure first)

### Don't Refactor
- Code that works and isn't being touched
- Without tests in place
- Multiple areas at once
- When you don't understand the code

## Refactoring Checklist

### Before Refactoring
- [ ] Tests exist and pass
- [ ] Understand current behavior
- [ ] Small, incremental changes planned
- [ ] Git commit of current state

### During Refactoring
- [ ] One refactoring at a time
- [ ] Run tests after each change
- [ ] Commit frequently
- [ ] Keep behavior identical

### After Refactoring
- [ ] All tests pass
- [ ] Code is cleaner
- [ ] No new bugs introduced
- [ ] Performance not degraded
- [ ] Documented if pattern changed

## Common Refactorings

### Extract Function
```typescript
// BEFORE
function processUser(user: User) {
  // 50 lines of validation
  // 30 lines of transformation
  // 20 lines of saving
}

// AFTER
function processUser(user: User) {
  validateUser(user);
  const transformed = transformUser(user);
  saveUser(transformed);
}
```

### Extract Variable
```typescript
// BEFORE
if (user.age >= 18 && user.country === 'US' && user.verified) {
  // ...
}

// AFTER
const isEligible = user.age >= 18 && user.country === 'US' && user.verified;
if (isEligible) {
  // ...
}
```

### Replace Magic Numbers
```typescript
// BEFORE
if (retries > 3) { ... }
setTimeout(fn, 86400000);

// AFTER
const MAX_RETRIES = 3;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
if (retries > MAX_RETRIES) { ... }
setTimeout(fn, ONE_DAY_MS);
```

### Simplify Conditionals
```typescript
// BEFORE
function getDiscount(user: User): number {
  if (user.isPremium) {
    if (user.years > 5) {
      return 0.2;
    } else {
      return 0.1;
    }
  } else {
    return 0;
  }
}

// AFTER
function getDiscount(user: User): number {
  if (!user.isPremium) return 0;
  return user.years > 5 ? 0.2 : 0.1;
}
```

### Remove Duplication
```typescript
// BEFORE
function validateEmail(email: string) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
function checkEmail(email: string) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// AFTER
function isValidEmail(email: string): boolean {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return EMAIL_REGEX.test(email);
}
```

## Code Smells to Fix

### Critical (Fix Immediately)
- Duplicated code
- Long methods (> 50 lines)
- Large classes (> 500 lines)
- Long parameter lists (> 4)
- Deeply nested code (> 3 levels)

### High (Fix When Touching)
- Comments explaining bad code
- Dead code
- Magic numbers/strings
- Inconsistent naming
- Mixed abstraction levels

### Medium (Track for Later)
- Feature envy
- Data clumps
- Primitive obsession
- Parallel inheritance
- Lazy class

## Safe Refactoring Process

### Step by Step
1. Write test for current behavior (if missing)
2. Make one small change
3. Run tests
4. If green, commit
5. If red, revert
6. Repeat

### Risky Refactorings (Extra Care)
- Changing public APIs
- Modifying database access
- Changing authentication
- Modifying core algorithms
- Cross-cutting concerns

## Never Do

- Refactor without tests
- Multiple refactorings at once
- Change behavior while refactoring
- Refactor and add features together
- Refactor under time pressure
- Refactor code you don't understand
