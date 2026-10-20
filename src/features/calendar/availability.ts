import { createHash } from 'node:crypto';
import { Temporal } from 'temporal-polyfill';
import type { Database } from '@/db';
import { DomainError } from '@/lib/contracts';
import { localDateTimeToInstant, TIME_ZONE, todayInZone } from '@/lib/time';
import { dto, type Row } from '../shared';
export type Interval = { startsAt: string; endsAt: string };
export function validateInterval(input: Interval) {
  const duration = Date.parse(input.endsAt) - Date.parse(input.startsAt);
  if (!(duration > 0)) throw new DomainError('VALIDATION', 'O fim deve ser posterior ao início.');
  if (duration > 93 * 86400000) throw new DomainError('VALIDATION', 'Consulte intervalos de no máximo 93 dias.');
}
export function listConflicts(db: Database, input: Interval & { areaId: string }, excludeId = ''): Row[] {
  validateInterval(input);
  const conflicts = (db.$client.prepare("SELECT id,title,starts_at,ends_at,version FROM calendar_events WHERE id != ? AND status != 'cancelado' AND starts_at < ? AND ends_at > ? ORDER BY id").all(excludeId, new Date(input.endsAt).toISOString(), new Date(input.startsAt).toISOString()) as Row[]).map(dto);
  const area = db.$client.prepare('SELECT commercial_enabled FROM business_areas WHERE id=?').get(input.areaId) as { commercial_enabled: number };
  if (area?.commercial_enabled) {
    const setting = db.$client.prepare("SELECT value_json,version FROM settings WHERE key='forumHours'").get() as { value_json: string; version: number };
    const hours = JSON.parse(setting.value_json) as { weekdays: number[]; start: string; end: string };
    let date = Temporal.PlainDate.from(todayInZone(input.startsAt)); const end = todayInZone(input.endsAt);
    while (date.toString() <= end) {
      if (hours.weekdays.includes(date.dayOfWeek)) {
        const startsAt = localDateTimeToInstant(date.toString(), hours.start); const endsAt = localDateTimeToInstant(date.toString(), hours.end);
        if (Date.parse(startsAt) < Date.parse(input.endsAt) && Date.parse(endsAt) > Date.parse(input.startsAt)) conflicts.push({ id: `forum:${date}`, title: 'Jornada do Fórum', startsAt, endsAt, version: setting.version, timeZone: TIME_ZONE });
      }
      date = date.add({ days: 1 });
    }
  }
  return conflicts;
}
export function conflictFingerprint(conflicts: Row[]): string { return createHash('sha256').update(JSON.stringify(conflicts)).digest('hex'); }
export function getFreeMinutes(windows: Interval[], events: Interval[]): number {
  const union = (ranges: [number, number][]) => ranges.sort((a,b) => a[0]-b[0]).reduce<[number,number][]>((result, range) => {
    const previous = result[result.length - 1]; if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]); else result.push([...range]); return result;
  }, []);
  const windowRanges = union(windows.map(item => [Date.parse(item.startsAt), Date.parse(item.endsAt)]));
  let free = 0;
  for (const [start,end] of windowRanges) {
    const busy = union(events.map(item => [Math.max(start, Date.parse(item.startsAt)), Math.min(end, Date.parse(item.endsAt))] as [number,number]).filter(([a,b]) => b > a));
    free += end - start - busy.reduce((sum,[a,b]) => sum + b - a, 0);
  }
  return Math.max(0, Math.floor(free / 60000));
}

