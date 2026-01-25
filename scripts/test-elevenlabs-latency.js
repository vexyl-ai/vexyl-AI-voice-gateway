#!/usr/bin/env node
// test-elevenlabs-latency.js
// ElevenLabs Streaming TTS Latency Test Script - 2026
// Tests WebSocket streaming and REST API latency from various locations

const WebSocket = require('ws');
const axios = require('axios');
const dns = require('dns').promises;
const https = require('https');

// Configuration from environment or defaults
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_WSS_URL = process.env.ELEVENLABS_WSS_URL || 'wss://api.elevenlabs.io';
const ELEVENLABS_API_URL = process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io';
const ELEVENLABS_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_turbo_v2_5';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel

// Output formats to test
const OUTPUT_FORMATS = ['pcm_16000', 'pcm_22050', 'pcm_24000', 'mp3_44100_128'];

// Test phrases in different languages
const TEST_PHRASES = {
    'en-US': [
        'Hello, how can I help you today?',
        'Thank you for calling. Please hold while I transfer your call.',
        'The quick brown fox jumps over the lazy dog.',
    ],
    'en-IN': [
        'Welcome to our service. How may I assist you?',
        'Please provide your account number for verification.',
    ],
    'hi-IN': [
        'नमस्ते, आज मैं आपकी कैसे मदद कर सकता हूं?',
        'कृपया अपना खाता नंबर बताएं।',
    ],
};

// Regional endpoints to test (if available)
const REGIONAL_ENDPOINTS = {
    'global': 'api.elevenlabs.io',
    // Add regional endpoints as ElevenLabs makes them available
};

