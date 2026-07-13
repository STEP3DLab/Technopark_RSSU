const fs = require('fs');
const path = require('path');

const root = __dirname;
const output = path.join(root, '..', 'RGSU_SKB_working_site.html');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const logo = fs.readFileSync(path.join(root, 'assets', 'rgsu-logo.png'));

const fontFiles = [
  'Manrope-Regular.subset.ttf',
  'Manrope-Medium.subset.ttf',
  'Manrope-SemiBold.subset.ttf',
  'Manrope-Bold.subset.ttf',
  'Manrope-ExtraBold.subset.ttf'
];

for (const file of fontFiles) {
  const bytes = fs.readFileSync(path.join(root, 'assets', 'fonts', file));
  const dataUri = `data:font/ttf;base64,${bytes.toString('base64')}`;
  css = css.replace(`assets/fonts/${file}`, dataUri);
}

const logoDataUri = `data:image/png;base64,${logo.toString('base64')}`;
html = html
  .replace(/\s*<link rel="icon" href="assets\/rgsu-logo\.png"[^>]*>/, '')
  .replace(/\s*<link rel="apple-touch-icon" href="assets\/rgsu-logo\.png">/, '')
  .replace(/\s*<link rel="manifest" href="manifest\.webmanifest">/, '')
  .replace(/\s*<link rel="preload" href="assets\/fonts\/Manrope-Regular\.subset\.ttf"[^>]*>/, '')
  .replace(/\s*<link rel="preload" href="assets\/fonts\/Manrope-ExtraBold\.subset\.ttf"[^>]*>/, '');
html = html.replaceAll('assets/rgsu-logo.png', logoDataUri);

const projectImages = [
  'award-final.webp',
  'award-stage.webp',
  'theater-cad.webp',
  'theater-making.webp',
  'theater-installation.webp',
  'theater-final.webp'
];

for (const file of projectImages) {
  const bytes = fs.readFileSync(path.join(root, 'assets', 'step3d', file));
  const dataUri = `data:image/webp;base64,${bytes.toString('base64')}`;
  html = html.replaceAll(`assets/step3d/${file}`, dataUri);
}

html = html
  .replace('<link rel="stylesheet" href="styles.css">', `<style>\n${css}\n</style>`)
  .replace('<script src="script.js"></script>', `<script>\n${js}\n</script>`);

const localReferences = ['styles.css', 'script.js', 'manifest.webmanifest', 'assets/rgsu-logo.png', 'assets/fonts/', 'assets/step3d/'];
const unresolved = localReferences.filter((reference) => html.includes(reference));
if (unresolved.length) {
  throw new Error(`Standalone build contains unresolved local references: ${unresolved.join(', ')}`);
}
if (!html.includes('data:image/png;base64,') || !html.includes('data:font/ttf;base64,')) {
  throw new Error('Standalone build is missing embedded logo or fonts');
}

fs.writeFileSync(output, html);
console.log(output);
