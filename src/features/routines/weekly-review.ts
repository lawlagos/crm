import { z } from 'zod';
import { Temporal } from 'temporal-polyfill';
import { getDb, type Database } from '@/db';
import { business, dto, insert, now, parse, update, version, type Handler, type Row } from '../shared';
function validateWeek(week:string) {
  if (!/^\d{4}-W\d{2}$/.test(week)) business('Informe uma semana ISO válida.');
  const [year,index] = week.split('-W').map(Number); const last = Temporal.PlainDate.from({year,month:12,day:28}).weekOfYear;
  if (index<1 || index>Number(last)) business('Informe uma semana ISO existente.');
}
export function getWeeklyReview(week:string,db:Database=getDb()) { validateWeek(week); const row=db.$client.prepare('SELECT * FROM weekly_reviews WHERE week=?').get(week) as Row|undefined; return row ? dto(row) : {id:week,week,checklist:{},version:0}; }
export const saveWeeklyReview: Handler = (db,input,meta) => {
  const value = parse(z.object({ week:z.string(), checklist:z.partialRecord(z.enum(['inbox','overdue','waiting','projects','commercial','calendar','finance','focus']),z.boolean()) }).strict(),input); validateWeek(value.week);
  const current=db.$client.prepare('SELECT * FROM weekly_reviews WHERE week=?').get(value.week) as Row|undefined;
  if (current) { version(current,meta); return dto(update(db,'weekly_reviews',current.id,{checklist:JSON.stringify(value.checklist)})); }
  const time=now(); return dto(insert(db,'weekly_reviews',{id:value.week,week:value.week,checklist:JSON.stringify(value.checklist),version:1,created_at:time,updated_at:time}));
};
