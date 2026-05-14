#!/usr/bin/env node
/**
 * AutoViral AI — Setup Script
 * Run: node scripts/setup.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function run(cmd, cwd = ROOT) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd });
}

function section(title) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(50));
}

// Check .env
section('1. Environment');
if (!fs.existsSync(path.join(ROOT, '.env'))) {
  fs.copyFileSync(path.join(ROOT, '.env.example'), path.join(ROOT, '.env'));
  console.log('✓ .env created from .env.example — PLEASE FILL IN YOUR API KEYS before continuing!');
  process.exit(0);
} else {
  console.log('✓ .env already exists');
}

// Install
section('2. Install dependencies');
run('npm install');

// Prisma
section('3. Database');
run('npx prisma generate', path.join(ROOT, 'packages/database'));
console.log('✓ Prisma client generated');
console.log('  Run "npm run db:migrate" to apply migrations to your database');

// Python
section('4. Python environment');
const aiDir = path.join(ROOT, 'ai');
if (!fs.existsSync(path.join(aiDir, 'venv'))) {
  run('python -m venv venv', aiDir);
}
const pip = process.platform === 'win32'
  ? path.join(aiDir, 'venv', 'Scripts', 'pip')
  : path.join(aiDir, 'venv', 'bin', 'pip');
run(`"${pip}" install -r requirements.txt`, aiDir);
console.log('✓ Python dependencies installed');

section('Setup Complete!');
console.log(`
Next steps:
  1. Fill in your API keys in .env
  2. Run: npm run db:migrate     (apply database migrations)
  3. Run: npm run dev            (start all services)
  4. Open: http://localhost:3000

For Docker deploy:
  docker-compose up -d --build
`);
