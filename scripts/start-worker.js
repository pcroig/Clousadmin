#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { spawn } = require('child_process');
const path = require('path');

// Usar tsx directamente desde node_modules
const tsxPath = require.resolve('tsx');
const workerEntry = path.join(__dirname, 'start-worker.ts');

const child = spawn(process.execPath, [tsxPath, workerEntry], {
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

