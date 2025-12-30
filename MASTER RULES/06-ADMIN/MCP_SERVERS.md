# MCP Servers Configuration

## Overview

MCP (Model Context Protocol) servers extend Claude's capabilities with specialized tools. This document lists all configured MCP servers for this project and any future projects.

**Config Location:** `C:\Users\DEV1\.cursor\mcp.json`

---

## Active MCP Servers (33 Total)

### Core Development

| Server | Purpose | Requires API Key |
|--------|---------|------------------|
| **filesystem** | Read/write files in C:/Cursor Projects and C:/Users/DEV1 | No |
| **git** | Git operations (status, diff, commit, branch) | No |
| **sqlite** | SQLite database operations | No |
| **postgres** | PostgreSQL database operations | Yes |
| **docker** | Container management (Podman) | No |

### Browser & Automation

| Server | Purpose | Requires API Key |
|--------|---------|------------------|
| **puppeteer** | Browser automation, screenshots, scraping | No |
| **playwright** | Cross-browser testing and automation | No |
| **desktop-commander** | Desktop automation, window management | No |
| **screenshot** | Native screenshot capture | No |

### Search & Web

| Server | Purpose | Requires API Key |
|--------|---------|------------------|
| **fetch** | HTTP requests, web content fetching | No |
| **duckduckgo** | Privacy-focused web search | No |
| **brave-search** | Brave search API | Yes |
| **perplexity** | AI-powered search | Yes |
| **exa** | Semantic search API | Yes |
| **firecrawl** | Web scraping and crawling | Yes |
| **markdownify** | Convert web pages to markdown | No |

### AI & Thinking

| Server | Purpose | Requires API Key |
|--------|---------|------------------|
| **sequential-thinking** | Step-by-step reasoning | No |
| **memory** | Persistent memory across sessions | No |
| **knowledge-graph** | Build and query knowledge graphs | No |
| **graphiti** | Graph-based data structures | No |
| **zen** | Multi-model AI coordination | Yes (Gemini/OpenAI) |
| **context7** | Context management | No |

### Design & UI

| Server | Purpose | Requires API Key |
|--------|---------|------------------|
| **magic-ui** | UI component generation | No |
| **figma** | Figma design integration | Yes |

### Cloud & Deployment

| Server | Purpose | Requires API Key |
|--------|---------|------------------|
| **github** | GitHub API operations | Yes |
| **supabase** | Supabase backend services | Yes |
| **cloudflare** | Cloudflare CDN/Workers | Yes |
| **vercel** | Vercel deployment | Yes |
| **sentry** | Error tracking | Yes |
| **slack** | Slack messaging | Yes |

### Utilities

| Server | Purpose | Requires API Key |
|--------|---------|------------------|
| **time** | Time and timezone utilities | No |
| **everything** | Windows Everything search integration | No |
| **serena** | Project management | No |

---

## Quick Setup for API Keys

Edit `C:\Users\DEV1\.cursor\mcp.json` and replace placeholder values:

```json
// GitHub
"GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxxxxxxxxxx"

// Supabase
"SUPABASE_ACCESS_TOKEN": "sbp_xxxxxxxxxxxxxxxxxxxx"

// Brave Search (https://brave.com/search/api/)
"BRAVE_API_KEY": "BSAxxxxxxxxxxxxxxxxxxxx"

// Firecrawl (https://firecrawl.dev/)
"FIRECRAWL_API_KEY": "fc-xxxxxxxxxxxxxxxxxxxx"

// Perplexity (https://perplexity.ai/)
"PERPLEXITY_API_KEY": "pplx-xxxxxxxxxxxxxxxxxxxx"

// Figma (https://www.figma.com/developers)
"FIGMA_ACCESS_TOKEN": "figd_xxxxxxxxxxxxxxxxxxxx"

// OpenAI
"OPENAI_API_KEY": "sk-xxxxxxxxxxxxxxxxxxxx"

// Gemini
"GEMINI_API_KEY": "AIzaxxxxxxxxxxxxxxxxxxxx"

// Cloudflare
"CLOUDFLARE_API_TOKEN": "xxxxxxxxxxxxxxxxxxxx"

// Vercel
"VERCEL_TOKEN": "xxxxxxxxxxxxxxxxxxxx"

// Sentry
"SENTRY_AUTH_TOKEN": "sntrys_xxxxxxxxxxxxxxxxxxxx"

// Slack
"SLACK_BOT_TOKEN": "xoxb-xxxxxxxxxxxxxxxxxxxx"

// Exa
"EXA_API_KEY": "xxxxxxxxxxxxxxxxxxxx"
```

---

## MCP Servers by Use Case

### For Web Cloning (Merlin)
1. **puppeteer** - Browser automation for cloning
2. **playwright** - Cross-browser testing
3. **firecrawl** - Deep crawling
4. **fetch** - HTTP requests
5. **markdownify** - Content extraction

### For UI Development
1. **magic-ui** - Component generation
2. **figma** - Design to code
3. **puppeteer** - Visual testing

### For Database Work
1. **sqlite** - Local database
2. **postgres** - Production database
3. **supabase** - Backend as a service

### For Research
1. **duckduckgo** - Quick searches
2. **brave-search** - Web search
3. **perplexity** - AI search
4. **exa** - Semantic search

### For Memory/Context
1. **memory** - Persistent memory
2. **knowledge-graph** - Relationship mapping
3. **sequential-thinking** - Complex reasoning

---

## Adding New MCP Servers

1. Find the server on npm: `npm search mcp-server`
2. Add to `mcp.json`:
```json
"server-name": {
  "command": "npx",
  "args": ["-y", "@package/mcp-server"],
  "type": "stdio"
}
```
3. Restart Cursor/Claude Code

---

## Troubleshooting

### Server not starting
```bash
# Test manually
npx -y @modelcontextprotocol/server-filesystem "C:/Cursor Projects"
```

### Check installed packages
```bash
npm list -g --depth=0
```

### Clear npx cache
```bash
npx clear-npx-cache
```

---

*Last Updated: 2024-12-30*
*Total Servers: 33*
