
import http from 'http';
import { startApiServer, stopApiServer } from '../../src/main/apiServer';
import { AddressInfo } from 'net';

// Mock Electron
const mockElectron = {
  app: { getPath: () => '/tmp' },
  BrowserWindow: class {},
  ipcMain: { handle: () => {}, on: () => {} },
  nativeTheme: { on: () => {} }
};

// Mock dependencies
import moduleAlias from 'module';
const originalRequire = moduleAlias.prototype.require;
moduleAlias.prototype.require = function(id) {
  if (id === 'electron') return mockElectron;
  return originalRequire.apply(this, arguments as any);
};

async function testFix() {
  console.log('--- Testing Fix 1: API Security ---');
  
  // Start Server
  await startApiServer(5001, null);
  
  // Test 1: Localhost Access (Should Succeed)
  try {
    await makeRequest('127.0.0.1', 5001, '/api/status');
    console.log('✅ Localhost Access: Success');
  } catch (e) {
    console.error('❌ Localhost Access: Failed', e);
  }

  // Test 2: CORS Check (Allowed Origin)
  try {
    const headers = await makeRequest('127.0.0.1', 5001, '/api/status', { 'Origin': 'chrome-extension://abcdef' });
    if (headers['access-control-allow-origin'] === 'chrome-extension://abcdef') {
      console.log('✅ CORS Allowed Origin: Verified');
    } else {
      console.error('❌ CORS Allowed Origin: Failed (Header missing or wrong)');
    }
  } catch (e) { console.error(e); }

  // Test 3: CORS Check (Blocked Origin)
  try {
    const headers = await makeRequest('127.0.0.1', 5001, '/api/status', { 'Origin': 'http://evil.com' });
    if (!headers['access-control-allow-origin']) {
      console.log('✅ CORS Blocked Origin: Verified (Header absent)');
    } else {
      console.error('❌ CORS Blocked Origin: Failed (Header present: ' + headers['access-control-allow-origin'] + ')');
    }
  } catch (e) { console.error(e); }

  // Cleanup
  await stopApiServer();
  process.exit(0);
}

function makeRequest(host: string, port: number, path: string, headers: any = {}): Promise<http.IncomingHttpHeaders> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host,
      port,
      path,
      method: 'GET',
      headers
    }, (res) => {
      resolve(res.headers);
    });
    req.on('error', reject);
    req.end();
  });
}

testFix();
