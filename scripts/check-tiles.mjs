import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const baseDir = join(process.cwd(), 'public', 'tiles', 'ac-ibitsu');
const suits = ['m', 'p', 's'];
const honors = ['ton', 'nan', 'sha', 'pei', 'haku', 'hatsu', 'chun'];

const expected = [
  ...suits.flatMap(suit => Array.from({ length: 9 }, (_, i) => `${i + 1}${suit}.png`)),
  ...honors.map(name => `${name}.png`)
];

if (!existsSync(baseDir)) {
  console.error(`Missing directory: ${baseDir}`);
  process.exit(1);
}

const present = new Set(readdirSync(baseDir));
const missing = expected.filter(name => !present.has(name));

if (missing.length === 0) {
  console.log('All tile images are present.');
  process.exit(0);
}

console.log('Missing tile images:');
missing.forEach(name => console.log(`- ${name}`));
process.exit(2);
