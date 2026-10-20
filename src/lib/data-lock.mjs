import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

/** One app or maintenance process may own a data directory at a time. */
export function acquireDataLock(directory) {
  const lock = join(directory, 'server.lock');
  if (existsSync(lock)) {
    const previous = JSON.parse(readFileSync(lock, 'utf8'));
    if (!Number.isSafeInteger(previous.pid) || previous.pid <= 0) throw new Error('Lock de dados inválido. Verifique a manutenção anterior.');
    let alive = false;
    for(const pid of [previous.pid,previous.childPid].filter(Number.isSafeInteger)){
      try { process.kill(pid, 0); alive = true; } catch (error) { if (error.code !== 'ESRCH') alive = true; }
    }
    if (alive) throw new Error('Já há um servidor ou operação de manutenção usando esta base.');
    rmSync(lock);
  }
  const token = randomUUID();
  writeFileSync(lock, JSON.stringify({ pid: process.pid, token }), { flag: 'wx' });
  return () => {
    if (existsSync(lock) && JSON.parse(readFileSync(lock, 'utf8')).token === token) rmSync(lock);
  };
}
