#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const distCli = path.join(__dirname, '..', 'dist', 'cli.js');
const distCliCjs = path.join(__dirname, '..', 'dist', 'cli.cjs');

if (fs.existsSync(distCli)) {
  require(distCli);
} else if (fs.existsSync(distCliCjs)) {
  require(distCliCjs);
} else {
  console.error('Build artifacts not found. Please run "pnpm build" or "npm run build" first.');
  process.exit(1);
}
