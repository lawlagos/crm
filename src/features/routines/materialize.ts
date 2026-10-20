import type { Database } from '@/db';
import { Temporal } from 'temporal-polyfill';
import { todayInZone } from '@/lib/time';
import { business, type Row } from '../shared';
import { createOccurrence, occurrenceDate, occurrenceTable } from './occurrences';
export function materializeOccurrences(db: Database, instant: string, horizonDays = 60): { created: number } {
  if (!Number.isInteger(horizonDays) || horizonDays < 0 || horizonDays > 60) business('Horizonte deve estar entre zero e 60 dias.');
  const until = Temporal.PlainDate.from(todayInZone(instant)).add({ days: horizonDays }).toString();
  const seriesList = db.$client.prepare('SELECT * FROM recurrence_series WHERE active=1 ORDER BY id').all() as Row[];
  let created = 0;
  for (const series of seriesList) {
    let cursor = Number(series.cursor); let finished = false;
    while (!finished) {
      const batch = () => {
        for (let count = 0; count < 100; count++) {
          const index = cursor + 1; const date = occurrenceDate(series, index);
          if (date > until || (series.end_date && date > String(series.end_date))) { finished = true; break; }
          if (date >= String(series.start_date) && !db.$client.prepare(`SELECT 1 FROM ${occurrenceTable(series)} WHERE series_id=? AND occurrence_key=?`).get(series.id, index)) {
            createOccurrence(db, series, index); created++;
          }
          cursor = index;
          db.$client.prepare('UPDATE recurrence_series SET cursor=? WHERE id=?').run(cursor, series.id);
        }
      };
      if (db.$client.inTransaction) batch(); else db.$client.transaction(batch).immediate();
    }
  }
  return { created };
}
