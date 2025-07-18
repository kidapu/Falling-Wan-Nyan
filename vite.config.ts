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
      input: {
        main: 'index.html',
        debug: 'index2.html'
      }
    }
  },
  publicDir: 'public',
  assetsInclude: ['**/*.png', '**/*.wav', '**/*.json'],
  esbuild: {
    target: 'es2020'
  }
})