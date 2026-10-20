import fs from 'node:fs';
import { parse } from 'yaml';

const design = fs.readFileSync('DESIGN.md', 'utf8');
const tokens = parse(design.split('---')[1]);
const lines = ['/* Generated from DESIGN.md by scripts/design-check.mjs. Do not edit. */', ':root {'];
for (const [key, value] of Object.entries(tokens.colors)) lines.push(`  --color-${key}: ${value};`);
for (const [key, value] of Object.entries(tokens.rounded)) lines.push(`  --radius-${key.toLowerCase()}: ${value};`);
for (const [key, value] of Object.entries(tokens.spacing)) lines.push(`  --space-${key}: ${value};`);
for (const [key, value] of Object.entries(tokens.typography)) {
  const families = value.fontFamily.split(',').map(family => family.trim());
  const family = families.map(name => name.includes(' ') ? JSON.stringify(name) : name).join(', ');
  lines.push(`  --font-${key}: ${family};`);
}
for (const [key, value] of Object.entries(tokens.components)) lines.push(`  --height-${key}: ${value.height};`);
lines.push('}', '');
const output = lines.join('\n');
fs.mkdirSync('src/styles', { recursive: true });
if (process.argv.includes('--check')) {
  if (fs.readFileSync('src/styles/tokens.css', 'utf8') !== output) throw new Error('Design tokens drifted. Run npm run design:check.');
} else fs.writeFileSync('src/styles/tokens.css', output);
console.log('Design tokens match DESIGN.md.');
