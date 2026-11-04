import nodeResolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import { rollupPluginHTML as html } from '@web/rollup-plugin-html';
import { importMetaAssets } from '@web/rollup-plugin-import-meta-assets';
import esbuild from 'rollup-plugin-esbuild';
import copy from 'rollup-plugin-copy';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { bundlePreviewComponents } from './lib/preview-components-bundle.mjs';

export default {
  input: 'index.html',
  output: {
    entryFileNames: '[hash].js',
    chunkFileNames: '[hash].js',
    assetFileNames: '[hash][extname]',
    format: 'es',
    dir: 'public',
  },
  preserveEntrySignatures: false,

  plugins: [
    {
      name: 'preview-components-bundle',
      async generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'mock-site/preview-components.js',
          source: await bundlePreviewComponents(),
        });
      },
    },
    html({
      minify: true,
    }),
    nodeResolve(),
    json(),
    commonjs(),
    esbuild({
      minify: true,
      target: ['chrome120', 'firefox121', 'edge120', 'safari17.2'],
    }),
    importMetaAssets(),
    babel({
      plugins: [
        [
          'babel-plugin-template-html-minifier',
          {
            modules: { lit: ['html', { name: 'css', encapsulation: 'style' }] },
            failOnError: false,
            strictCSS: true,
            htmlMinifier: {
              collapseWhitespace: true,
              conservativeCollapse: true,
              removeComments: true,
              caseSensitive: true,
              minifyCSS: true,
            },
          },
        ],
      ],
    }),
    copy({
      targets: [
        {
          src: 'node_modules/@haxtheweb/d-d-d/locales/ddd-card.es.json',
          dest: 'public/locales',
        },
        {
          src: ['mock-site/preview.html', 'mock-site/preview.css', 'mock-site/custom.js', 'mock-site/custom.css'],
          dest: 'public/mock-site',
        },
        {
          src: 'node_modules/monaco-editor/min/vs/**/*',
          dest: 'public/monaco-editor/min/vs',
        },
      ],
      hook: 'writeBundle',
    }),
  ],
};
