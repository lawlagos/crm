import { createBackup } from '../src/features/backup/service';
if(process.argv.includes('--demo'))process.env.CENTRAL_DEMO='1';
const backup=await createBackup();
process.stdout.write(`Backup validado: ${backup.path}\n`);
process.exit(0);
