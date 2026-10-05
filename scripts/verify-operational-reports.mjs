import { build } from 'esbuild';
import path from 'node:path';
const saved=new Map();
Object.defineProperty(globalThis,'localStorage',{value:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)},configurable:true});
await build({ entryPoints: ['scripts/verify-operational-reports.ts'], outfile: '.local/verify-operational-reports.mjs', bundle: true, platform: 'node', format: 'esm', packages: 'external',
  alias: { '@': path.resolve('src'), '@piao777/api-client': path.resolve('shared/api-client/index.ts'), '@piao777/ui-tokens': path.resolve('shared/ui-tokens/index.ts') }, logLevel: 'warning' });
await import('../.local/verify-operational-reports.mjs?run=' + Date.now());
