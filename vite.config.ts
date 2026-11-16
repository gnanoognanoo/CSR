import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const commonSecurityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

// Production-aligned CSP for previewing built assets
const previewCsp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co blob:",
  "worker-src 'self' blob:",
  "media-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

// Development CSP accommodating Vite HMR WebSockets and local script injection
const devCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss: https://*.supabase.co wss://*.supabase.co blob:",
  "worker-src 'self' blob:",
  "media-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export default defineConfig({
  plugins: [react()],
  optimizeDeps: { entries: ['index.html'] },
  build: { target: 'es2022' },
  server: {
    port: 5173,
    strictPort: true,
    headers: {
      ...commonSecurityHeaders,
      'Content-Security-Policy': devCsp,
    },
  },
  preview: {
    headers: {
      ...commonSecurityHeaders,
      'Content-Security-Policy': previewCsp,
    },
  },
});
