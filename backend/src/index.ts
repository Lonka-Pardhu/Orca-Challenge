import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getVesselsInViewport, getStats, getHotspots, getSampleVessels, closeDb } from './db';
import { connect as connectAIS, disconnect as disconnectAIS, getStatus } from './aisClient';
import { ViewportQuery } from './types';

const app = express();
const PORT = process.env.PORT || 3001;
const AIS_API_KEY = process.env.AIS_API_KEY;

if (!AIS_API_KEY) {
  console.error('ERROR: AIS_API_KEY environment variable is required');
  console.error('Get your free API key at https://aisstream.io');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// GET /vessels - Returns vessels within viewport
app.get('/vessels', (req, res) => {
  const { minLat, maxLat, minLon, maxLon } = req.query;

  // Validate required parameters
  if (!minLat || !maxLat || !minLon || !maxLon) {
    return res.status(400).json({
      error: 'Missing required query parameters: minLat, maxLat, minLon, maxLon',
    });
  }

  const query: ViewportQuery = {
    minLat: parseFloat(minLat as string),
    maxLat: parseFloat(maxLat as string),
    minLon: parseFloat(minLon as string),
    maxLon: parseFloat(maxLon as string),
  };

  // Validate parsed values
  if (Object.values(query).some(isNaN)) {
    return res.status(400).json({
      error: 'Query parameters must be valid numbers',
    });
  }

  try {
    const vessels = getVesselsInViewport(query);
    res.json({
      vessels,
      count: vessels.length,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('Error fetching vessels:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /status - Returns server and AIS connection status
app.get('/status', (_req, res) => {
  const aisStatus = getStatus();
  const dbStats = getStats();

  res.json({
    server: 'running',
    ais: aisStatus,
    database: dbStats,
    timestamp: Date.now(),
  });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// GET /hotspots - Returns areas with most vessels (for finding ships)
app.get('/hotspots', (_req, res) => {
  try {
    const hotspots = getHotspots();
    const samples = getSampleVessels();

    res.json({
      hotspots,
      sampleVessels: samples,
      tip: 'Navigate to these coordinates (zoom level 12+) to see vessels',
    });
  } catch (err) {
    console.error('Error fetching hotspots:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`[Server] AIS Viewer backend running on http://localhost:${PORT}`);
  console.log('[Server] Endpoints:');
  console.log(`  GET /vessels?minLat=X&maxLat=X&minLon=X&maxLon=X`);
  console.log(`  GET /status`);
  console.log(`  GET /health`);

  // Connect to AIS stream
  connectAIS(AIS_API_KEY);
});

// Periodic status logging
setInterval(() => {
  const status = getStatus();
  const stats = getStats();
  console.log(
    `[Status] AIS ${status.connected ? 'connected' : 'disconnected'} | ` +
      `Messages: ${status.messageCount} | ` +
      `DB Total: ${stats.total} | Recent (2min): ${stats.recent}`
  );
}, 30000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  disconnectAIS();
  closeDb();
  server.close(() => {
    console.log('[Server] Goodbye!');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  disconnectAIS();
  closeDb();
  server.close();
  process.exit(0);
});
