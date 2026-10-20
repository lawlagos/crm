import { getDb, type Database } from '@/db';
import { dto, type Row } from '../shared';
export function searchAll(text: string, db: Database = getDb(),areaId?:string): Record<string, Row[]> {
  const term = text.trim().slice(0, 160); if (!term) return {};
  const match = `%${term.replaceAll('\\','\\\\').replaceAll('%','\\%').replaceAll('_','\\_')}%`;
  const definitions: Record<string, [string,string[]]> = { tasks: ['tasks',['title']], projects: ['projects',['name']], contacts: ['contacts',['name','phone','email']], opportunities: ['opportunities',['offer_name']], receivables: ['receivables',['description']], calendar: ['calendar_events',['title']] };
  return Object.fromEntries(Object.entries(definitions).map(([key,[table,fields]]) => {
    const scoped=Boolean(areaId && areaId!=='all');
    const areaClause=!scoped?'':key==='contacts'?' AND (EXISTS(SELECT 1 FROM contact_relationships ca WHERE ca.contact_id=r.id AND ca.area_id=?) OR EXISTS(SELECT 1 FROM opportunities o WHERE o.contact_id=r.id AND o.area_id=?) OR EXISTS(SELECT 1 FROM projects p WHERE p.contact_id=r.id AND p.area_id=?))':' AND r.area_id=?';
    const areaParams=!scoped?[]:key==='contacts'?[areaId,areaId,areaId]:[areaId];
    const patterns=fields.map(field=>field==='phone' && /\d/.test(term)?`%${term.replace(/\D/g,'')}%`:match);
    return [key,(db.$client.prepare(`SELECT r.* FROM ${table} r WHERE (${fields.map(field => `r.${field} LIKE ? ESCAPE '\\'`).join(' OR ')})${areaClause} LIMIT 20`).all(...patterns,...areaParams) as Row[]).map(dto)];
  }));
}
