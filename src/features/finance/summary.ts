import { getDb, type Database } from '@/db';
import { todayInZone } from '@/lib/time';
import { now } from '../shared';
import { netSql } from './receivables';
export type FinanceFilter = { areaId?: string | null; scope?: string; from?: string; to?: string; now?: string };
export function getFinancialSummary(filter: FinanceFilter = {}, db: Database = getDb()) {
  const today = todayInZone(filter.now ?? now()); const from = filter.from ?? `${today.slice(0, 7)}-01`; const to = filter.to ?? today;
  const where = `${filter.scope === 'all' ? '1=1' : 'a.commercial_enabled=1'}${filter.areaId ? ' AND a.id=?' : ''}`;
  const areaParams = filter.areaId ? [filter.areaId] : [];
  const scalar = (sql: string, params: unknown[]) => Number((db.$client.prepare(sql).get(...params) as { n: number }).n);
  const payments = scalar(`SELECT COALESCE(sum(p.amount_cents),0) n FROM payments p JOIN receivables r ON r.id=p.receivable_id JOIN business_areas a ON a.id=r.area_id WHERE ${where} AND p.effective_date BETWEEN ? AND ?`, [...areaParams, from, to]);
  const reversals = scalar(`SELECT COALESCE(sum(v.amount_cents),0) n FROM payment_reversals v JOIN payments p ON p.id=v.payment_id JOIN receivables r ON r.id=p.receivable_id JOIN business_areas a ON a.id=r.area_id WHERE ${where} AND v.effective_date BETWEEN ? AND ?`, [...areaParams, from, to]);
  const receivableCents = scalar(`SELECT COALESCE(sum(r.amount_cents-${netSql}),0) n FROM receivables r JOIN business_areas a ON a.id=r.area_id WHERE ${where} AND r.cancelled_at IS NULL`, areaParams);
  const overdueCents = scalar(`SELECT COALESCE(sum(r.amount_cents-${netSql}),0) n FROM receivables r JOIN business_areas a ON a.id=r.area_id WHERE ${where} AND r.cancelled_at IS NULL AND r.due_date < ?`, [...areaParams, today]);
  const salesCents = scalar(`SELECT COALESCE(sum(c.amount_cents),0) n FROM deal_closures c JOIN opportunities o ON o.id=c.opportunity_id JOIN business_areas a ON a.id=o.area_id WHERE ${where} AND c.reversed_at IS NULL AND c.closed_date BETWEEN ? AND ?`, [...areaParams, from, to]);
  const closed = db.$client.prepare(`SELECT sum(CASE WHEN o.stage='ganho' THEN 1 ELSE 0 END) won, count(*) total FROM opportunities o JOIN business_areas a ON a.id=o.area_id WHERE ${where} AND o.stage IN ('ganho','perdido') AND substr(o.closed_at,1,10) BETWEEN ? AND ?`).get(...areaParams, from, to) as { won: number; total: number };
  return { receivedCents: payments - reversals, receivableCents, overdueCents, salesCents, conversion: closed.total ? closed.won / closed.total : null };
}
