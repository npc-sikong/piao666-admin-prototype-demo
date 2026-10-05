import { build } from 'esbuild';
import path from 'node:path';
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => null, setItem: () => {} }, configurable: true });
await build({ entryPoints: ['scripts/verify-list-workspaces.ts'], outfile: '.local/verify-list-workspaces.mjs', bundle: true, platform: 'node', format: 'esm', packages: 'external', alias: { '@': path.resolve('src'), '@piao777/api-client': path.resolve('shared/api-client/index.ts'), '@piao777/ui-tokens': path.resolve('shared/ui-tokens/index.ts') }, logLevel: 'warning' });
await import('../.local/verify-list-workspaces.mjs?run=' + Date.now());
