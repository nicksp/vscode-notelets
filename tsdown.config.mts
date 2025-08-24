import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['cjs'],
  sourcemap: process.env.NODE_ENV === 'development',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
  },
  dts: false,
  platform: 'node',
  external: [
    'vscode',
  ],
  minify: process.env.NODE_ENV === 'production',
})
