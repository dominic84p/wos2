import fs from 'fs';
import path from 'path';

// Only run on Cloudflare Pages builds so Vercel keeps all files
const isCloudflare = process.env.CF_PAGES === '1' || process.env.CLOUDFLARE_PAGES === 'true' || process.env.CF_PAGES_BRANCH;

if (!isCloudflare) {
  console.log('[Build Optimizer] Not building on Cloudflare Pages (e.g. Vercel/Local). Keeping all large files intact.');
  process.exit(0);
}

const distDir = path.resolve('dist');
const MAX_BYTES = 24 * 1024 * 1024; // 24 MB (Cloudflare Pages limit is 25 MiB)

function cleanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      cleanDir(fullPath);
    } else if (entry.isFile()) {
      const stats = fs.statSync(fullPath);
      if (stats.size > MAX_BYTES) {
        console.log(`[Cloudflare Pages] Stripping oversized file (${(stats.size / 1024 / 1024).toFixed(2)} MB): ${path.relative(distDir, fullPath)}`);
        fs.unlinkSync(fullPath);
      }
    }
  }
}

console.log('[Cloudflare Pages] Scanning dist/ for files exceeding 24MB...');
cleanDir(distDir);
console.log('[Cloudflare Pages] Asset validation passed. Ready for deployment!');
