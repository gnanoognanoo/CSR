import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const headersPath = path.join(root, 'public/_headers');
const viteConfigPath = path.join(root, 'vite.config.ts');
const indexPath = path.join(root, 'index.html');

test('L3 Verification 1: public/_headers contains all required HTTP security headers', () => {
  assert.ok(existsSync(headersPath), 'public/_headers must exist');
  const content = readFileSync(headersPath, 'utf8');

  // 1. Clickjacking protection
  assert.match(content, /X-Frame-Options:\s*DENY/i, 'Must set X-Frame-Options: DENY');

  // 2. MIME sniffing protection
  assert.match(content, /X-Content-Type-Options:\s*nosniff/i, 'Must set X-Content-Type-Options: nosniff');

  // 3. Referrer privacy policy
  assert.match(
    content,
    /Referrer-Policy:\s*strict-origin-when-cross-origin/i,
    'Must set Referrer-Policy: strict-origin-when-cross-origin'
  );

  // 4. Permissions policy
  assert.match(
    content,
    /Permissions-Policy:\s*camera=\(\),\s*microphone=\(\),\s*geolocation=\(\),\s*payment=\(\),\s*usb=\(\)/i,
    'Must restrict unused browser APIs in Permissions-Policy'
  );

  // 5. HSTS only for production HTTPS, without unverified includeSubDomains or preload
  assert.match(
    content,
    /Strict-Transport-Security:\s*max-age=31536000(?!\s*;\s*includeSubDomains)(?!\s*;\s*preload)/i,
    'Must set 1-year HSTS without unverified includeSubDomains or preload'
  );
  assert.ok(
    !content.includes('includeSubDomains'),
    'HSTS must not include includeSubDomains without domain verification'
  );
  assert.ok(
    !content.includes('preload'),
    'HSTS must not include preload without domain verification'
  );
});

test('L3 Verification 2: public/_headers Content-Security-Policy enforces strict directives and application compatibility', () => {
  const content = readFileSync(headersPath, 'utf8');
  assert.match(content, /Content-Security-Policy:/i, 'Must configure Content-Security-Policy');

  // Extract CSP header line
  const cspLine = content
    .split('\n')
    .find(line => line.trim().startsWith('Content-Security-Policy:'));
  assert.ok(cspLine, 'Content-Security-Policy line must exist');

  // Verify core directives
  assert.match(cspLine, /default-src\s+'self'/, "CSP must contain default-src 'self'");
  assert.match(cspLine, /script-src\s+'self'/, "CSP must contain script-src 'self'");

  // Unsafe script execution check: must NOT contain 'unsafe-inline' or 'unsafe-eval' in script-src
  const scriptSrcPart = cspLine.match(/script-src[^;]+/)?.[0] || '';
  assert.ok(
    !scriptSrcPart.includes("'unsafe-inline'"),
    "Production script-src must NOT contain 'unsafe-inline'"
  );
  assert.ok(
    !scriptSrcPart.includes("'unsafe-eval'"),
    "Production script-src must NOT contain 'unsafe-eval'"
  );

  // Style directive: requires 'unsafe-inline' for React inline styles
  assert.match(
    cspLine,
    /style-src\s+'self'\s+'unsafe-inline'/,
    "CSP must permit 'unsafe-inline' in style-src for React component inline styling"
  );

  // Image directive: supports local assets, Three.js data/blob textures, and Supabase Storage
  assert.match(
    cspLine,
    /img-src\s+'self'\s+data:\s+blob:\s+https:\/\/\*\.supabase\.co/,
    'CSP img-src must support self, data:, blob:, and https://*.supabase.co'
  );

  // Font directive: self-hosted @fontsource WOFF2 files and data URIs
  assert.match(cspLine, /font-src\s+'self'\s+data:/, 'CSP font-src must support self and data:');

  // Connect directive: Supabase HTTPS API and Realtime WebSockets
  assert.match(
    cspLine,
    /connect-src\s+'self'\s+https:\/\/\*\.supabase\.co\s+wss:\/\/\*\.supabase\.co\s+blob:/,
    'CSP connect-src must permit Supabase HTTPS, Supabase Realtime WSS, and blob:'
  );

  // Worker directive: Three.js WebGL workers / image decoders
  assert.match(cspLine, /worker-src\s+'self'\s+blob:/, "CSP worker-src must permit 'self' blob:");

  // Framing & Injection constraints
  assert.match(cspLine, /object-src\s+'none'/, "CSP must block plugins with object-src 'none'");
  assert.match(cspLine, /frame-ancestors\s+'none'/, "CSP must block framing with frame-ancestors 'none'");
  assert.match(cspLine, /base-uri\s+'self'/, "CSP must restrict base-uri to 'self'");
  assert.match(cspLine, /form-action\s+'self'/, "CSP must restrict form-action to 'self'");
});

