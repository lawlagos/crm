import { Temporal } from 'temporal-polyfill';
import type { Instant, LocalDate } from './contracts';

export const TIME_ZONE = 'America/Sao_Paulo';

export function assertLocalDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new RangeError('Informe uma data válida no formato AAAA-MM-DD.');
  }
  try {
    Temporal.PlainDate.from(date, { overflow: 'reject' });
  } catch {
    throw new RangeError('Informe uma data existente no calendário.');
  }
}

export function assertLocalTime(time: string): void {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new RangeError('Informe um horário válido no formato HH:mm.');
  }
}

export function todayInZone(now: Instant): LocalDate {
  try {
    return Temporal.Instant.from(now).toZonedDateTimeISO(TIME_ZONE).toPlainDate().toString();
  } catch {
    throw new RangeError('Informe um instante válido com fuso horário.');
  }
}

export function localDateTimeToInstant(date: LocalDate, time: string): Instant {
  assertLocalDate(date);
  assertLocalTime(time);
  try {
    return Temporal.PlainDateTime.from(`${date}T${time}`)
      .toZonedDateTime(TIME_ZONE, { disambiguation: 'reject' })
      .toInstant().toString();
  } catch {
    throw new RangeError('O horário informado é inexistente ou ambíguo em São Paulo.');
  }
}

export function formatDate(date: LocalDate): string {
  assertLocalDate(date);
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}
