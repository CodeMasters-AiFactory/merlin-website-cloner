/**
 * Local Server Generator
 * Creates a static file server for serving cloned websites locally
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerConfig {
  port?: number;
  host?: string;
  enableCors?: boolean;
  enableGzip?: boolean;
  custom404?: string;
}

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = 'localhost';

/**
 * Generates a local Express server for serving the cloned site
 */
export async function generateLocalServer(
  outputDir: string,
  config: ServerConfig = {}
): Promise<string> {
  const port = config.port || DEFAULT_PORT;
  const host = config.host || DEFAULT_HOST;
  const enableCors = config.enableCors ?? true;
  const enableGzip = config.enableGzip ?? true;
  const custom404 = config.custom404 || '404.html';

  const serverCode = `import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import compression from 'compression';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = ${port};
const HOST = '${host}';
const PUBLIC_DIR = path.join(__dirname, '.');

${enableGzip ? 'app.use(compression());' : ''}

${enableCors ? `app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});` : ''}

// Serve static files
app.use(express.static(PUBLIC_DIR, {
  extensions: ['html', 'htm'],
  index: ['index.html', 'index.htm']
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

      // Handle 404
app.use((req, res) => {
  const custom404Path = path.join(PUBLIC_DIR, '${custom404}');
  try {
    if (fs.existsSync(custom404Path)) {
      res.status(404).sendFile(custom404Path);
    } else {
    res.status(404).send(\`
      <!DOCTYPE html>
      <html>
        <head>
          <title>404 - Page Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>404 - Page Not Found</h1>
          <p>The requested page could not be found.</p>
          <p><a href="/">Go to Home</a></p>
        </body>
      </html>
    \`);
    }
  } catch (err) {
    res.status(404).send('Page not found');
  }
});

app.listen(PORT, HOST, () => {
  console.log(\`🚀 Local server running at http://\${HOST}:\${PORT}\`);
  console.log(\`📁 Serving files from: \${PUBLIC_DIR}\`);
  console.log(\`\nPress Ctrl+C to stop the server\`);
});
`;

  const serverPath = path.join(outputDir, 'server.js');
  await fs.writeFile(serverPath, serverCode, 'utf-8');
  
  return serverPath;
}

/**
 * Generates package.json for the cloned site
 */
export async function generatePackageJson(
  outputDir: string,
  siteName: string = 'cloned-site'
): Promise<string> {
  const packageJson = {
    name: siteName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    version: '1.0.0',
    description: 'Cloned website for offline use',
    type: 'module',
    scripts: {
      start: 'node server.js',
      serve: 'node server.js'
    },
    dependencies: {
      express: '^4.18.2',
      compression: '^1.7.4'
    }
  };

  const packagePath = path.join(outputDir, 'package.json');
  await fs.writeFile(
    packagePath,
    JSON.stringify(packageJson, null, 2),
    'utf-8'
  );
  
  return packagePath;
}

/**
 * Generates a simple Python server as alternative
 */
export async function generatePythonServer(
  outputDir: string,
  port: number = DEFAULT_PORT
): Promise<string> {
  const pythonCode = `#!/usr/bin/env python3
"""
Simple HTTP server for serving cloned website
Usage: python3 server.py
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

PORT = ${port}
DIRECTORY = Path(__file__).parent

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)
    
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def log_message(self, format, *args):
        # Custom logging
        sys.stderr.write("%s - - [%s] %s\\n" %
                        (self.address_string(),
                         self.log_date_time_string(),
                         format % args))

if __name__ == '__main__':
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"🚀 Local server running at http://localhost:{PORT}")
        print(f"📁 Serving files from: {DIRECTORY}")
        print("\\nPress Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\\n\\nServer stopped.")
            sys.exit(0)
`;

  const serverPath = path.join(outputDir, 'server.py');
  await fs.writeFile(serverPath, pythonCode, 'utf-8');
  
  // Make executable on Unix systems
  try {
    await fs.chmod(serverPath, 0o755);
  } catch (e) {
    // Ignore on Windows
  }
  
  return serverPath;
}

/**
 * Generates README with instructions
 */
export async function generateReadme(
  outputDir: string,
  siteName: string = 'Cloned Website'
): Promise<string> {
  const readme = `# ${siteName}

This is a complete offline backup of the website, generated by Merlin Website Clone.

## Quick Start

### Option 1: Node.js Server (Recommended)

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the server:
   \`\`\`bash
   npm start
   \`\`\`

3. Open your browser and visit: http://localhost:3000

### Option 2: Python Server

1. Start the server:
   \`\`\`bash
   python3 server.py
   \`\`\`

2. Open your browser and visit: http://localhost:3000

### Option 3: Any Static File Server

You can use any static file server:
- \`npx serve .\`
- \`python3 -m http.server 8000\`
- \`php -S localhost:8000\`

## Notes

- All links have been rewritten to work offline
- External links may not work without internet connection
- Some dynamic features may require the original server

## Files

- \`index.html\` - Main page
- \`server.js\` - Node.js server
- \`server.py\` - Python server
- \`package.json\` - Node.js dependencies

## Support

For issues or questions, please refer to the Merlin Website Clone documentation.
`;

  const readmePath = path.join(outputDir, 'README.md');
  await fs.writeFile(readmePath, readme, 'utf-8');
  
  return readmePath;
}

/**
 * Generates all server files
 */
export async function generateAllServerFiles(
  outputDir: string,
  siteName: string = 'cloned-site',
  config: ServerConfig = {}
): Promise<{
  serverJs: string;
  serverPy: string;
  packageJson: string;
  readme: string;
}> {
  const [serverJs, serverPy, packageJson, readme] = await Promise.all([
    generateLocalServer(outputDir, config),
    generatePythonServer(outputDir, config.port),
    generatePackageJson(outputDir, siteName),
    generateReadme(outputDir, siteName)
  ]);

  return {
    serverJs,
    serverPy,
    packageJson,
    readme
  };
}

/**
 * Finds an available port
 */
export async function findAvailablePort(
  startPort: number = DEFAULT_PORT,
  maxAttempts: number = 10
): Promise<number> {
  const net = await import('net');
  
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const isAvailable = await checkPortAvailable(port);
    if (isAvailable) {
      return port;
    }
  }
  
  throw new Error(`No available port found in range ${startPort}-${startPort + maxAttempts - 1}`);
}

/**
 * Checks if a port is available
 */
function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    
    server.on('error', () => resolve(false));
  });
}

