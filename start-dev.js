/**
 * Development Startup Script
 * Kills stale processes, frees ports, then starts both services
 */

import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BACKEND_PORT = 3000;
const FRONTEND_PORT = 5000;

// Kill process on a specific port (Windows)
function killPort(port) {
  try {
    const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const lines = result.trim().split('\n');
    for (const line of lines) {
      const match = line.match(/LISTENING\s+(\d+)/);
      if (match) {
        const pid = match[1];
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
          console.log(`  Killed process ${pid} on port ${port}`);
        } catch (e) {}
      }
    }
  } catch (e) {
    // No process on port - that's fine
  }
}

console.log('🧹 Cleaning up stale processes...');
killPort(BACKEND_PORT);
killPort(FRONTEND_PORT);
console.log('');

console.log('🚀 Starting all services...\n');

// Start backend
console.log('📦 Starting backend server (port 3000)...');
const backend = spawn('npm', ['run', 'dev:backend'], {
  cwd: __dirname,
  shell: true,
  stdio: 'inherit'
});

// Start frontend
console.log('🎨 Starting frontend dev server (port 5000)...');
const frontend = spawn('npm', ['run', 'dev:frontend'], {
  cwd: __dirname,
  shell: true,
  stdio: 'inherit'
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping all services...');
  backend.kill();
  frontend.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  backend.kill();
  frontend.kill();
  process.exit();
});


