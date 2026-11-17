import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const entryRoot = dirname(fileURLToPath(import.meta.url));
const destination = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? join(entryRoot, 'out'));
const handInFolders = ['game', 'screenshots'];
const officialLimits = {
  text_max_bytes: 160 * 1024,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

function collectHandIn(root: string, target: string) {
  if (existsSync(target) && readdirSync(target).length !== 0) {
    throw new Error('Choose an empty MAKEFUN_OUTPUT_DIR for each hand-in.');
  }
  const captures = readdirSync(join(root, 'screenshots'), { withFileTypes: true });
  const imageCount = captures.filter(capture => capture.isFile() && !capture.name.startsWith('.')).length;
  if (imageCount < 3 || imageCount > officialLimits.screenshots.max) {
    throw new Error('A hand-in needs three or four browser captures.');
  }
  const catalog = buildDossier(root, officialLimits);
  if (catalog.byteLength > 1536 * 1024) {
    throw new Error('The dossier exceeds the 1.5 MiB contest limit.');
  }
  mkdirSync(target, { recursive: true });
  for (const folder of handInFolders) {
    cpSync(join(root, folder), join(target, folder), { recursive: true });
  }
  writeFileSync(join(target, 'dossier.json'), catalog);
}

collectHandIn(entryRoot, destination);