test('L3 Verification 3: vite.config.ts separates dev vs preview headers and avoids dev breakage', () => {
  const viteConfig = readFileSync(viteConfigPath, 'utf8');

  // 1. Both server and preview configure common security headers
  assert.match(viteConfig, /'X-Frame-Options':\s*'DENY'/, 'Vite must configure X-Frame-Options');
  assert.match(viteConfig, /'X-Content-Type-Options':\s*'nosniff'/, 'Vite must configure X-Content-Type-Options');
  assert.match(viteConfig, /'Referrer-Policy':\s*'strict-origin-when-cross-origin'/, 'Vite must configure Referrer-Policy');

  // 2. Dev server accommodates local HMR WebSockets
  assert.match(
    viteConfig,
    /connect-src[^;]*\bws:\s+wss:/,
    'Vite development server CSP must permit ws: and wss: for Hot Module Replacement'
  );

  // 3. Neither dev nor preview sets HSTS locally
  assert.ok(
    !viteConfig.includes('Strict-Transport-Security'),
    'Vite local dev and preview servers must NOT send HSTS over local HTTP'
  );

  // 4. Preview server uses production-aligned script-src 'self'
  assert.match(
    viteConfig,
    /preview:\s*\{[\s\S]*previewCsp/,
    'Vite preview server must use production-aligned preview CSP'
  );
});

test('L3 Verification 4: index.html provides documented meta fallbacks without unsupported directives', () => {
  const indexHtml = readFileSync(indexPath, 'utf8');

  // 1. Referrer meta tag
  assert.match(
    indexHtml,
    /<meta\s+name="referrer"\s+content="strict-origin-when-cross-origin"\s*\/?>/,
    'index.html must include meta referrer policy'
  );

  // 2. Fallback meta CSP
  assert.match(
    indexHtml,
    /<meta\s+http-equiv="Content-Security-Policy"\s+content="[^"]*default-src\s+'self'/,
    'index.html must include meta CSP fallback'
  );

  // 3. Meta CSP must NOT include frame-ancestors (unsupported in meta and causes browser warning)
  const metaCspMatch = indexHtml.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/);
  assert.ok(metaCspMatch, 'Meta CSP tag must be found');
  assert.ok(
    !metaCspMatch[1].includes('frame-ancestors'),
    'Meta CSP must omit frame-ancestors (unsupported in HTML meta tags)'
  );

  // 4. Contains documentation of meta limitations
  assert.match(
    indexHtml,
    /LIMITATIONS:\s*HTTP response headers/i,
    'index.html must document the limitations of meta CSP'
  );
});

test('L3 Verification 5: Deployment cleanliness and platform-specific checks', () => {
  // Confirm unverified platform configurations like vercel.json were NOT blindly created
  const vercelPath = path.join(root, 'vercel.json');
  assert.equal(existsSync(vercelPath), false, 'vercel.json should not be created when Vercel is not a deployment target');
});
