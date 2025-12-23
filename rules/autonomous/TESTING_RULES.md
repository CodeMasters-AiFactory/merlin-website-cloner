# Testing & Verification Rules

## Testing Hierarchy

### Level 1: Syntax Check (Always)
- Code compiles without errors
- No TypeScript errors
- No linting errors
- Imports resolve correctly

### Level 2: Unit Test (For Logic)
- Pure functions tested
- Edge cases covered
- Error cases handled
- Mock external dependencies

### Level 3: Integration Test (For Features)
- API endpoints work
- Database operations succeed
- Services communicate correctly
- Authentication flows work

### Level 4: E2E Test (For User Flows)
- Full user journey works
- UI renders correctly
- Forms submit properly
- Navigation works

### Level 5: Manual Verification (For Critical)
- Open browser and test
- Verify visually
- Test as real user would
- Screenshot evidence

## When to Test What

| Change Type | Required Tests |
|-------------|----------------|
| New function | Unit test |
| Bug fix | Test that reproduces bug |
| API endpoint | Integration test |
| UI component | Visual verification |
| Auth change | Full E2E test |
| Database change | Migration + integration |
| Config change | Service startup test |

## Test Commands

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- path/to/test.ts

# Run with coverage
npm run test -- --coverage

# Run E2E tests
npm run test:e2e

# Run in watch mode
npm run test -- --watch
```

## Verification Checklist

### Before Marking Feature Complete
- [ ] Code compiles without errors
- [ ] All existing tests pass
- [ ] New tests added for new code
- [ ] Manual verification done
- [ ] No console errors in browser
- [ ] API returns correct responses
- [ ] Database state is correct
- [ ] Logs show no errors

### For API Changes
- [ ] Endpoint responds with correct status
- [ ] Response body matches expected
- [ ] Error cases return proper errors
- [ ] Authentication works if required
- [ ] Rate limiting applied if needed

### For UI Changes
- [ ] Component renders
- [ ] Interactions work (clicks, inputs)
- [ ] Loading states show
- [ ] Error states show
- [ ] Mobile responsive (if applicable)

### For Database Changes
- [ ] Migrations run successfully
- [ ] Data integrity maintained
- [ ] Queries perform acceptably
- [ ] Rollback possible

## Evidence Requirements

For each completed feature, have:
1. **Test output** - Screenshot or log of passing tests
2. **API response** - curl output or Postman screenshot
3. **Browser screenshot** - If UI involved
4. **Database state** - If data changed

## Never Do

- Mark complete without testing
- Delete failing tests
- Skip tests "because it's simple"
- Test only happy path
- Assume it works because it compiled
- Test in production
- Commit with failing tests
