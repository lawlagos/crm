import { build, transform } from 'esbuild';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { appsScriptCompatible } from './apps-script-compat.mjs';

// Deployment configuration can contain the VAPID private key. It must stay outside tracked source and Pages output.
const filename=process.env.CENTRAL_DEPLOYMENT_CONFIG ?? '.tooling/deployment/config.json';
const configuration=JSON.parse(await readFile(filename,'utf8'));
if (!configuration.sheetId || !configuration.clientId || !/^[0-9a-f]{64}$/i.test(configuration.vapidPrivateKey ?? '')) throw new Error('Configure the private deployment file before building Apps Script.');
const outDir=path.resolve('.tooling/deployment/apps-script');
await mkdir(outDir,{recursive:true});
const result=await build({entryPoints:['cloud/server/google.ts'],bundle:true,format:'iife',globalName:'CentralCloud',platform:'neutral',target:'es2019',supported:{bigint:true},write:false,define:{__CENTRAL_DEPLOYMENT__:JSON.stringify(configuration)},logLevel:'info'});
const compatible=appsScriptCompatible(result.outputFiles[0].text);
const compact=await transform(compatible,{minify:true,target:'es2019'});
await writeFile(path.join(outDir,'Motor.gs'),compact.code);
const functions=['doPost','doGet','configurarCentral','centralHourly','centralDaily'];
await writeFile(path.join(outDir,'Central.gs'),'// Central: selecione configurarCentral na barra superior e clique em Executar.\n// Autorize somente com a conta proprietaria. O codigo do aplicativo fica no arquivo Motor.\n\n'+functions.map(name=>`function ${name}(event) {\n  return CentralCloud.${name}(event);\n}`).join('\n\n')+'\n');
await copyFile('cloud/appsscript.json',path.join(outDir,'appsscript.json'));
console.log('Apps Script bundle prepared in the ignored deployment directory.');
