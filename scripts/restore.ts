import { resolve } from 'node:path';
import { dataDirectory } from '../src/db';
import { restoreBackup } from '../src/features/backup/service';
if(process.argv.includes('--demo'))process.env.CENTRAL_DEMO='1';
const file=process.argv.slice(2).find(arg=>!arg.startsWith('--'));
if(!file)throw new Error('Uso: npm run data:restore -- caminho-absoluto-do-backup [--demo]');
await restoreBackup(resolve(file),dataDirectory());
process.stdout.write('Restauração concluída; banco anterior preservado em backup.\n');
