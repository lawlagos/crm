import { z } from 'zod';
import { DomainError } from '@/lib/contracts';
import { areaCreate, areaPatch, preferenceInput } from './schemas';
import { business, camelPatch, dto, getRow, id, insert, now, parse, update, version, type Handler } from '../shared';
import { netSql } from '../finance/receivables';
export const createArea: Handler = (db,input) => {
  const value = parse(areaCreate,input); const time = now();
  return dto(insert(db,'business_areas',{ id:id(), name:value.name, color_key:value.colorKey, commercial_enabled:Number(value.commercialEnabled), archived_at:null, version:1, created_at:time, updated_at:time }));
};
export const updateArea: Handler = (db,input,meta) => {
  const value = parse(areaPatch,input); const current = getRow(db,'business_areas',value.id); version(current,meta);
  return dto(update(db,'business_areas',value.id,camelPatch(value,['name','colorKey'])));
};
export const archiveArea: Handler = (db,input,meta) => {
  const value = parse(z.object({ id:z.string() }).strict(),input); const current = getRow(db,'business_areas',value.id); version(current,meta);
  const dependencies: [string,string][] = [
    ['tarefas',"SELECT 1 FROM tasks WHERE area_id=? AND status NOT IN ('concluida','cancelada') LIMIT 1"],
    ['projetos',"SELECT 1 FROM projects WHERE area_id=? AND status IN ('ativo','pausado') LIMIT 1"],
    ['oportunidades',"SELECT 1 FROM opportunities WHERE area_id=? AND stage NOT IN ('ganho','perdido') LIMIT 1"],
    ['saldo financeiro',`SELECT 1 FROM receivables r WHERE area_id=? AND cancelled_at IS NULL AND amount_cents>${netSql} LIMIT 1`],
    ['eventos futuros',"SELECT 1 FROM calendar_events WHERE area_id=? AND status='agendado' AND ends_at > ? LIMIT 1"],
    ['séries ativas','SELECT 1 FROM recurrence_series WHERE area_id=? AND active=1 LIMIT 1'],
  ];
  const blocked = dependencies.filter(([,sql]) => db.$client.prepare(sql).get(...(sql.includes('ends_at') ? [value.id,now()] : [value.id]))).map(([name])=>name);
  if (blocked.length) throw new DomainError('BUSINESS_RULE',`Resolva os vínculos antes de arquivar: ${blocked.join(', ')}.`,{ dependencies:JSON.stringify(blocked) });
  return dto(update(db,'business_areas',value.id,{ archived_at:now() }));
};
export const restoreArea: Handler = (db,input,meta) => {
  const value = parse(z.object({ id:z.string() }).strict(),input); const current = getRow(db,'business_areas',value.id); version(current,meta);
  return dto(update(db,'business_areas',value.id,{ archived_at:null }));
};
export const updatePreferences: Handler = (db,input,meta) => {
  const value = parse(preferenceInput,input);
  const row = db.$client.prepare('SELECT * FROM settings WHERE key=?').get(value.key) as { version:number } | undefined;
  if (!row) business('Preferência desconhecida.'); version(row as unknown as Record<string,unknown>,meta);
  db.$client.prepare('UPDATE settings SET value_json=?, version=version+1 WHERE key=?').run(JSON.stringify(value.value),value.key);
  return { key:value.key,value:value.value,version:row.version+1 };
};
