import { getDb, type Database } from '@/db';
import { DomainError, type Page } from '@/lib/contracts';
import { localDateTimeToInstant, todayInZone } from '@/lib/time';
import { Temporal } from 'temporal-polyfill';
import { dto, now, type Row } from './shared';
import { receivableDto, netSql } from './finance/receivables';
import { getFinancialSummary } from './finance/summary';
import { validateInterval } from './calendar/availability';

const resources: Record<string, { table: string; text: string; order: string }> = {
  tasks: { table: 'tasks', text: 'title', order: "CASE r.priority WHEN 'alta' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, r.due_date IS NULL, r.due_date, r.created_at" },
  projects: { table: 'projects', text: 'name', order: 'r.created_at DESC' },
  contacts: { table: 'contacts', text: 'name', order: 'r.name COLLATE NOCASE' },
  opportunities: { table: 'opportunities', text: 'offer_name', order: "CASE WHEN r.next_action_date < date('now','-3 hours') THEN 0 WHEN r.next_action_date = date('now','-3 hours') THEN 1 WHEN r.next_action IS NULL THEN 2 ELSE 3 END, r.next_action_date, r.created_at" },
  receivables: { table: 'receivables', text: 'description', order: 'r.due_date, r.created_at' },
  calendar: { table: 'calendar_events', text: 'title', order: 'r.starts_at' },
  series: { table: 'recurrence_series', text: 'title', order: 'r.created_at DESC' },
};
export function getBootstrap(db: Database = getDb()) {
  const areas = (db.$client.prepare('SELECT * FROM business_areas ORDER BY created_at,id').all() as Row[]).map(dto);
  const settings = Object.fromEntries((db.$client.prepare('SELECT * FROM settings').all() as Row[]).map(row => [String(row.key), JSON.parse(String(row.value_json))]));
  const settingsVersions = Object.fromEntries((db.$client.prepare('SELECT key,version FROM settings').all() as Row[]).map(row => [String(row.key), row.version]));
  return { areas, settings, settingsVersions, serverNow: now(), isDemo: process.env.CENTRAL_DEMO === '1' };
}
export function readResource(resource: string, query: Record<string, string> = {}, db: Database = getDb()): Page<Row> {
  const definition = resources[resource]; if (!definition) throw new DomainError('NOT_FOUND', 'Recurso não encontrado.');
  const requestedPage = query.page === undefined ? 1 : Number(query.page); const requestedPageSize = query.pageSize === undefined ? 25 : Number(query.pageSize);
  if (!Number.isSafeInteger(requestedPage) || requestedPage < 1 || !Number.isSafeInteger(requestedPageSize) || requestedPageSize < 1) throw new DomainError('VALIDATION','Página e tamanho devem ser inteiros positivos.');
  const pageSize = Math.min(100, requestedPageSize);
  const sortFields: Record<string,string> = { createdAt:'r.created_at', dueDate:'r.due_date', priority:"CASE r.priority WHEN 'alta' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END", title:'r.title', name:'r.name', startsAt:'r.starts_at', nextActionDate:'r.next_action_date', amountCents:'r.amount_cents' };
  const allowedSort: Record<string,string[]> = { tasks:['createdAt','dueDate','priority','title'], projects:['createdAt','name'], contacts:['createdAt','name'], opportunities:['createdAt','nextActionDate'], receivables:['createdAt','dueDate','amountCents'], calendar:['createdAt','startsAt','title'], series:['createdAt','title'] };
  if ((query.sort && !allowedSort[resource].includes(query.sort)) || (query.direction && !['asc','desc'].includes(query.direction))) throw new DomainError('VALIDATION','Ordenação inválida.');
  const order = query.sort ? `${sortFields[query.sort]} ${query.direction === 'desc' ? 'DESC' : 'ASC'}, r.id` : definition.order;
  const conditions: string[] = []; const params: unknown[] = [];
  const add = (sql: string, ...values: unknown[]) => { conditions.push(sql); params.push(...values); };
  if (query.search?.trim()) {
    const escaped=query.search.trim().slice(0,160).replaceAll('\\','\\\\').replaceAll('%','\\%').replaceAll('_','\\_');
    if(resource==='contacts') {const digits=query.search.replace(/\D/g,'');add("(r.name LIKE ? ESCAPE '\\' OR r.email LIKE ? ESCAPE '\\' OR (? != '' AND r.phone LIKE ?))",`%${escaped}%`,`%${escaped}%`,digits,`%${digits}%`);}
    else add(`r.${definition.text} LIKE ? ESCAPE '\\'`,`%${escaped}%`);
  }
  if (query.id) add('r.id=?', query.id);
  if (query.areaId && query.areaId !== 'all' && resource !== 'contacts') add('r.area_id=?', query.areaId);
  if (query.areaId && query.areaId !== 'all' && resource === 'contacts') add('(EXISTS(SELECT 1 FROM contact_relationships ca WHERE ca.contact_id=r.id AND ca.area_id=?) OR EXISTS(SELECT 1 FROM opportunities o WHERE o.contact_id=r.id AND o.area_id=?) OR EXISTS(SELECT 1 FROM projects p WHERE p.contact_id=r.id AND p.area_id=?))',query.areaId,query.areaId,query.areaId);
  if (query.projectId && ['tasks','opportunities','receivables','calendar'].includes(resource)) add('r.project_id=?', query.projectId);
  if (query.contactId && ['projects','opportunities','receivables','calendar'].includes(resource)) add('r.contact_id=?', query.contactId);
  if (query.priority && resource === 'tasks') add('r.priority=?', query.priority);
  const statusField = resource === 'opportunities' ? 'stage' : 'status';
  if (query.status && ['tasks','projects','opportunities','calendar'].includes(resource)) {
    if (query.status === 'open') add(resource === 'opportunities' ? "r.stage NOT IN ('ganho','perdido')" : "r.status NOT IN ('concluida','cancelada')");
    else add(`r.${statusField}=?`, query.status);
  }
  if (query.stage && resource === 'opportunities') add('r.stage=?', query.stage);
  if (query.archived === 'false' && resource === 'contacts') add('r.archived_at IS NULL');
  const today = todayInZone(query.now || now());
  if (query.overdue === 'true') {
    if (resource === 'tasks') add("r.due_date < ? AND r.status NOT IN ('concluida','cancelada')", today);
    if (resource === 'opportunities') add("r.next_action_date < ? AND r.stage NOT IN ('ganho','perdido')", today);
    if (resource === 'receivables') add(`r.due_date < ? AND r.cancelled_at IS NULL AND r.amount_cents > ${netSql}`, today);
  }
  if (resource === 'opportunities' && query.withoutNextAction === 'true') add("(r.next_action IS NULL OR r.next_action='') AND r.stage NOT IN ('ganho','perdido')");
  if (resource === 'tasks' && query.focus === 'true') add("r.focus_date=? AND r.status NOT IN ('concluida','cancelada')", today);
  if (resource === 'receivables') {
    if (query.scope !== 'all') add('EXISTS(SELECT 1 FROM business_areas a WHERE a.id=r.area_id AND a.commercial_enabled=1)');
    if (query.status === 'cancelado') add('r.cancelled_at IS NOT NULL');
    if (query.status === 'recebido') add(`r.cancelled_at IS NULL AND r.amount_cents=${netSql}`);
    if (query.status === 'parcial') add(`r.cancelled_at IS NULL AND ${netSql}>0 AND r.amount_cents>${netSql}`);
    if (query.status === 'a_receber') add(`r.cancelled_at IS NULL AND ${netSql}=0`);
  }
  if (resource === 'calendar' && (query.from || query.to)) {
    const startsAt = query.from?.includes('T') ? new Date(query.from).toISOString() : localDateTimeToInstant(query.from || today, '00:00');
    const endDate = query.to || Temporal.PlainDate.from(today).add({ days: 7 }).toString();
    const endsAt = endDate.includes('T') ? new Date(endDate).toISOString() : localDateTimeToInstant(Temporal.PlainDate.from(endDate).add({ days: 1 }).toString(), '00:00');
    validateInterval({ startsAt, endsAt }); add('r.starts_at < ? AND r.ends_at > ?', new Date(endsAt).toISOString(), new Date(startsAt).toISOString());
  } else if (['tasks','receivables'].includes(resource)) {
    if (query.from) add('r.due_date >= ?', query.from); if (query.to) add('r.due_date <= ?', query.to);
  }
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  const total = (db.$client.prepare(`SELECT count(*) n FROM ${definition.table} r${where}`).get(...params) as { n: number }).n;
  const page = Math.min(requestedPage,Math.max(1,Math.ceil(total/pageSize)));
  const rows = db.$client.prepare(`SELECT r.* FROM ${definition.table} r${where} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...params, pageSize, (page - 1) * pageSize) as Row[];
  return { items: rows.map(row => resource === 'receivables' ? receivableDto(db, row, today) : dto(row)), total, page, pageSize };
}
export function getTodayOverview(areaId?: string, instant = now(), db: Database = getDb()) {
  const today = todayInZone(instant); const scope = areaId && areaId !== 'all' ? ' AND area_id=?' : ''; const params = scope ? [areaId] : [];
  const count = (table: string, where: string, values: unknown[] = []) => (db.$client.prepare(`SELECT count(*) n FROM ${table} WHERE ${where}${scope}`).get(...values, ...params) as { n: number }).n;
  const focus = (db.$client.prepare(`SELECT * FROM tasks WHERE focus_date=? AND status NOT IN ('concluida','cancelada')${scope} ORDER BY updated_at LIMIT 3`).all(today, ...params) as Row[]).map(dto);
  const tomorrow = Temporal.PlainDate.from(today).add({ days: 1 }).toString();
  const events = (db.$client.prepare(`SELECT * FROM calendar_events WHERE status!='cancelado' AND starts_at < ? AND ends_at > ?${scope} ORDER BY starts_at`).all(new Date(localDateTimeToInstant(tomorrow,'00:00')).toISOString(), new Date(localDateTimeToInstant(today,'00:00')).toISOString(), ...params) as Row[]).map(dto);
  const areas = (db.$client.prepare(`SELECT a.*,
    (SELECT count(*) FROM tasks t WHERE t.area_id=a.id AND t.status NOT IN ('concluida','cancelada')) open_tasks,
    (SELECT count(*) FROM tasks t WHERE t.area_id=a.id AND t.started_at IS NOT NULL AND t.status NOT IN ('concluida','cancelada')) started_tasks,
    (SELECT count(*) FROM opportunities o WHERE o.area_id=a.id AND o.stage NOT IN ('ganho','perdido')) open_opportunities,
    (SELECT min(due_date) FROM tasks t WHERE t.area_id=a.id AND t.status NOT IN ('concluida','cancelada')) next_delivery
    FROM business_areas a WHERE a.archived_at IS NULL${scope ? ' AND a.id=?' : ''} ORDER BY a.created_at,a.id`).all(...params) as Row[]).map(dto);
  const finance = getFinancialSummary({ areaId: scope ? areaId : undefined, now: instant }, db);
  return { focus, events, attention: { overdueTasks: count('tasks', "due_date < ? AND status NOT IN ('concluida','cancelada')", [today]), overdueOpportunities: count('opportunities', "next_action_date < ? AND stage NOT IN ('ganho','perdido')", [today]), withoutNextAction: count('opportunities', "(next_action IS NULL OR next_action='') AND stage NOT IN ('ganho','perdido')") }, areas, finance: { receivedCents: finance.receivedCents, overdueCents: finance.overdueCents } };
}
