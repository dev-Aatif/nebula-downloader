/**
 * Chaos Runner for Nebula Downloader API
 * 
 * Usage: node tests/adversarial/chaos.js
 */

const http = require('http');
const crypto = require('crypto');

const API_HOST = '127.0.0.1';
const API_PORT = 5000;
const API_BASE = `http://${API_HOST}:${API_PORT}`;

// Colors for console output
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
};

const log = (color, msg) => console.log(`${color}${msg}${colors.reset}`);

// Utility: Make a request
function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: path,
            method: method,
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            }
        };

        if (body) {
            const data = typeof body === 'string' ? body : JSON.stringify(body);
            options.headers['Content-Length'] = Buffer.byteLength(data);
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on('error', (e) => {
            resolve({ error: e }); // Resolve connection errors instead of rejecting to keep tests running
        });

        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

async function checkHealth() {
    log(colors.cyan, 'Checking API Health...');
    const res = await request('GET', '/api/status');
    if (res.error) {
        log(colors.red, `API is DOWN. Is the app running? Error: ${res.error.message}`);
        return false;
    }
    if (res.statusCode === 200) {
        log(colors.green, 'API is UP.');
        return true;
    }
    log(colors.red, `API responded with ${res.statusCode}: ${res.body}`);
    return false;
}

// 1. API DOS Attack
async function runDoSAttack() {
    log(colors.magenta, '\n--- Starting API DOS Attack (50 concurrent requests) ---');
    const requests = [];
    const startTime = Date.now();
    
    // Mix of metadata checks and invalid format requests
    for (let i = 0; i < 50; i++) {
        requests.push(request('GET', `/api/metadata?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&i=${i}`));
    }

    const results = await Promise.all(requests);
    const duration = Date.now() - startTime;
    
    const success = results.filter(r => r.statusCode === 200).length;
    const errors = results.filter(r => r.error || r.statusCode >= 500).length;
    
    log(colors.yellow, `Completed in ${duration}ms`);
    log(colors.green, `Success: ${success}`);
    log(colors.red, `Errors/Failures: ${errors}`);
    
    if (errors > 0) log(colors.red, 'DETECTED: DOS potential - API failed to handle load gracefully.');
    else log(colors.green, 'PASSED: API handled burst load.');
}

// 2. Payload Poisoning
async function runPayloadPoisoning() {
    log(colors.magenta, '\n--- Starting Payload Poisoning ---');
    
    // Case A: Large Payload
    log(colors.cyan, 'Tests A: 5MB Payload');
    const largeString = 'a'.repeat(5 * 1024 * 1024);
    const resA = await request('POST', '/api/download', { url: "http://example.com", padding: largeString });
    log(resA.statusCode === 413 ? colors.green : colors.red, `Large Payload Result: ${resA.statusCode} (Expected 413)`);

    // Case B: Malformed JSON
    log(colors.cyan, 'Test B: Malformed JSON');
    const resB = await request('POST', '/api/download', "{ 'url': 'bad json' ", { 'Content-Type': 'application/json' });
    log(resB.statusCode === 400 ? colors.green : colors.red, `Malformed JSON Result: ${resB.statusCode} (Expected 400)`);

    // Case C: Type Injection (Format ID as object)
    log(colors.cyan, 'Test C: Type Injection');
    const resC = await request('POST', '/api/download', { url: "http://example.com/video", formatId: { "$gt": "" } });
    log(resC.statusCode === 400 ? colors.green : colors.red, `Type Injection Result: ${resC.statusCode} (Expected 400)`);
}

// 3. Database Race Condition / Concurrent Writes
async function runConcurrencyTest() {
    log(colors.magenta, '\n--- Starting Database Race Condition Test ---');
    log(colors.cyan, 'Queueing 10 downloads simultaneously...');
    
    const requests = [];
    for (let i = 0; i < 10; i++) {
        requests.push(request('POST', '/api/download', { url: `https://www.youtube.com/watch?v=testVideo${i}` }));
    }
    
    const results = await Promise.all(requests);
    const successes = results.filter(r => r.statusCode === 200).length;
    
    log(colors.yellow, `Requests processed: ${results.length}`);
    log(colors.green, `Accepted: ${successes}`);
    
    // Verify IDs are unique (if returned)
    const ids = results
        .filter(r => r.statusCode === 200)
        .map(r => JSON.parse(r.body).downloadId)
        .filter(id => id);
    
    const uniqueIds = new Set(ids);
    log(uniqueIds.size === ids.length ? colors.green : colors.red, `Unique IDs: ${uniqueIds.size}/${ids.length}`);
    
    if (uniqueIds.size !== ids.length) {
        log(colors.red, 'FAIL: Duplicate IDs detected! Race condition confirmed.');
    } else {
        log(colors.green, 'PASS: No duplicate IDs returned.');
    }
}

async function main() {
    log(colors.blue, '=== Nebula Downloader Adversarial QA Runner ===');
    
    const isUp = await checkHealth();
    if (!isUp) {
        log(colors.red, 'Aborting. Please start the app first.');
        process.exit(1);
    }
    
    await runDoSAttack();
    await runPayloadPoisoning();
    await runConcurrencyTest();
    
    log(colors.blue, '\n=== Chaos Run Complete ===');
}

main();
