import { expect, test, vi } from 'vitest';
const mocks=vi.hoisted(()=>({materialize:vi.fn(()=>{throw new Error('invalid series');}),backup:vi.fn(async()=>{}),db:{}}));
vi.mock('@/db',()=>({getDb:()=>mocks.db}));
vi.mock('@/features/routines/materialize',()=>({materializeOccurrences:mocks.materialize}));
vi.mock('@/features/backup/service',()=>({ensureDailyBackup:mocks.backup}));
import { getJobsStatus,runJobs } from './jobs';

test('a recurrence failure still allows the daily backup and reports a failed job',async()=>{
 await runJobs();
 expect(mocks.backup).toHaveBeenCalledWith(mocks.db);
 expect(getJobsStatus().failed).toBe(true);
});
