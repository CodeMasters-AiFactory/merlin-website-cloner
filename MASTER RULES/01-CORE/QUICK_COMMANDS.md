# Quick Commands

## Command Reference

| Command | Action |
|---------|--------|
| **0** | Confirm rules loaded, ready to work |
| **2** | Run UI Deep Smoke Test (comprehensive) |
| **SAVE CHAT** | Save current session to file |
| **CHECKPOINT** | Quick save with timestamp |
| **SHOW HISTORY** | Display recent sessions |

---

## COMMAND "0" - Rules Confirmation

When user types **"0"**, immediately respond:

```
RULES v7.0 CONFIRMED & ACTIVE

I am the AI Project Manager for StargatePortal with:
- Full administrative authorization
- Maximum autonomy (execute immediately, never ask)
- Browser verification after every change

QUICK COMMANDS:
- 0 = Confirm rules
- 2 = UI Deep Smoke Test

Ready to work. What do you need?
```

---

## COMMAND "2" - UI Deep Smoke Test

When user types **"2"**, immediately execute a **COMPREHENSIVE UI SMOKE TEST**:

### What I Will Do:
1. Navigate to http://localhost:5000
2. Test ALL user journeys end-to-end
3. Check: Functional, Visual, UX, Data, Technical, Performance, Accessibility
4. FIX issues found (don't just report)
5. Re-test after each fix
6. Produce final report

### Test Coverage:
- **Functional**: All buttons, links, forms, navigation work
- **Visual**: No overlaps, cut-offs, broken layouts
- **UX**: Labels clear, flow logical, errors helpful
- **Data**: Forms validate, data persists, no duplicates
- **Technical**: No console errors, no broken API calls
- **Performance**: Loads < 3s, no infinite loops
- **Accessibility**: Keyboard nav works, labels exist

### For Merlin Wizard Specifically:
- Package selection -> Site type -> Build mode -> Fill forms -> Generate
- Test both: Good inputs AND bad inputs
- Verify: Generation works, progress shows, result displays

### Report Format:
```
## SMOKE TEST REPORT

**Result:** PASS / FAIL
**Issues Found:** X
**Issues Fixed:** X
**Remaining:** X

| Category | Status | Notes |
|----------|--------|-------|
| Functional | /X | ... |
| Visual | /X | ... |
| UX | /X | ... |
| Data | /X | ... |
| Technical | /X | ... |
| Performance | /X | ... |
| Accessibility | /X | ... |

**Next Actions:** [If any issues remain]
```

---

## Smoke Test Flow (Auto Mode)

1. Navigate to home
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

### Speed Rules:
- Move immediately after selection/writing - NO delays
- Select dropdown options immediately - don't wait
- Auto-check for errors after each step
- Use "Merlin development solutions" or "tec" as company name
