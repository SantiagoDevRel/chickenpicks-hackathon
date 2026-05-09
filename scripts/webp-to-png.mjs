// One-shot conversion: WebP → PNG for apps/mobile/assets/pollitos.
// Expo prebuild's image processor (Jimp) does not accept WebP for icon /
// splash / adaptiveIcon, so we keep PNG copies in apps/mobile.
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'apps/mobile/assets/pollitos';
const files = readdirSync(dir).filter((f) => f.endsWith('.webp'));

for (const f of files) {
  const inp = join(dir, f);
  const out = join(dir, f.replace(/\.webp$/, '.png'));
  await sharp(inp).png().toFile(out);
  console.log('OK', out);
}
