#!/usr/bin/env node
// wip-license-guard
// License compliance for your own repos.
// Ensures correct copyright, dual-license blocks, and LICENSE files.

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { generateLicense, generateReadmeBlock } from './core.mjs';

const args = process.argv.slice(2);
const HELP_FLAGS = ['--help', '-h', 'help'];
const command = HELP_FLAGS.some(f => args.includes(f)) ? 'help' : (args.find(a => !a.startsWith('--')) || 'check');
const target = args.find((a, i) => i > 0 && !a.startsWith('--')) || '.';
const FIX = args.includes('--fix');
const QUIET = args.includes('--quiet');

function log(msg) { if (!QUIET) console.log(msg); }
function ok(msg) { if (!QUIET) console.log(`  \u2713 ${msg}`); }
function warn(msg) { console.log(`  \u2717 ${msg}`); }

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function init(repoPath) {
  const configPath = join(repoPath, '.license-guard.json');

  if (existsSync(configPath)) {
    const existing = JSON.parse(readFileSync(configPath, 'utf8'));
    log(`\nLicense guard already configured:`);
    log(`  Copyright: ${existing.copyright}`);
    log(`  License: ${existing.license}`);
    log(`  Year: ${existing.year}`);
    const update = await ask('\nUpdate? (y/N) ');
    if (update.toLowerCase() !== 'y') {
      log('Keeping existing config.');
      return existing;
    }
  }

  log('\n  wip-license-guard init\n');

  const copyright = await ask('  Copyright holder (e.g. WIP Computer, Inc.): ');
  if (!copyright) {
    console.error('Copyright holder is required.');
    process.exit(1);
  }

  log('\n  License types:');
  log('    1. MIT only');
  log('    2. AGPLv3 only');
  log('    3. MIT + AGPLv3 dual-license (recommended for WIP repos)');
  const licenseChoice = await ask('\n  Choose (1/2/3): ');

  const licenseMap = { '1': 'MIT', '2': 'AGPL-3.0', '3': 'MIT+AGPL' };
  const license = licenseMap[licenseChoice] || 'MIT+AGPL';

  const currentYear = new Date().getFullYear();
  const yearInput = await ask(`  Copyright year (${currentYear}): `);
  const year = yearInput || String(currentYear);

  const attribution = await ask('  Attribution (e.g. Built by Parker Todd Brooks, ...): ');

  const config = { copyright, license, year, attribution, created: new Date().toISOString() };

  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  ok(`Config saved to .license-guard.json`);

  const licensePath = join(repoPath, 'LICENSE');
  const licenseText = generateLicense(config);
  writeFileSync(licensePath, licenseText);
  ok(`LICENSE file generated`);

  log(`\nDone. Run \`wip-license-guard check\` to audit.`);
  return config;
}

async function check(repoPath) {
  const configPath = join(repoPath, '.license-guard.json');

  if (!existsSync(configPath)) {
    log('\n  No .license-guard.json found.');
    const doInit = await ask('  Initialize license guard? (Y/n) ');
    if (doInit.toLowerCase() !== 'n') {
      await init(repoPath);
      return 0;
    }
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  let issues = 0;

  log(`\n  wip-license-guard check\n`);
  log(`  Copyright: ${config.copyright}`);
  log(`  License: ${config.license}\n`);

  // Check LICENSE file
  const licensePath = join(repoPath, 'LICENSE');
  if (!existsSync(licensePath)) {
    warn('LICENSE file missing');
    issues++;
    if (FIX) {
      writeFileSync(licensePath, generateLicense(config));
      ok('LICENSE file created (--fix)');
      issues--;
    }
  } else {
    const licenseText = readFileSync(licensePath, 'utf8');

    if (!licenseText.includes(config.copyright)) {
      warn(`LICENSE copyright does not match "${config.copyright}"`);
      issues++;
      if (FIX) {
        writeFileSync(licensePath, generateLicense(config));
        ok('LICENSE file updated (--fix)');
        issues--;
      }
    } else {
      ok('LICENSE copyright correct');
    }

    if (config.license === 'MIT+AGPL') {
      if (!licenseText.includes('AGPL') && !licenseText.includes('GNU Affero')) {
        warn('LICENSE file is MIT-only but config says MIT+AGPL');
        issues++;
        if (FIX) {
          writeFileSync(licensePath, generateLicense(config));
          ok('LICENSE file updated to dual-license (--fix)');
          issues--;
        }
      } else {
        ok('LICENSE includes AGPLv3 terms');
      }
    }
  }

  // Check README
  const readmePath = join(repoPath, 'README.md');
  if (existsSync(readmePath)) {
    const readme = readFileSync(readmePath, 'utf8');

    if (!readme.includes('## License')) {
      warn('README.md missing ## License section');
      issues++;
    } else {
      ok('README.md has License section');
    }

    if (config.license === 'MIT+AGPL' && !readme.includes('AGPL')) {
      warn('README.md License section missing AGPL reference');
      issues++;
    } else if (config.license === 'MIT+AGPL') {
      ok('README.md references AGPL');
    }
  } else {
    warn('README.md not found');
    issues++;
  }

  // Check sub-tools (toolbox mode)
  const toolsDir = join(repoPath, 'tools');
  if (existsSync(toolsDir)) {
    try {
      const entries = readdirSync(toolsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const toolPath = join(toolsDir, entry.name);
        const toolLicense = join(toolPath, 'LICENSE');

        if (!existsSync(toolLicense)) {
          warn(`tools/${entry.name}/LICENSE missing`);
          issues++;
          if (FIX) {
            writeFileSync(toolLicense, generateLicense(config));
            ok(`tools/${entry.name}/LICENSE created (--fix)`);
            issues--;
          }
        } else {
          const text = readFileSync(toolLicense, 'utf8');
          if (!text.includes(config.copyright)) {
            warn(`tools/${entry.name}/LICENSE wrong copyright`);
            issues++;
            if (FIX) {
              writeFileSync(toolLicense, generateLicense(config));
              ok(`tools/${entry.name}/LICENSE updated (--fix)`);
              issues--;
            }
          } else {
            ok(`tools/${entry.name}/LICENSE correct`);
          }
        }
      }
    } catch {}
  }

  log('');
  if (issues === 0) {
    log('  All checks passed.\n');
  } else {
    log(`  ${issues} issue(s) found. Run with --fix to auto-repair.\n`);
  }

  return issues;
}

// Main
if (command === 'init') {
  await init(target === 'init' ? '.' : target);
} else if (command === 'check') {
  const repoPath = (target === 'check') ? '.' : target;
  const issues = await check(repoPath);
  process.exit(issues > 0 ? 1 : 0);
} else if (command === '--help' || command === '-h' || command === 'help') {
  console.log(`
  wip-license-guard

  Commands:
    init [path]           Interactive setup. Asks license type, copyright, year.
    check [path]          Audit repo against saved config. Exit 1 if issues found.
    check --fix [path]    Auto-fix issues (update LICENSE files, wrong copyright).
    help                  Show this help.

  On first run, if no config exists, check will offer to run init.

  Config file: .license-guard.json (commit this to your repo)
  `);
} else {
  console.error(`Unknown command: ${command}. Run wip-license-guard help.`);
  process.exit(1);
}