class LatencyTester {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.results = [];
    }

    /**
     * Get current location info
     */
    async getLocationInfo() {
        try {
            const response = await axios.get('https://ipinfo.io/json', { timeout: 5000 });
            return {
                ip: response.data.ip,
                city: response.data.city,
                region: response.data.region,
                country: response.data.country,
                loc: response.data.loc,
                org: response.data.org,
                timezone: response.data.timezone,
            };
        } catch (error) {
            console.warn('Could not get location info:', error.message);
            return { country: 'Unknown', city: 'Unknown' };
        }
    }

    /**
     * Measure DNS resolution time
     */
    async measureDNS(hostname) {
        const start = Date.now();
        try {
            const addresses = await dns.resolve4(hostname);
            const duration = Date.now() - start;
            return { duration, addresses, error: null };
        } catch (error) {
            return { duration: Date.now() - start, addresses: [], error: error.message };
        }
    }

    /**
     * Measure TCP/TLS connection time
     */
    async measureTCPConnection(hostname, port = 443) {
        return new Promise((resolve) => {
            const start = Date.now();
            const req = https.request({
                hostname,
                port,
                method: 'HEAD',
                path: '/',
                timeout: 10000,
            }, (res) => {
                const duration = Date.now() - start;
                res.destroy();
                resolve({ duration, error: null });
            });

            req.on('error', (error) => {
                resolve({ duration: Date.now() - start, error: error.message });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({ duration: Date.now() - start, error: 'Timeout' });
            });

            req.end();
        });
    }

    /**
     * Test WebSocket streaming latency
     */
    async testWebSocketStreaming(text, voiceId, outputFormat = 'pcm_22050') {
        return new Promise((resolve) => {
            const metrics = {
                method: 'websocket',
                text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                voiceId,
                outputFormat,
                startTime: Date.now(),
                connectionTime: null,
                timeToFirstByte: null,
                totalTime: null,
                audioChunks: 0,
                totalAudioBytes: 0,
                error: null,
            };

            const wssUrl = `${ELEVENLABS_WSS_URL}/v1/text-to-speech/${voiceId}/stream-input?model_id=${ELEVENLABS_MODEL}&output_format=${outputFormat}`;

            const ws = new WebSocket(wssUrl, {
                headers: { 'xi-api-key': this.apiKey },
            });

            let firstByteReceived = false;
            const timeout = setTimeout(() => {
                if (!metrics.totalTime) {
                    metrics.error = 'Timeout (30s)';
                    metrics.totalTime = 30000;
                    ws.close();
                    resolve(metrics);
                }
            }, 30000);

            ws.on('open', () => {
                metrics.connectionTime = Date.now() - metrics.startTime;

                // Send configuration
                ws.send(JSON.stringify({
                    text: ' ',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                    generation_config: {
                        chunk_length_schedule: [120, 160, 250, 290],
                    },
                }));

                // Send text
                ws.send(JSON.stringify({ text }));

                // Send EOS
                ws.send(JSON.stringify({ text: '' }));
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());

                    if (message.audio && !firstByteReceived) {
                        firstByteReceived = true;
                        metrics.timeToFirstByte = Date.now() - metrics.startTime;
                    }

                    if (message.audio) {
                        metrics.audioChunks++;
                        metrics.totalAudioBytes += Buffer.from(message.audio, 'base64').length;
                    }

                    if (message.isFinal) {
                        metrics.totalTime = Date.now() - metrics.startTime;
                        clearTimeout(timeout);
                        ws.close();
                        resolve(metrics);
                    }

                    if (message.error) {
                        metrics.error = message.error;
                        metrics.totalTime = Date.now() - metrics.startTime;
                        clearTimeout(timeout);
                        ws.close();
                        resolve(metrics);
                    }
                } catch (e) {
                    // Binary data
                    if (!firstByteReceived) {
                        firstByteReceived = true;
                        metrics.timeToFirstByte = Date.now() - metrics.startTime;
                    }
                    metrics.audioChunks++;
                    if (Buffer.isBuffer(data)) {
                        metrics.totalAudioBytes += data.length;
                    }
                }
            });

            ws.on('error', (error) => {
                metrics.error = error.message;
                metrics.totalTime = Date.now() - metrics.startTime;
                clearTimeout(timeout);
                resolve(metrics);
            });

            ws.on('close', () => {
                if (!metrics.totalTime) {
                    metrics.totalTime = Date.now() - metrics.startTime;
                    clearTimeout(timeout);
                    resolve(metrics);
                }
            });
        });
    }

    /**
     * Test REST API latency
     */
    async testRESTAPI(text, voiceId, outputFormat = 'mp3_44100_128') {
        const metrics = {
            method: 'rest',
            text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
            voiceId,
            outputFormat,
            startTime: Date.now(),
            timeToFirstByte: null,
            totalTime: null,
            totalAudioBytes: 0,
            error: null,
        };

        try {
            const url = `${ELEVENLABS_API_URL}/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`;

            const startTime = Date.now();
            let firstByteTime = null;

            const response = await axios({
                method: 'POST',
                url,
                headers: {
                    'xi-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg',
                },
                data: {
                    text,
                    model_id: ELEVENLABS_MODEL,
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                },
                responseType: 'arraybuffer',
                timeout: 30000,
                onDownloadProgress: (progressEvent) => {
                    if (!firstByteTime && progressEvent.loaded > 0) {
                        firstByteTime = Date.now() - startTime;
                    }
                },
            });

            metrics.timeToFirstByte = firstByteTime || (Date.now() - startTime);
            metrics.totalTime = Date.now() - startTime;
            metrics.totalAudioBytes = response.data.length;

        } catch (error) {
            metrics.error = error.response?.data?.detail || error.message;
            metrics.totalTime = Date.now() - metrics.startTime;
        }

        return metrics;
    }

    /**
     * Test streaming with chunked response (v1 streaming endpoint)
     */
    async testStreamingREST(text, voiceId, outputFormat = 'mp3_44100_128') {
        const metrics = {
            method: 'streaming-rest',
            text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
            voiceId,
            outputFormat,
            startTime: Date.now(),
            timeToFirstByte: null,
            totalTime: null,
            totalAudioBytes: 0,
            chunks: 0,
            error: null,
        };

        try {
            const url = `${ELEVENLABS_API_URL}/v1/text-to-speech/${voiceId}/stream?output_format=${outputFormat}`;

            const response = await axios({
                method: 'POST',
                url,
                headers: {
                    'xi-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                },
                data: {
                    text,
                    model_id: ELEVENLABS_MODEL,
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                },
                responseType: 'stream',
                timeout: 30000,
            });

            return new Promise((resolve) => {
                let firstChunk = true;

                response.data.on('data', (chunk) => {
                    if (firstChunk) {
                        metrics.timeToFirstByte = Date.now() - metrics.startTime;
                        firstChunk = false;
                    }
                    metrics.chunks++;
                    metrics.totalAudioBytes += chunk.length;
                });

                response.data.on('end', () => {
                    metrics.totalTime = Date.now() - metrics.startTime;
                    resolve(metrics);
                });

                response.data.on('error', (error) => {
                    metrics.error = error.message;
                    metrics.totalTime = Date.now() - metrics.startTime;
                    resolve(metrics);
                });
            });

        } catch (error) {
            metrics.error = error.response?.data?.detail || error.message;
            metrics.totalTime = Date.now() - metrics.startTime;
            return metrics;
        }
    }

    /**
     * Run a single test iteration
     */
    async runTest(testConfig) {
        const { method, text, voiceId, outputFormat } = testConfig;

        switch (method) {
            case 'websocket':
                return this.testWebSocketStreaming(text, voiceId, outputFormat);
            case 'rest':
                return this.testRESTAPI(text, voiceId, outputFormat);
            case 'streaming-rest':
                return this.testStreamingREST(text, voiceId, outputFormat);
            default:
                throw new Error(`Unknown method: ${method}`);
        }
    }

    /**
     * Calculate statistics from results
     */
    calculateStats(results) {
        if (results.length === 0) return null;

        const validResults = results.filter(r => !r.error);
        if (validResults.length === 0) return { errors: results.length };

        const ttfbs = validResults.map(r => r.timeToFirstByte).filter(Boolean);
        const totals = validResults.map(r => r.totalTime).filter(Boolean);

        const stats = (arr) => {
            if (arr.length === 0) return null;
            const sorted = [...arr].sort((a, b) => a - b);
            return {
                min: sorted[0],
                max: sorted[sorted.length - 1],
                avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
                median: sorted[Math.floor(sorted.length / 2)],
                p95: sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1],
                p99: sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1],
            };
        };

        return {
            count: validResults.length,
            errors: results.length - validResults.length,
            ttfb: stats(ttfbs),
            total: stats(totals),
        };
    }

    /**
     * Format duration in ms
     */
    formatMs(ms) {
        if (ms === null || ms === undefined) return 'N/A';
        return `${ms}ms`;
    }

    /**
     * Print a formatted table
     */
    printTable(headers, rows) {
        const colWidths = headers.map((h, i) => {
            const maxData = Math.max(...rows.map(r => String(r[i] || '').length));
            return Math.max(h.length, maxData);
        });

        const separator = '+' + colWidths.map(w => '-'.repeat(w + 2)).join('+') + '+';
        const formatRow = (row) => '| ' + row.map((cell, i) =>
            String(cell || '').padEnd(colWidths[i])
        ).join(' | ') + ' |';

        console.log(separator);
        console.log(formatRow(headers));
        console.log(separator);
        rows.forEach(row => console.log(formatRow(row)));
        console.log(separator);
    }
}

