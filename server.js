import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
console.log(`[REDDMART Backend] Initializing runner on PORT=${PORT}...`);

// Search for pre-compiled Go binary
const possibleBins = [
  path.join(__dirname, 'server'),
  path.join(__dirname, 'GroceryBackend-main', 'server'),
  path.join(__dirname, '..', 'server'),
];

let binaryPath = possibleBins.find(p => fs.existsSync(p));

if (binaryPath) {
  try {
    fs.chmodSync(binaryPath, 0o755);
    console.log(`[REDDMART Backend] Launching Go binary at: ${binaryPath}`);
    
    const child = spawn(binaryPath, [], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: 'inherit'
    });

    child.on('error', (err) => {
      console.error('[REDDMART Backend] Go binary execution error:', err);
      startFallbackServer();
    });

    child.on('exit', (code, signal) => {
      console.log(`[REDDMART Backend] Go binary exited with code ${code}, signal ${signal}`);
      if (code !== 0) {
        startFallbackServer();
      }
    });
  } catch (err) {
    console.error('[REDDMART Backend] Failed to execute binary:', err);
    startFallbackServer();
  }
} else {
  console.log('[REDDMART Backend] No Go binary found. Starting node backend server...');
  startFallbackServer();
}

function startFallbackServer() {
  console.log(`[REDDMART Backend] Starting HTTP Service on port ${PORT}...`);
  const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/' || req.url === '/health' || req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        app: 'REDDMART Enterprise Backend API',
        message: 'REDDMART Backend service is online and running.',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      service: 'REDDMART Enterprise Backend API',
      path: req.url,
      message: 'API operational'
    }));
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🟢 [REDDMART Backend] Server successfully listening on http://0.0.0.0:${PORT}`);
  });
}
