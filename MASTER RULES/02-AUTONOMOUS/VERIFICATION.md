# Verification Rules

## Core Principle

**NEVER claim something works without ACTUALLY verifying it.**

---

## Verification Protocol

After ANY code change:

```
1. npm run build
2. Restart server if needed
3. Navigate browser to localhost:5000
4. Take screenshot
5. Check console for errors
6. Report: "Verified - [what I saw]"
```

---

## What to Verify

### Frontend Changes
- [ ] Component renders without errors
- [ ] All user interactions work
- [ ] Mobile responsive
- [ ] Loading states shown
- [ ] Error states handled
- [ ] Console is clean

### Backend Changes
- [ ] API endpoint returns correct data
- [ ] Error responses are proper JSON
- [ ] No server console errors
- [ ] File operations complete successfully

### Full Flow
- [ ] End-to-end test passes
- [ ] Generated output is correct
- [ ] Files saved to correct location
- [ ] Can preview generated website

---

## Handle Cache Programmatically

**NEVER ask user to "clear cache" or "hard refresh"**

Do this instead:
- `localStorage.clear()` in browser console
- Cache-busting URLs (add ?v=timestamp)
- Server restart
- Force new browser tab

---

## Verification Report Format

```
## VERIFICATION REPORT

**Change:** [What was changed]
**Time:** [Timestamp]

### Tests Performed:
1. [Test 1] - PASS/FAIL
2. [Test 2] - PASS/FAIL

### Browser Check:
- URL: http://localhost:5000
- Console Errors: None / [List]
- Visual Issues: None / [List]

### Screenshot: [If applicable]

### Result: PASS / FAIL
```

---

## Smoke Test Verification

When running Command "2" smoke test:

### Test Each Category:
| Category | What to Check | How to Verify |
|----------|---------------|---------------|
| Functional | Buttons, forms work | Click everything |
| Visual | No layout breaks | Visual inspection |
| UX | Clear labels, flow | User journey test |
| Data | Forms validate | Submit good/bad data |
| Technical | No console errors | Check DevTools |
| Performance | Loads < 3s | Time it |
| Accessibility | Keyboard works | Tab through |

### For Merlin Wizard:
1. Complete full wizard flow
2. Test with valid inputs
3. Test with invalid inputs
4. Verify generation completes
5. Check generated website quality

---

## Self-Check Questions

Before reporting "done":

1. Did I actually run the code?
2. Did I see it work in browser?
3. Did I check the console?
4. Did I test edge cases?
5. Did I verify the output?

If any answer is "No" -> Go back and verify.

---

## Never Assume

- DON'T assume imports work -> Verify build
- DON'T assume API returns data -> Test endpoint
- DON'T assume UI renders -> Check browser
- DON'T assume fix worked -> Verify the fix
- DON'T assume tests pass -> Run the tests

---

**Verification is not optional. It's mandatory.**
