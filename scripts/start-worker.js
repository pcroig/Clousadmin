#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { spawn } = require('child_process');
const path = require('path');

const tsxCli = require.resolve('tsx/dist/cli.js');
const workerEntry = path.join(__dirname, 'start-worker.ts');

const child = spawn(process.execPath, [tsxCli, workerEntry], {
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

