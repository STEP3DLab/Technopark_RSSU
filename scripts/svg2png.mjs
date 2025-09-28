import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { optimize } from 'svgo';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CONFIG = [
  {
    source: path.join(ROOT, 'assets/icons/tabler'),
    destination: path.join(ROOT, 'assets/icons/png'),
  },
  {
    source: path.join(ROOT, 'assets/logos/svg'),
    destination: path.join(ROOT, 'assets/logos/png'),
  },
];

const SIZES = [64, 128, 256];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function* walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.svg')) {
      yield fullPath;
    }
  }
}

async function createPngVariants(svgPath, destinationDir) {
  const svgContent = await fs.readFile(svgPath, 'utf8');
  const optimized = optimize(svgContent, { path: svgPath, multipass: true });
  const svgBuffer = Buffer.from(optimized.data);
  const baseName = path.basename(svgPath, path.extname(svgPath));

  for (const size of SIZES) {
    const targetDir = path.join(destinationDir, String(size));
    await ensureDir(targetDir);
    const targetPath = path.join(targetDir, `${baseName}.png`);

    await sharp(svgBuffer)
      .resize({
        width: size,
        height: size,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(targetPath);
  }
}

async function main() {
  let processed = 0;

  for (const { source, destination } of CONFIG) {
    for await (const svgFile of walk(source)) {
      await createPngVariants(svgFile, destination);
      processed += 1;
    }
  }

  if (processed === 0) {
    console.warn('No SVG files found.');
  } else {
    console.log(`Generated PNG variants for ${processed} SVG file(s).`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
