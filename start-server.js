#!/usr/bin/env node

// Simple script to start the server with increased memory limit
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Hospital Management System with increased memory limit...');

const serverProcess = spawn('node', [
  '--max-old-space-size=4096',
  '--expose-gc',
  path.join(__dirname, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
  'server/index.ts'
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
});

serverProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

serverProcess.on('error', (error) => {
  console.error('Failed to start server:', error);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\nShutting down server...');
  serverProcess.kill('SIGTERM');
});

