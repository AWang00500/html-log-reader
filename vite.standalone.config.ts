import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

const ROOT_DIR = import.meta.dirname;
const OUT_DIR = 'windows-standalone';

function inlineSingleFilePlugin(outDir: string): Plugin {
  return {
    name: 'inline-single-file-windows',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlChunk = bundle['index.html'];
      if (!htmlChunk || htmlChunk.type !== 'asset') {
        return;
      }

      let html =
        typeof htmlChunk.source === 'string'
          ? htmlChunk.source
          : Buffer.from(htmlChunk.source).toString('utf-8');

      const cssParts: string[] = [];
      const jsParts: string[] = [];
      const keysToDelete: string[] = [];

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.endsWith('.css') && chunk.type === 'asset') {
          const cssText =
            typeof chunk.source === 'string'
              ? chunk.source
              : Buffer.from(chunk.source).toString('utf-8');
          cssParts.push(cssText);
          keysToDelete.push(fileName);
        } else if (fileName.endsWith('.js') && chunk.type === 'chunk') {
          jsParts.push(chunk.code);
          keysToDelete.push(fileName);
        }
      }

      // Remove external module script, modulepreload, and local CSS link tags
      html = html.replace(/<script\b[^>]*\btype="module"[^>]*><\/script>\s*/gi, '');
      html = html.replace(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="(?:\.?\/)?assets\/[^"]*\.css"[^>]*>\s*/gi, '');
      html = html.replace(/<link\b[^>]*\brel="modulepreload"[^>]*>\s*/gi, '');

      if (cssParts.length > 0) {
        const combinedCss = cssParts.join('\n').replace(/<\/style/gi, '<\\/style');
        html = html.replace('</head>', () => `  <style>\n${combinedCss}\n  </style>\n  </head>`);
      }

      if (jsParts.length > 0) {
        const combinedJs = jsParts.join('\n').replace(/<\/script/gi, '<\\/script');
        html = html.replace('</body>', () => `  <script>\n${combinedJs}\n  </script>\n  </body>`);
      }

      htmlChunk.source = html;

      for (const key of keysToDelete) {
        delete bundle[key];
      }
    },
    closeBundle() {
      const assetsDir = path.resolve(ROOT_DIR, outDir, 'assets');
      if (fs.existsSync(assetsDir) && fs.readdirSync(assetsDir).length === 0) {
        fs.rmdirSync(assetsDir);
      }
    },
  };
}

export default defineConfig({
  base: './',
  mode: 'production',
  plugins: [
    react(),
    tailwindcss(),
    inlineSingleFilePlugin(OUT_DIR),
  ],
  resolve: {
    alias: {
      '@': ROOT_DIR,
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    assetsInlineLimit: 100 * 1024 * 1024,
    cssCodeSplit: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        format: 'iife',
        codeSplitting: false,
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/app.js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
