import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/Falling-Wan-Nyan/' : '/',
  server: {
    port: 8000,
    host: '0.0.0.0',
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: 'index.html'
    }
  },
  publicDir: 'data',
  assetsInclude: ['**/*.png', '**/*.wav', '**/*.json', '**/*.jpeg', '**/*.jpg'],
  esbuild: {
    target: 'es2020'
  }
})