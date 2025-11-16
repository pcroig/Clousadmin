#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { spawn } = require('child_process');
const path = require('path');

// Usar npx tsx directamente
const workerEntry = path.join(__dirname, 'start-worker.ts');

const child = spawn('npx', ['tsx', workerEntry], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

