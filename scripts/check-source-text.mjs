import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const excluded = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  'output',
  'test-results',
  'playwright-report',
  '.playwright',
]);
const violations = [];
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await scan(path);
    else if (entry.isFile()) {
      const bytes = await readFile(path);
      if (bytes.includes(0)) continue;
      const lines = bytes.toString('utf8').split('\n');
      lines.forEach((line, index) => {
        if (line.includes(String.fromCodePoint(0x2014)))
          violations.push(`${relative(root, path)}:${index + 1}`);
      });
    }
  }
}
await scan(root);
if (violations.length) {
  console.error(
    `Em dashes are not allowed in repository source or documentation:\n${violations.join('\n')}`
  );
  process.exitCode = 1;
} else console.log('Source text check passed.');
