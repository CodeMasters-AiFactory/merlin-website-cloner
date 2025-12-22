# Quick Start Guide for New Cursor AI Instance

## Welcome!

You're here to build the **world's best website cloner** - a commercial product that will outrank all competition.

## What to Read First

1. **README.md** - Project overview and mission
2. **COMPARISON_REPORT.md** - How we compare to top 20 scrapers (we're at 38%)
3. **PLAN.md** - 12-week implementation plan
4. **ROADMAP_120_PERCENT.md** - How to outrank competition

## Current State

- **Score:** 38% vs top scrapers
- **Works on:** 20% of websites
- **Fails on:** Cloudflare, government sites, corporate sites
- **Speed:** 7+ minutes for 50 pages (too slow)

## Goal

- **Score:** 120% vs top scrapers
- **Works on:** 95%+ of websites
- **Speed:** <30 seconds for 50 pages
- **Ready to sell:** Commercial product

## What Was Tried (And Failed)

See `FAILURES_ANALYSIS.md` for complete details:

1. Basic Puppeteer scraper - No anti-bot protection
2. Multi-page crawler - Sequential, too slow
3. CSS extraction fix - Works but can't reach protected sites
4. Rate limiting - Not enough, still gets blocked

## What We Need

1. **Proxy Infrastructure** - Rotate IPs, avoid bans
2. **User-Agent Rotation** - Match real browsers
3. **Cloudflare Bypass** - Handle challenges and CAPTCHAs
4. **Parallel Processing** - Speed up 10x
5. **Better Error Handling** - Don't fail silently
6. **Caching** - Don't re-scrape unchanged pages

## Implementation Plan

**Start with Phase 1 (Weeks 1-2):**
- Proxy infrastructure
- User-agent rotation
- Browser fingerprinting evasion

**Then Phase 2 (Weeks 3-4):**
- Cloudflare detection
- JavaScript challenge solving
- Turnstile CAPTCHA integration

**Continue through all 6 phases** (see `PLAN.md` for details)

## Rules to Follow

See `STARTUP_RULES.md` for complete rules:

- **Maximum Autonomy** - Execute without asking
- **Strict Honesty** - Never lie, always tell truth
- **Phased Work** - Organize into phases and steps
- **Always Verify** - Test before claiming it works
- **Production Quality** - No shortcuts, no hacks

## Technical Stack

- **Backend:** Node.js + Express + TypeScript
- **Scraping:** Puppeteer (consider Nodriver/Camoufox)
- **Database:** PostgreSQL (optional)
- **Frontend:** React + Vite + TailwindCSS

## Design for Selling

This is a **commercial product**. Design it to be sold:

- User-friendly UI
- API access for developers
- Billing integration
- Documentation
- Marketing website

## Questions?

- **Current implementation:** See `TECHNICAL_DETAILS.md`
- **What failed:** See `FAILURES_ANALYSIS.md`
- **The plan:** See `PLAN.md`
- **How to outrank:** See `ROADMAP_120_PERCENT.md`
- **Comparison:** See `COMPARISON_REPORT.md`

---

## Your Mission

**Build the world's #1 website cloner.**

**No compromises. No shortcuts. 120% capability. Ready to sell.**

**Let's do this! 🚀**

