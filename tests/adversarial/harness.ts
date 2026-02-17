
/**
 * Test Harness for Nebula Downloader API
 * Mocks Electron and DB to run apiServer.ts in isolation.
 * 
 * Usage: npx ts-node tests/adversarial/harness.ts
 */

import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';

// --- MOCKS ---

// Mock Electron
const mockElectron = {
  app: {
    getPath: (name: string) => {
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      return tempDir;
    }
  },
  BrowserWindow: class MockBrowserWindow extends EventEmitter {
    webContents = {
      send: (channel: string, data: any) => {
        // console.log(`[MockElectron] IPC Send: ${channel}`, data);
      }
    };
  }
};

// Mock the 'electron' module require
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id: string) {
  if (id === 'electron') {
    return mockElectron;
  }
  return originalRequire.apply(this, arguments);
};

// --- IMPORTS (After mocks) ---
// Now we can import the app code
import { startApiServer } from '../../src/main/apiServer';
import { db } from '../../src/main/db';

async function main() {
  console.log('[Harness] Starting Test Harness...');

  try {
    // Initialize DB
    await db.init();
    console.log('[Harness] DB Initialized');

    // Start API Server
    const mockWindow = new mockElectron.BrowserWindow() as any;
    await startApiServer(5000, mockWindow);
    console.log('[Harness] API Server Started on port 5000');

    // Keep process alive
    console.log('[Harness] Ready for Chaos!');
    
    // Handle cleanup
    process.on('SIGINT', () => {
      console.log('[Harness] Stopping...');
      process.exit(0);
    });

  } catch (error) {
    console.error('[Harness] Failed to start:', error);
    process.exit(1);
  }
}

main();
