import { getDb, type Database } from '@/db';
import { getRow } from '../shared';
export function exportEventIcs(eventId: string, db: Database = getDb()): string {
  const row = getRow(db, 'calendar_events', eventId);
  const escape = (value: unknown) => String(value ?? '').replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll(',','\\,').replaceAll(';','\\;').replaceAll('\r','');
  const instant = (value: unknown) => new Date(String(value)).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Central//Agenda Local//PT-BR','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${row.id}@central.local`,`DTSTAMP:${instant(row.updated_at)}`,`DTSTART:${instant(row.starts_at)}`,`DTEND:${instant(row.ends_at)}`,`SUMMARY:${escape(row.title)}`,`LOCATION:${escape(row.location)}`,`STATUS:${row.status === 'cancelado' ? 'CANCELLED' : 'CONFIRMED'}`,'END:VEVENT','END:VCALENDAR',''].join('\r\n');
}

