# Smoke Test Rules

## When to Run

Run smoke test when:
- User types "2"
- User says "test" or "smoke test"
- After major changes
- Before deployment

---

## Smoke Test Protocol

### 1. Start Fresh
- Clear all data (`localStorage.clear()`)
- Start from home page
- Fresh browser state

### 2. Speed
- Move immediately after selection
- NO delays between actions
- Select dropdown options immediately

### 3. Error Checking
- After each step, check for errors
- Check console automatically
- Verify page state

### 4. Complete Flow
- Complete ENTIRE wizard automatically
- Don't stop partway
- Test end-to-end

---

## Test Flow

1. Navigate to http://localhost:5000
2. Click "Merlin Websites"
3. Select random package (Essential/Professional/SEO/Deluxe/Ultra)
4. Select random site type (Personal/Business/Corporate/E-commerce)
5. Choose Auto Mode
6. Fill Project Overview with random but relevant description
7. Complete Business Details with random sensible values
8. Add random services/products
9. Complete Branding with random color/style choices
10. Continue through all remaining pages
11. Complete entire wizard
12. Verify final website generation

---

## Test Categories

### Functional
- All buttons work
- All links work
- All forms submit
- Navigation works

### Visual
- No overlaps
- No cut-offs
- No broken layouts
- Images load

### UX
- Labels clear
- Flow logical
- Errors helpful
- Progress visible

### Data
- Forms validate
- Data persists
- No duplicates
- Correct data saved

### Technical
- No console errors
- No broken API calls
- No failed fetches
- SSE works

### Performance
- Loads < 3s
- No infinite loops
- No memory leaks
- Smooth animations

### Accessibility
- Keyboard nav works
- Labels exist
- Focus visible
- Screen reader friendly

---

## Random Selection Examples

- **Industry:** Random from available options
- **Website Type:** Random but matches business type
- **Colors:** Random but professional
- **Design Style:** Random from available
- **Font:** Random from available
- **Services:** 1-3 random services with descriptions
- **Company Name:** "Merlin development solutions" or "tec"

---

## Report Format

```
## SMOKE TEST REPORT

**Result:** PASS / FAIL
**Issues Found:** X
**Issues Fixed:** X
**Remaining:** X

| Category | Status | Notes |
|----------|--------|-------|
| Functional | PASS/FAIL | ... |
| Visual | PASS/FAIL | ... |
| UX | PASS/FAIL | ... |
| Data | PASS/FAIL | ... |
| Technical | PASS/FAIL | ... |
| Performance | PASS/FAIL | ... |
| Accessibility | PASS/FAIL | ... |

**Next Actions:** [If any issues remain]
```

---

## Fix as You Go

- If you find an issue, FIX IT
- Don't just report problems
- Re-test after each fix
- Only report remaining issues
