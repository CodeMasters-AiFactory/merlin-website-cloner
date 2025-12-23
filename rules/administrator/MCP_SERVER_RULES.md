# MCP Server Management Rules

## Current MCP Servers Available

### Connected MCP Servers
1. **Desktop Commander** - Full system command execution
2. **Filesystem** - File operations on user's computer
3. **Kubernetes MCP Server** - K8s cluster management
4. **Playwright** - Browser automation
5. **GitHub** - Repository management
6. **Linear** - Project management
7. **Figma** - Design integration
8. **Memory** - Knowledge graph
9. **Slack** - Team communication
10. **Notion** - Documentation
11. **Brave Search** - Web search

## Installing New MCP Servers

### From npm
```powershell
# Global install
npm install -g @anthropic/mcp-server-<n>

# Or in project
npm install @anthropic/mcp-server-<n>
```

### Popular MCP Servers to Consider

#### Database MCPs
```powershell
npm install -g @anthropic/mcp-server-postgres
npm install -g @anthropic/mcp-server-sqlite
npm install -g @anthropic/mcp-server-mongodb
npm install -g @anthropic/mcp-server-redis
```

#### Cloud Provider MCPs
```powershell
npm install -g @anthropic/mcp-server-aws
npm install -g @anthropic/mcp-server-azure
npm install -g @anthropic/mcp-server-gcp
npm install -g @anthropic/mcp-server-cloudflare
npm install -g @anthropic/mcp-server-vercel
```

#### Development MCPs
```powershell
npm install -g @anthropic/mcp-server-docker
npm install -g @anthropic/mcp-server-git
npm install -g @anthropic/mcp-server-npm
npm install -g @anthropic/mcp-server-vscode
```

#### Communication MCPs
```powershell
npm install -g @anthropic/mcp-server-email
npm install -g @anthropic/mcp-server-discord
npm install -g @anthropic/mcp-server-teams
```

#### Productivity MCPs
```powershell
npm install -g @anthropic/mcp-server-calendar
npm install -g @anthropic/mcp-server-todoist
npm install -g @anthropic/mcp-server-jira
```

#### AI/ML MCPs
```powershell
npm install -g @anthropic/mcp-server-openai
npm install -g @anthropic/mcp-server-huggingface
npm install -g @anthropic/mcp-server-replicate
```

## MCP Configuration

### Claude Desktop Config Location
```
Windows: %APPDATA%\Claude\claude_desktop_config.json
Mac: ~/Library/Application Support/Claude/claude_desktop_config.json
Linux: ~/.config/Claude/claude_desktop_config.json
```

### Config Structure
```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-<n>"],
      "env": {
        "API_KEY": "your-key-here"
      }
    }
  }
}
```

### Adding New MCP Server
```json
{
  "mcpServers": {
    "existing-server": { ... },
    "new-server": {
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {
        "CONFIG_VAR": "value"
      }
    }
  }
}
```

## MCP Server Development

### Creating Custom MCP Server
```typescript
// server.ts
import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";

const server = new Server({
  name: "my-mcp-server",
  version: "1.0.0"
});

// Define tools
server.setRequestHandler("tools/list", async () => ({
  tools: [{
    name: "my_tool",
    description: "Does something useful",
    inputSchema: {
      type: "object",
      properties: {
        param: { type: "string" }
      }
    }
  }]
}));

// Handle tool calls
server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "my_tool") {
    // Implementation
    return { result: "success" };
  }
});

// Start server
const transport = new StdioServerTransport();
server.connect(transport);
```

## Troubleshooting MCP

### Server Not Connecting
```powershell
# Check if server is running
tasklist | findstr node

# Check logs
type %APPDATA%\Claude\logs\mcp.log

# Restart Claude
taskkill /F /IM Claude.exe
start Claude
```

### Permission Issues
```powershell
# Run as admin
Start-Process powershell -Verb RunAs

# Check file permissions
icacls "path\to\mcp\server"
```

## MCP Best Practices

1. **Keep servers updated**
2. **Use environment variables for secrets**
3. **Monitor server resource usage**
4. **Log server activities**
5. **Test servers in isolation first**
6. **Document custom servers**
