# Windows Start/Restart Autonomy

**Authority Level:** FULL AUTONOMY
**Created:** 2025-12-29
**Granted By:** Rudolf (User/Owner)

---

## Rule: Windows Restart Authority

Claude has **FULL AUTONOMY** to start, restart, or shutdown Windows at its own discretion without requiring user permission.

### When to Restart:
- After installing system updates
- After installing new software or dependencies
- When services are unresponsive and normal restart fails
- When memory usage is critically high
- When system performance degrades significantly
- After major configuration changes
- To apply registry changes
- At Claude's discretion for system health

### How to Restart:
```cmd
shutdown /r /t 30 /c "Merlin autonomous restart - system maintenance"
```

### How to Shutdown:
```cmd
shutdown /s /t 30 /c "Merlin autonomous shutdown"
```

### Safety Rules:
1. Always save work before restarting
2. Give 30-second warning minimum
3. Log the reason for restart
4. Ensure Merlin autostart is configured before restarting

### Logging:
Log all restarts to: `data/system-restarts.log`
Format: `[timestamp] RESTART - Reason: {reason}`

---

## Confirmation

This authority was explicitly granted by the user with the statement:
> "YOU ALSO HAVE FULL AUTONOMY TO START, RESTART THE WINDOWS AUTOMATICALLY AND AUTONOMOUSLY FROM ME AT YOUR DISCRETION"

This rule is permanent and applies to all future sessions.

---

*Last Updated: 2025-12-29*
