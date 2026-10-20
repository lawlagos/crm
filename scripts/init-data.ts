import { initializeDatabase, dataDirectory } from '../src/db';
if (process.argv.includes('--demo')) process.env.CENTRAL_DEMO = '1';
await initializeDatabase(dataDirectory());
process.stdout.write('Base inicializada. Nenhum contato ou recebimento de demonstração foi inserido.\n');
