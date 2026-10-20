import type { Database } from '@/db';
import { z } from 'zod';
import { Temporal } from 'temporal-polyfill';
import { localDateTimeToInstant,todayInZone } from '@/lib/time';
import { business,dateSchema,now,parse } from '../shared';
import { windowSchema } from '../settings/schemas';
import { getFreeMinutes,type Interval } from './availability';
export type AvailabilityDay={date:string;freeMinutes:number;configuredMinutes:number};
export function getAvailability(db:Database,query:{from?:string;to?:string}={}):{from:string;to:string;freeMinutes:number;configuredMinutes:number;days:AvailabilityDay[]} {
  const input=parse(z.object({from:dateSchema.optional(),to:dateSchema.optional()}).strict(),query);
  const first=Temporal.PlainDate.from(input.from ?? todayInZone(now()));
  const last=input.to?Temporal.PlainDate.from(input.to):first.add({days:6});
  const count=first.until(last,{largestUnit:'day'}).days+1;
  if(count<1 || count>93) business('Escolha um período inclusivo de um a 93 dias.');
  const setting=(key:string)=>{
    const row=db.$client.prepare('SELECT value_json FROM settings WHERE key=?').get(key) as {value_json:string}|undefined;
    if(!row) business('Configuração de horários não encontrada.');
    return JSON.parse(row.value_json) as unknown;
  };
  const windows=parse(z.array(windowSchema),setting('availabilityWindows'));
  const forum=parse(windowSchema,setting('forumHours'));
  const instant=(date:string,time:string)=>new Date(localDateTimeToInstant(date,time)).toISOString();
  const events=db.$client.prepare("SELECT starts_at AS startsAt,ends_at AS endsAt FROM calendar_events WHERE status!='cancelado' AND starts_at < ? AND ends_at > ?").all(instant(last.add({days:1}).toString(),'00:00'),instant(first.toString(),'00:00')) as Interval[];
  const days:AvailabilityDay[]=[];
  for(let index=0;index<count;index++) {
    const date=first.add({days:index}); const day=date.toString();
    const interval=(window:{start:string;end:string}):Interval=>({startsAt:instant(day,window.start),endsAt:instant(day,window.end)});
    const configured=windows.filter(window=>window.weekdays.includes(date.dayOfWeek)).map(interval);
    const occupied=forum.weekdays.includes(date.dayOfWeek)?[...events,interval(forum)]:events;
    days.push({date:day,configuredMinutes:getFreeMinutes(configured,[]),freeMinutes:getFreeMinutes(configured,occupied)});
  }
  return {from:first.toString(),to:last.toString(),configuredMinutes:days.reduce((sum,day)=>sum+day.configuredMinutes,0),freeMinutes:days.reduce((sum,day)=>sum+day.freeMinutes,0),days};
}
