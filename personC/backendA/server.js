const express = require('express');
const os = require('os');

const app = express();
const BACKEND_ID = 'A';
const PORT = 3001;
const HOST = '0.0.0.0'; // LAN-accessible (do NOT bind only to 127.0.0.1)

// Enable standard ETag generation
app.set('etag', 'strong');

// Middleware: Set X-Backend header on every response
app.use((req, res, next) => {
  res.setHeader('X-Backend', BACKEND_ID);
  next();
});

// GET / - Basic confirmation that service is running
app.get('/', (req, res) => {
  res.json({
    message: 'Backend A is running',
    backend: BACKEND_ID,
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// GET /api/status - JSON status with clear backend identifier
app.get('/api/status', (req, res) => {
  res.json({
    backend: BACKEND_ID,
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// GET /api/cached - Demonstrates HTTP Caching (Task F: Cache-Control & ETag -> 304)
app.get('/api/cached', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({
    data: 'Cached content demonstration',
    version: '1.0.0'
  });
});

// Start listening on 0.0.0.0
app.listen(PORT, HOST, () => {
  console.log(`=========================================`);
  console.log(`🚀 Backend A running on port ${PORT}`);
  console.log(`Listening on host: ${HOST} (LAN accessible)`);
  console.log(`Header: X-Backend: ${BACKEND_ID}`);
  console.log(`-----------------------------------------`);
  console.log(`Available on:`);
  console.log(`  • Localhost: http://localhost:${PORT}`);

  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  • LAN (${name}): http://${net.address}:${PORT}`);
      }
    }
  }
  console.log(`=========================================`);
});
