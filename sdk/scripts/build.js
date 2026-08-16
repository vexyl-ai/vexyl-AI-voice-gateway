#!/usr/bin/env node

/**
 * Build script for @vexyl/aivg-sdk
 *
 * Generates:
 * - lib/aivg-sdk.js     (UMD - copied from public/)
 * - lib/aivg-sdk.esm.js (ES Module)
 * - lib/aivg-sdk.min.js (Minified UMD)
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LIB_DIR = path.join(ROOT, 'lib');
// Source of truth is the gateway's public/aivg-sdk.js (monorepo). In a
// standalone checkout of sdk/ (the public repo) fall back to the shipped UMD
// build and regenerate the ESM/min variants from it.
const SOURCE = [
    path.join(ROOT, '..', 'public', 'aivg-sdk.js'),
    path.join(ROOT, 'lib', 'aivg-sdk.js')
].find(p => fs.existsSync(p));
if (!SOURCE) {
    console.error('No SDK source found (../public/aivg-sdk.js or lib/aivg-sdk.js)');
    process.exit(1);
}

// Ensure lib directory exists
if (!fs.existsSync(LIB_DIR)) {
    fs.mkdirSync(LIB_DIR, { recursive: true });
}

console.log('Building @vexyl/aivg-sdk...\n');

// 1. Copy UMD version from public/
console.log('1. Copying UMD version from public/aivg-sdk.js...');
const destUmd = path.join(LIB_DIR, 'aivg-sdk.js');
if (path.resolve(SOURCE) !== path.resolve(destUmd)) fs.copyFileSync(SOURCE, destUmd);
console.log('   ✓ Created lib/aivg-sdk.js\n');

// 2. Create ESM version
console.log('2. Creating ES Module version...');
const umdCode = fs.readFileSync(destUmd, 'utf8');

// Extract the class from IIFE and create ESM export
const esmCode = `/**
 * AI Voice Gateway Browser SDK - ES Module
 * @version 1.0.11
 */

${umdCode
    .replace(/^\/\*\*[\s\S]*?\*\/\s*/, '') // Remove header comment
    .replace(/\(function\(global\)\s*\{\s*'use strict';/, '') // Remove IIFE start
    .replace(/\/\/ Export for different module systems[\s\S]*$/, '') // Remove export section
    .replace(/\}\)\(typeof window[^)]*\);?\s*$/, '') // Remove IIFE end
    .trim()}

export { AIVoiceGateway };
export default AIVoiceGateway;
`;

fs.writeFileSync(path.join(LIB_DIR, 'aivg-sdk.esm.js'), esmCode);
// Same content with .mjs so Node ESM consumers (package "type" is commonjs)
// resolve it as a module via the exports map's "import" condition.
fs.writeFileSync(path.join(LIB_DIR, 'aivg-sdk.mjs'), esmCode);
console.log('   ✓ Created lib/aivg-sdk.esm.js + lib/aivg-sdk.mjs\n');

// 3. Create minified version
console.log('3. Creating minified version...');
try {
    execSync('npx terser lib/aivg-sdk.js -o lib/aivg-sdk.min.js -c -m --comments false', {
        cwd: ROOT,
        stdio: 'pipe'
    });
    console.log('   ✓ Created lib/aivg-sdk.min.js\n');
} catch (error) {
    console.log('   ⚠ terser not installed, installing...');
    execSync('npm install --save-dev terser', { cwd: ROOT, stdio: 'inherit' });
    execSync('npx terser lib/aivg-sdk.js -o lib/aivg-sdk.min.js -c -m --comments false', {
        cwd: ROOT,
        stdio: 'pipe'
    });
    console.log('   ✓ Created lib/aivg-sdk.min.js\n');
}

// 4. Report sizes
const umdSize = fs.statSync(destUmd).size;
const esmSize = fs.statSync(path.join(LIB_DIR, 'aivg-sdk.esm.js')).size;
const minSize = fs.statSync(path.join(LIB_DIR, 'aivg-sdk.min.js')).size;

console.log('Build complete!\n');
console.log('File sizes:');
console.log(`  lib/aivg-sdk.js     ${(umdSize / 1024).toFixed(1)} KB (UMD)`);
console.log(`  lib/aivg-sdk.esm.js ${(esmSize / 1024).toFixed(1)} KB (ESM)`);
console.log(`  lib/aivg-sdk.min.js ${(minSize / 1024).toFixed(1)} KB (minified)`);
console.log('');
