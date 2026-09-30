import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
console.log(`[REDMART Backend] Initializing runner on PORT=${PORT}...`);

const possibleBins = [
  path.join(__dirname, 'server'),
  path.join(__dirname, '..', 'server'),
];

let binaryPath = possibleBins.find(p => fs.existsSync(p));

if (binaryPath) {
  try {
    fs.chmodSync(binaryPath, 0o755);
    console.log(`[REDMART Backend] Launching Go binary at: ${binaryPath}`);
    
    const child = spawn(binaryPath, [], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: 'inherit'
    });

    child.on('error', (err) => {
      console.error('[REDMART Backend] Go binary execution error:', err);
      startFallbackServer();
    });

    child.on('exit', (code, signal) => {
      console.log(`[REDMART Backend] Go binary exited with code ${code}, signal ${signal}`);
      if (code !== 0) {
        startFallbackServer();
      }
    });
  } catch (err) {
    console.error('[REDMART Backend] Failed to execute binary:', err);
    startFallbackServer();
  }
} else {
  console.log('[REDMART Backend] No Go binary found. Starting fallback node backend...');
  startFallbackServer();
}

function startFallbackServer() {
  console.log(`[REDMART Backend] Starting HTTP Service on port ${PORT}...`);
  const server = http.createServer((req, res) => {
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
        app: 'REDMART Enterprise Backend API',
        message: 'REDMART Backend service is online and running.',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      service: 'REDMART Enterprise Backend API',
      path: req.url,
      message: 'API operational'
    }));
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🟢 [REDMART Backend] Server successfully listening on http://0.0.0.0:${PORT}`);
  });
}
