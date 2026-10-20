import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const path = (value: string) => fileURLToPath(new URL(value, import.meta.url));
export default defineConfig({
  root: path('./web/'),
  base: '/crm/',
  plugins: [react(), tailwind()],
  resolve: { alias: [
    { find: 'next/link', replacement: path('./web/shims/link.tsx') },
    { find: 'next/navigation', replacement: path('./web/shims/navigation.tsx') },
    { find: '@', replacement: path('./src') },
  ] },
  build: { outDir: path('./dist/web'), emptyOutDir: true },
  server: { host: '127.0.0.1', port: 4173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
});
