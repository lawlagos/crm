import { describe, expect, it } from 'vitest';
import { assertLocalDate, assertLocalTime, formatDate, localDateTimeToInstant, todayInZone } from './time';

describe('todayInZone', () => {
  it('usa São Paulo mesmo antes da virada do dia local', () => {
    expect(todayInZone('2026-10-20T02:30:00Z')).toBe('2026-10-19');
    expect(todayInZone('2026-10-20T03:00:00Z')).toBe('2026-10-20');
    expect(todayInZone('2027-01-01T02:30:00Z')).toBe('2026-12-31');
  });

  it.each(['', '2026-10-20', '2026-10-20T02:30:00', '2026-02-30T12:00:00Z'])('rejeita instante inválido ou sem fuso: %s', (value) => {
    expect(() => todayInZone(value)).toThrow();
  });
});

describe('localDateTimeToInstant', () => {
  it('converte horário de São Paulo em UTC sem usar o fuso da máquina', () => {
    expect(localDateTimeToInstant('2026-10-20', '09:30')).toBe('2026-10-20T12:30:00Z');
    expect(localDateTimeToInstant('2026-12-31', '23:30')).toBe('2027-01-01T02:30:00Z');
    expect(localDateTimeToInstant('2018-01-01', '09:30')).toBe('2018-01-01T11:30:00Z');
  });

  it.each([['2026-02-29', '09:00'], ['2026-04-31', '09:00'], ['2026-10-20', '24:00'], ['2026-10-20', '12:60'], ['2026-10-20', '9:00'], ['2026-10-20', '09:00:00']])('rejeita data %s ou horário %s inválidos', (date, time) => {
    expect(() => localDateTimeToInstant(date, time)).toThrow();
  });

  it('rejeita horários históricos inexistentes ou ambíguos em São Paulo', () => {
    expect(() => localDateTimeToInstant('2018-11-04', '00:30')).toThrow();
    expect(() => localDateTimeToInstant('2019-02-16', '23:30')).toThrow();
  });
});

describe('datas e horários locais', () => {
  it('aceita dia real em ano bissexto e limites do relógio', () => {
    expect(() => assertLocalDate('2024-02-29')).not.toThrow();
    expect(() => assertLocalTime('00:00')).not.toThrow();
    expect(() => assertLocalTime('23:59')).not.toThrow();
  });

  it.each(['2026-02-29', '2026-13-01', '2026-00-01', '2026-01-00', '2026-4-01', '20/10/2026', '2026-10-20T00:00:00Z'])('rejeita calendário ou formato inválido: %s', (value) => {
    expect(() => assertLocalDate(value)).toThrow();
    expect(() => formatDate(value)).toThrow();
  });

  it('formata a data local sem deslocá-la para outro dia', () => {
    expect(formatDate('2026-10-20')).toBe('20/10/2026');
    expect(formatDate('2024-02-29')).toBe('29/02/2024');
  });
});
