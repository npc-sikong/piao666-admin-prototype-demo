import {build} from 'esbuild';
import path from 'node:path';
await build({entryPoints:['scripts/verify.ts'],outfile:'evidence/verify-runner.mjs',bundle:true,platform:'node',format:'esm',packages:'external',alias:{'@':path.resolve('src'),'@piao777/api-client':path.resolve('shared/api-client/index.ts'),'@piao777/ui-tokens':path.resolve('shared/ui-tokens/index.ts')},logLevel:'warning'});
await import('../evidence/verify-runner.mjs?run='+Date.now());
