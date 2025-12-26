# Verification Log

## Purpose

Track all verifications performed during sessions.

---

## Log Format

```markdown
## VERIFICATION: [Date] [Time]

**Change:** [What was changed]
**Method:** [How verified]
**Result:** PASS / FAIL

### Details:
- Console errors: None / [List]
- Visual issues: None / [List]
- Functionality: Working / [Issues]

### Screenshot: [If applicable]

---
```

---

## Example Entries

### 2024-12-26 14:30 - Hero Image Fix

**Change:** Fixed text contrast on hero images
**Method:** Browser visual inspection + console check
**Result:** PASS

### Details:
- Console errors: None
- Visual issues: None
- Functionality: Text now readable on all backgrounds

---

### 2024-12-26 15:00 - Form Validation

**Change:** Added validation to intake form
**Method:** Manual form submission + error testing
**Result:** PASS

### Details:
- Console errors: None
- Visual issues: None
- Functionality: All validation messages display correctly

---

## How to Add Entries

After each verification:

1. Note the date/time
2. Describe what changed
3. Describe how you verified
4. Record the result
5. List any issues found

---

## Verification Methods

| Method | When to Use |
|--------|-------------|
| Visual inspection | UI changes |
| Console check | Any code change |
| Form submission | Form changes |
| API test | Backend changes |
| Full flow test | Major changes |
| Screenshot | UI bugs |

---

## Tracking Patterns

### Good Pattern
- Change -> Verify -> Log -> Continue

### Bad Pattern
- Change -> Change -> Change -> "It should work"

---

## Monthly Summary Template

```markdown
## Month: [Month Year]

**Total Verifications:** X
**Pass Rate:** X%
**Common Issues:** [List]

| Week | Verifications | Pass | Fail |
|------|---------------|------|------|
| 1 | X | X | X |
| 2 | X | X | X |
| 3 | X | X | X |
| 4 | X | X | X |
```
