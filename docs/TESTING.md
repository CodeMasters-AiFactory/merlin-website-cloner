# Testing Guide

Complete testing documentation for Merlin Website Cloner.

## Test Suites

### Comprehensive Testing

Tests on 100+ diverse websites across multiple categories:

```bash
npm run test:comprehensive
```

**Categories Tested:**
- Simple Static Sites (10 sites)
- E-commerce Sites (10 sites)
- News & Media (10 sites)
- Social Media (10 sites)
- SPA Frameworks (10 sites)
- Documentation Sites (10 sites)
- Blog Platforms (10 sites)
- Cloudflare Protected (10 sites)
- Government Sites (10 sites)
- Educational (10 sites)
- Portfolio Sites (10 sites)

**Output:**
- `test-results/comprehensive-test-report.md` - Detailed markdown report
- `test-results/comprehensive-test-results.json` - JSON results
- `test-results/clones/` - Cloned websites for inspection

### Benchmark Testing

Performance benchmarks and comparisons:

```bash
npm run test:benchmark
```

**Tests:**
- Small Site (10 pages) - 5 iterations
- Medium Site (50 pages) - 3 iterations
- Large Site (100 pages) - 2 iterations

**Metrics:**
- Pages per second
- Assets per second
- Memory usage
- Duration variance

**Output:**
- `benchmark-results/benchmark-report.md` - Performance report
- `benchmark-results/benchmark-results.json` - JSON data

## Running Tests

### All Tests

```bash
# Comprehensive testing
npm run test:comprehensive

# Benchmark testing
npm run test:benchmark
```

### Individual Test Files

```bash
# Run comprehensive test directly
tsx src/test/comprehensive-test.ts

# Run benchmark test directly
tsx src/test/benchmark-test.ts
```

## Test Results

### Comprehensive Test Report

The comprehensive test generates:
- Overall success rate
- Category breakdown
- Performance metrics
- Detailed results for each website
- Recommendations

### Benchmark Report

The benchmark test generates:
- Average performance metrics
- Min/max values
- Performance comparisons
- Memory usage analysis
- Recommendations

## Interpreting Results

### Success Rate

- **90%+**: Excellent
- **75-90%**: Good
- **60-75%**: Needs improvement
- **<60%**: Critical issues

### Performance Metrics

- **Pages/Second**: Should be > 1 for good performance
- **Assets/Second**: Higher is better
- **Memory Usage**: Should be < 500MB per test
- **Duration Variance**: Lower is better (more consistent)

### Category Performance

Compare actual success rate vs expected:
- **Met/Exceeded**: ✅ Good
- **Below Expected**: ❌ Needs optimization

## Custom Testing

### Test Specific Website

```typescript
import { WebsiteCloner } from './services/websiteCloner.js';

const cloner = new WebsiteCloner();
const result = await cloner.clone({
  url: 'https://example.com',
  maxPages: 10,
  verifyAfterClone: true,
});

console.log('Result:', result);
```

### Test Configuration

```typescript
import { ComprehensiveTester } from './test/comprehensive-test.js';

const tester = new ComprehensiveTester('./custom-results');
await tester.runAllTests();
```

## Continuous Testing

### Automated Testing

Set up CI/CD to run tests automatically:

```yaml
# .github/workflows/test.yml
name: Comprehensive Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:comprehensive
      - run: npm run test:benchmark
```

### Scheduled Testing

Run tests on a schedule to track performance over time:

```bash
# Daily at 2 AM
0 2 * * * cd /path/to/project && npm run test:comprehensive
```

## Best Practices

1. **Run tests regularly** - Catch regressions early
2. **Review failed tests** - Identify patterns
3. **Compare benchmarks** - Track performance trends
4. **Test edge cases** - Include problematic sites
5. **Document failures** - Keep track of known issues

## Troubleshooting Tests

### Tests Failing

1. Check network connectivity
2. Verify test websites are accessible
3. Review error messages in results
4. Check system resources (memory, CPU)

### Slow Tests

1. Reduce iterations
2. Lower max pages
3. Increase delays between tests
4. Use distributed scraping

### Memory Issues

1. Reduce concurrency
2. Clear cache between tests
3. Use smaller test sets
4. Enable distributed scraping

