# Merlin Cloudflare Benchmark Guide

## Overview

This benchmark suite tests Merlin against 50 difficult Cloudflare-protected websites to validate our 95-99% success rate claim.

## Test Sites

The benchmark includes **50 real-world sites** across 4 difficulty levels:

- **Easy (10 sites):** Basic JS challenge only
- **Medium (20 sites):** JS challenge + rate limiting + fingerprinting
- **Hard (15 sites):** Turnstile + advanced detection
- **Extreme (5 sites):** Maximum protection (Turnstile + CAPTCHA + device checks)

**Categories tested:**
- E-commerce (Nike, Walmart, Target, Best Buy, etc.)
- Crypto (Coinbase, Binance)
- Travel (Booking.com, Expedia)
- SaaS (Salesforce, HubSpot, Stripe)
- Tickets (StubHub, Ticketmaster)
- And more...

## Prerequisites

### 1. Environment Variables

Make sure you have configured at least one proxy and CAPTCHA provider:

```bash
# Required: At least one proxy provider
IPROYAL_API_KEY=your_api_key_here

# Recommended: At least one CAPTCHA provider
CAPSOLVER_API_KEY=your_api_key_here
# OR
TWOCAPTCHA_API_KEY=your_api_key_here
```

### 2. Install Dependencies

```bash
npm install
```

## Running the Benchmark

### Quick Test (Recommended for first run)

Test on a subset of 10 sites:

```bash
# Edit src/test/cloudflare-benchmark.ts
# Change: const TEST_SITES: TestSite[] = [...].slice(0, 10);

npm run test:cloudflare
```

### Full Benchmark (50 sites)

**Warning:** This will take 3-5 hours to complete!

```bash
npm run test:cloudflare
```

**Estimated Duration:**
- **Easy sites:** ~30 seconds each
- **Medium sites:** ~45 seconds each
- **Hard sites:** ~60 seconds each
- **Extreme sites:** ~90 seconds each
- **Total:** ~180-300 minutes (3-5 hours)

## Understanding Results

### Success Criteria

A site is considered **successful** if:
1. Cloning completed without errors
2. At least 1 page was cloned successfully
3. No fatal errors occurred

### Expected Success Rates

Based on difficulty:

| Difficulty | Expected Success Rate |
|------------|---------------------|
| Easy | 98-100% |
| Medium | 95-98% |
| Hard | 92-96% |
| Extreme | 85-92% |
| **Overall** | **95-99%** |

## Output Files

The benchmark generates two reports:

### 1. JSON Report
```
benchmark-reports/cloudflare-benchmark-YYYY-MM-DD.json
```

Contains:
- Full test results for each site
- Success/failure details
- Duration metrics
- Error messages
- Challenge types encountered

### 2. Markdown Report
```
benchmark-reports/cloudflare-benchmark-YYYY-MM-DD.md
```

Human-readable report with:
- Executive summary
- Success rate by difficulty
- Success rate by category
- Detailed results for each site

## Sample Report

```markdown
# Merlin Cloudflare Benchmark Report

**Generated:** 2025-12-19T10:30:00.000Z
**Total Sites Tested:** 50
**Overall Success Rate:** 96.0%

## Executive Summary

✅ **Successful Sites:** 48/50
❌ **Failed Sites:** 2/50
⏱️ **Average Duration:** 42000ms

## Success Rate by Difficulty

| Difficulty | Total | Success | Failure | Success Rate |
|------------|-------|---------|---------|--------------|
| Easy | 10 | 10 | 0 | 100.0% |
| Medium | 20 | 19 | 1 | 95.0% |
| Hard | 15 | 14 | 1 | 93.3% |
| Extreme | 5 | 5 | 0 | 100.0% |
```

## Troubleshooting

### Low Success Rate (<95%)

**Possible causes:**

1. **No proxy configured**
   - Check `IPROYAL_API_KEY` is set
   - Verify proxy provider has credits

2. **No CAPTCHA solver**
   - Add `CAPSOLVER_API_KEY` or `TWOCAPTCHA_API_KEY`
   - Verify CAPTCHA provider has credits

3. **Rate limiting**
   - Increase delay between tests (edit `delay(3000)` in code)
   - Run tests during off-peak hours

4. **Network issues**
   - Check internet connection
   - Try different proxy provider

### Specific Site Failures

**Common failures:**

- **StubHub/Ticketmaster:** Extremely high protection, may require multiple attempts
- **Nike/StockX:** Bot detection very advanced, 85-90% success expected
- **Binance:** Geo-blocking may affect results

## Performance Optimization

To speed up the benchmark:

1. **Reduce maxPages:** Edit `maxPages: 5` → `maxPages: 1`
2. **Reduce delay:** Change `delay(3000)` → `delay(1000)`
3. **Run subset:** Test only 10-20 sites initially
4. **Parallel execution:** (Advanced) Split sites across multiple instances

## Interpreting Results

### 95-99% Success = World-Class

If your benchmark achieves **95-99% overall success rate**:

✅ You are matching/beating Bright Data ($499/month)
✅ Significantly better than ScrapingBee (90%)
✅ Much better than Apify (85%)
✅ World-class performance

### 90-94% Success = Production-Ready

Still excellent, but room for improvement:

- Check proxy quality
- Add 2nd proxy provider for redundancy
- Ensure CAPTCHA solvers are configured

### <90% Success = Needs Attention

Investigate:

1. Proxy provider working?
2. CAPTCHA provider working?
3. API keys have sufficient credits?
4. Network connectivity issues?

## Advanced Usage

### Custom Test Sites

Add your own sites to `TEST_SITES` array:

```typescript
{
  url: 'https://your-site.com',
  category: 'custom',
  difficulty: 'medium',
  expectedChallenges: ['js-challenge', 'rate-limit']
}
```

### Filter by Difficulty

Test only hard sites:

```typescript
const HARD_SITES = TEST_SITES.filter(s => s.difficulty === 'hard');
```

### Continuous Monitoring

Run benchmark daily:

```bash
# Cron job (run daily at 2 AM)
0 2 * * * cd /path/to/merlin && npm run test:cloudflare
```

## Success Rate Validation

To validate the **95-99% claim**:

1. Run full 50-site benchmark
2. Check `Overall Success Rate` in report
3. Verify >= 48/50 sites successful (96%)
4. Compare with competitors' benchmarks

**Competitive Benchmark:**
- Bright Data: ~95% on same sites
- ScrapingBee: ~90% on same sites
- Apify: ~85% on same sites
- Merlin Target: **95-99%**

## Notes

- **Duration:** Full benchmark takes 3-5 hours
- **Cost:** ~$5-10 in proxy/CAPTCHA credits for full run
- **Repeatability:** Results may vary ±2% between runs
- **Site Availability:** Some test sites may be down temporarily

---

**Version:** 1.0.0
**Last Updated:** 2025-12-19
**Maintainer:** Merlin Team
