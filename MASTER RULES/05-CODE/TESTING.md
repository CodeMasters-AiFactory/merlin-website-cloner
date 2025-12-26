# Testing Requirements

## Before Marking ANY Feature Complete

### Frontend Checklist
- [ ] Component renders without errors
- [ ] All user interactions work
- [ ] Mobile responsive
- [ ] Loading states shown
- [ ] Error states handled
- [ ] Console is clean

### Backend Checklist
- [ ] API endpoint returns correct data
- [ ] Error responses are proper JSON
- [ ] No console errors
- [ ] File operations complete successfully

### Full Flow Checklist
- [ ] End-to-end test passes
- [ ] Generated output is correct
- [ ] Files saved to correct location
- [ ] Can preview generated website

---

## Test Types

### Unit Tests
- Test individual functions
- Mock dependencies
- Fast, isolated

### Integration Tests
- Test component + API together
- Real database (test instance)
- Verify data flow

### E2E Tests
- Full user journey
- Browser automation
- Verify complete flow

---

## Testing Commands

```powershell
npm run test           # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage
```

---

## Manual Testing Protocol

When testing Merlin manually:

1. **Start Fresh**
   - Clear localStorage
   - Restart server
   - Fresh browser tab

2. **Happy Path**
   - Complete wizard with valid data
   - Verify generation works
   - Check output quality

3. **Error Path**
   - Try empty fields
   - Try invalid data
   - Verify error messages

4. **Edge Cases**
   - Very long company names
   - Special characters
   - Multiple services

---

## Testing Merlin Wizard

### Full Flow Test:
1. Home -> "Merlin Websites"
2. Select package
3. Select site type
4. Choose Auto mode
5. Fill Project Overview
6. Complete Business Details
7. Add services
8. Complete Branding
9. Generate
10. Verify result

### Things to Check:
- [ ] All dropdowns work
- [ ] Form validation works
- [ ] Progress displays correctly
- [ ] Images generate
- [ ] Website preview works
- [ ] Download works

---

## What Makes a Test Pass

### For UI:
- Renders without crash
- User can interact
- Shows appropriate feedback
- Handles errors gracefully

### For API:
- Returns correct status code
- Returns correct data shape
- Handles errors properly
- Doesn't expose sensitive info

### For Generation:
- Creates valid HTML
- Images are included
- Styling is correct
- Mobile-responsive

---

## Test Coverage Goals

| Area | Target |
|------|--------|
| Critical paths | 100% |
| API endpoints | 80% |
| UI components | 70% |
| Utilities | 90% |

---

## When to Write Tests

- Before fixing a bug (prove it exists)
- When adding new API endpoints
- When adding complex logic
- When behavior is important

---

## When Tests Fail

1. Read the error message
2. Understand what failed
3. Fix the code (not the test, unless test is wrong)
4. Verify fix
5. Commit both code and test