async function main() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║     ElevenLabs Streaming TTS Latency Test - January 2026       ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    if (!ELEVENLABS_API_KEY) {
        console.error('ERROR: ELEVENLABS_API_KEY environment variable is required');
        console.log('\nUsage:');
        console.log('  ELEVENLABS_API_KEY=your_key node test-elevenlabs-latency.js');
        console.log('\nOptional environment variables:');
        console.log('  ELEVENLABS_MODEL      - Model to use (default: eleven_turbo_v2_5)');
        console.log('  ELEVENLABS_VOICE_ID   - Voice ID (default: 21m00Tcm4TlvDq8ikWAM)');
        console.log('  TEST_ITERATIONS       - Number of iterations per test (default: 5)');
        console.log('  TEST_LANGUAGE         - Language to test (default: en-US)');
        process.exit(1);
    }

    const tester = new LatencyTester(ELEVENLABS_API_KEY);
    const iterations = parseInt(process.env.TEST_ITERATIONS) || 5;
    const testLanguage = process.env.TEST_LANGUAGE || 'en-US';

    // Get location info
    console.log('📍 Getting location information...');
    const location = await tester.getLocationInfo();
    console.log(`   Location: ${location.city}, ${location.region}, ${location.country}`);
    console.log(`   IP: ${location.ip}`);
    console.log(`   ISP: ${location.org}`);
    console.log(`   Timezone: ${location.timezone}\n`);

    // Network diagnostics
    console.log('🔌 Network Diagnostics:');
    const hostname = 'api.elevenlabs.io';

    const dnsResult = await tester.measureDNS(hostname);
    console.log(`   DNS Resolution: ${tester.formatMs(dnsResult.duration)}`);
    if (dnsResult.addresses.length > 0) {
        console.log(`   Resolved to: ${dnsResult.addresses.join(', ')}`);
    }

    const tcpResult = await tester.measureTCPConnection(hostname);
    console.log(`   TCP/TLS Connection: ${tester.formatMs(tcpResult.duration)}\n`);

    // Test configuration
    console.log('⚙️  Test Configuration:');
    console.log(`   Model: ${ELEVENLABS_MODEL}`);
    console.log(`   Voice ID: ${ELEVENLABS_VOICE_ID}`);
    console.log(`   Iterations per test: ${iterations}`);
    console.log(`   Test language: ${testLanguage}\n`);

    const testPhrases = TEST_PHRASES[testLanguage] || TEST_PHRASES['en-US'];
    const testPhrase = testPhrases[0];

    console.log('─'.repeat(70));
    console.log('\n🧪 Running Latency Tests...\n');

    const allResults = {
        websocket: {},
        streamingRest: {},
        rest: {},
    };

    // Test each output format with WebSocket
    console.log('📡 WebSocket Streaming Tests:');
    for (const format of OUTPUT_FORMATS) {
        if (format.startsWith('mp3')) continue; // WebSocket uses PCM

        process.stdout.write(`   Testing ${format}... `);
        const results = [];

        for (let i = 0; i < iterations; i++) {
            const result = await tester.testWebSocketStreaming(testPhrase, ELEVENLABS_VOICE_ID, format);
            results.push(result);

            // Add small delay between tests
            await new Promise(r => setTimeout(r, 500));
        }

        allResults.websocket[format] = results;
        const stats = tester.calculateStats(results);
        console.log(`TTFB: ${tester.formatMs(stats.ttfb?.avg)} (avg), Total: ${tester.formatMs(stats.total?.avg)} (avg)`);
    }

    // Test streaming REST API
    console.log('\n📤 Streaming REST API Tests:');
    for (const format of ['mp3_44100_128', 'pcm_22050']) {
        process.stdout.write(`   Testing ${format}... `);
        const results = [];

        for (let i = 0; i < iterations; i++) {
            const result = await tester.testStreamingREST(testPhrase, ELEVENLABS_VOICE_ID, format);
            results.push(result);
            await new Promise(r => setTimeout(r, 500));
        }

        allResults.streamingRest[format] = results;
        const stats = tester.calculateStats(results);
        console.log(`TTFB: ${tester.formatMs(stats.ttfb?.avg)} (avg), Total: ${tester.formatMs(stats.total?.avg)} (avg)`);
    }

    // Test standard REST API
    console.log('\n📥 Standard REST API Tests:');
    for (const format of ['mp3_44100_128']) {
        process.stdout.write(`   Testing ${format}... `);
        const results = [];

        for (let i = 0; i < iterations; i++) {
            const result = await tester.testRESTAPI(testPhrase, ELEVENLABS_VOICE_ID, format);
            results.push(result);
            await new Promise(r => setTimeout(r, 500));
        }

        allResults.rest[format] = results;
        const stats = tester.calculateStats(results);
        console.log(`TTFB: ${tester.formatMs(stats.ttfb?.avg)} (avg), Total: ${tester.formatMs(stats.total?.avg)} (avg)`);
    }

    // Print summary
    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 SUMMARY RESULTS\n');

    const summaryRows = [];

    // WebSocket results
    for (const [format, results] of Object.entries(allResults.websocket)) {
        const stats = tester.calculateStats(results);
        if (stats.ttfb) {
            summaryRows.push([
                'WebSocket',
                format,
                tester.formatMs(stats.ttfb.min),
                tester.formatMs(stats.ttfb.avg),
                tester.formatMs(stats.ttfb.p95),
                tester.formatMs(stats.total.avg),
                stats.errors > 0 ? `${stats.errors} errors` : '✓',
            ]);
        }
    }

    // Streaming REST results
    for (const [format, results] of Object.entries(allResults.streamingRest)) {
        const stats = tester.calculateStats(results);
        if (stats.ttfb) {
            summaryRows.push([
                'Stream REST',
                format,
                tester.formatMs(stats.ttfb.min),
                tester.formatMs(stats.ttfb.avg),
                tester.formatMs(stats.ttfb.p95),
                tester.formatMs(stats.total.avg),
                stats.errors > 0 ? `${stats.errors} errors` : '✓',
            ]);
        }
    }

    // REST results
    for (const [format, results] of Object.entries(allResults.rest)) {
        const stats = tester.calculateStats(results);
        if (stats.ttfb) {
            summaryRows.push([
                'REST',
                format,
                tester.formatMs(stats.ttfb.min),
                tester.formatMs(stats.ttfb.avg),
                tester.formatMs(stats.ttfb.p95),
                tester.formatMs(stats.total.avg),
                stats.errors > 0 ? `${stats.errors} errors` : '✓',
            ]);
        }
    }

    tester.printTable(
        ['Method', 'Format', 'TTFB Min', 'TTFB Avg', 'TTFB P95', 'Total Avg', 'Status'],
        summaryRows
    );

    // Print JSON for programmatic use
    console.log('\n📋 JSON Results (for comparison):');
    const jsonOutput = {
        timestamp: new Date().toISOString(),
        location: location,
        config: {
            model: ELEVENLABS_MODEL,
            voiceId: ELEVENLABS_VOICE_ID,
            iterations,
            testPhrase: testPhrase.substring(0, 50),
        },
        network: {
            dnsResolution: dnsResult.duration,
            tcpConnection: tcpResult.duration,
        },
        results: {},
    };

    for (const [method, formats] of Object.entries(allResults)) {
        jsonOutput.results[method] = {};
        for (const [format, results] of Object.entries(formats)) {
            const stats = tester.calculateStats(results);
            jsonOutput.results[method][format] = stats;
        }
    }

    console.log(JSON.stringify(jsonOutput, null, 2));

    // Recommendations
    console.log('\n' + '═'.repeat(70));
    console.log('\n💡 RECOMMENDATIONS:\n');

    // Find best performing config
    let bestTTFB = Infinity;
    let bestConfig = null;

    for (const [method, formats] of Object.entries(allResults)) {
        for (const [format, results] of Object.entries(formats)) {
            const stats = tester.calculateStats(results);
            if (stats.ttfb && stats.ttfb.avg < bestTTFB) {
                bestTTFB = stats.ttfb.avg;
                bestConfig = { method, format };
            }
        }
    }

    if (bestConfig) {
        console.log(`   ✓ Best TTFB: ${bestConfig.method} with ${bestConfig.format} (${tester.formatMs(bestTTFB)} avg)`);
    }

    if (location.country === 'IN') {
        console.log('   ✓ From India: Consider using WebSocket streaming for lowest latency');
        console.log('   ✓ PCM format avoids transcoding overhead');
    }

    console.log('\n   For voice applications, target TTFB under 300ms for natural conversation flow.');
    console.log('');
}

main().catch(console.error);
