# Browser Automation Rules

## Available Tools

### 1. Puppeteer (Project Built-In)
Used for website cloning functionality.
Can be used for testing and verification.

### 2. Playwright MCP
Full browser automation via MCP server.
- Navigate to URLs
- Click elements
- Fill forms
- Take screenshots
- Inspect page state

### 3. Desktop Commander MCP
Full desktop automation.
- Control mouse and keyboard
- Open applications
- Take screenshots
- Interact with windows

---

## Browser Verification Protocol

After ANY code change:

```
1. Navigate to http://localhost:5000
2. Take screenshot (if needed)
3. Check console for errors
4. Verify functionality works
5. Report what you saw
```

---

## Taking Screenshots

Use Playwright MCP:
```
browser_take_screenshot with name "test-result"
```

Or browser snapshot:
```
browser_snapshot for accessibility tree
```

---

## Common Automation Tasks

### Navigate
```
browser_navigate to http://localhost:5000
```

### Click
```
browser_click on element "Submit button" with ref
```

### Fill Form
```
browser_type in element with text "Company name"
```

### Check Console
```
browser_console_messages to see errors
```

---

## Rules

### ALWAYS DO:
- Verify visually after changes
- Check console for errors
- Test on localhost first
- Document what you see

### NEVER DO:
- Assume changes worked
- Skip browser verification
- Ignore console errors
- Report without testing

---

## Troubleshooting Browser

### Browser won't open
```powershell
# Check if Playwright installed
npx playwright --version

# Install browsers
npx playwright install
```

### Page not loading
```powershell
# Check server running
curl http://localhost:5000/api/health

# Check port in use
netstat -ano | findstr :5000
```

### Element not found
- Check element exists
- Wait for page load
- Use correct selector

---

## Performance Testing

### Load Time
- Page should load < 3s
- Track with browser DevTools

### Memory
- Watch for memory leaks
- Check in Task Manager

### Network
- Use browser_network_requests
- Check for failed requests
