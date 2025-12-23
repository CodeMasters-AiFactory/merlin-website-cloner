# Self-Monitoring Rules

## Health Checks

### Every 30 Minutes
```bash
# Check services running
curl -s http://localhost:3000/api/health
curl -s http://localhost:5000 > /dev/null && echo "Frontend OK"

# Check disk space
df -h | grep -E "^/dev"

# Check memory
free -h

# Check processes
ps aux | grep node | wc -l
```

### Every Session Start
- Verify environment (init.ps1)
- Check service health
- Review error logs
- Check disk space
- Verify git status clean

### Every Session End
- All tests pass
- No orphan processes
- Git status clean
- Progress file updated
- No critical errors in logs

## Metrics to Track

### Performance
| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| API response time | < 200ms | > 500ms | > 2s |
| Page clone time | < 30s | > 60s | > 120s |
| Memory usage | < 2GB | > 3GB | > 4GB |
| Disk usage | < 80% | > 90% | > 95% |
| Open file handles | < 1000 | > 5000 | > 10000 |

### Progress
| Metric | Target |
|--------|--------|
| Features/session | 2-5 |
| Tests passing | 100% |
| Commits/session | 3-10 |
| Blockers | 0 |

## Logging Requirements

### What to Log
- Session start/end times
- Features attempted
- Features completed
- Errors encountered
- Recovery actions
- Test results
- Performance metrics

### Log Format
```
[YYYY-MM-DD HH:MM:SS] [LEVEL] [COMPONENT] Message
```

### Log Levels
- ERROR - Something failed
- WARN - Potential issue
- INFO - Normal operations
- DEBUG - Detailed debugging

## Anomaly Detection

### Watch For
- Sudden increase in errors
- Memory growing continuously
- Disk filling rapidly
- Response times increasing
- Tests that were passing now failing
- Services crashing repeatedly

### Response to Anomalies
1. Log the anomaly
2. Check recent changes
3. Roll back if related
4. Investigate root cause
5. Document findings
6. Implement fix or escalate

## Self-Assessment

### After Each Feature
- Did it work first try?
- Were there unexpected issues?
- Did tests catch any bugs?
- Is the solution clean?
- Would I approve this in code review?

### After Each Session
- What went well?
- What took longer than expected?
- What blockers were hit?
- What could be improved?
- What should I do differently?

## Continuous Improvement

### Track Patterns
- Common errors (create checklist)
- Recurring blockers (address root cause)
- Time sinks (optimize or avoid)
- Successful strategies (replicate)

### Update Rules When
- Same mistake happens twice
- New pattern discovered
- Better approach found
- External change affects process
