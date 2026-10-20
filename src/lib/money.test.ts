import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoneyBRL, splitInstallments } from './money';

describe('parseMoneyBRL', () => {
  it.each([
    ['10,01', 1001],
    ['10,1', 1010],
    ['10', 1000],
    [' R$ 1.234,56 ', 123456],
    ['0,01', 1],
    ['99.999.999,99', 9999999999],
  ])('converte %s em centavos inteiros', (text, cents) => {
    expect(parseMoneyBRL(text)).toBe(cents);
  });

  it.each(['', '0', '0,00', '-1,00', 'NaN', 'Infinity', '1,001', '1.23', '1e3', '1,2,3', '100.000.000,00'])('rejeita valor inválido: %s', (text) => {
    expect(() => parseMoneyBRL(text)).toThrow();
  });
});

describe('splitInstallments', () => {
  it('distribui os centavos restantes nas primeiras parcelas', () => {
    expect(splitInstallments(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(splitInstallments(10001, 3)).toEqual([3334, 3334, 3333]);
    expect(splitInstallments(3, 3)).toEqual([1, 1, 1]);
    expect(splitInstallments(9999999999, 1)).toEqual([9999999999]);
  });

  it.each([[0, 1], [-1, 1], [1.5, 1], [NaN, 1], [Infinity, 1], [10000000000, 1], [1, 2], [100, 0], [100, -1], [100, 1.5], [100, NaN], [100, Infinity]])('rejeita total %s ou quantidade %s inválidos', (total, count) => {
    expect(() => splitInstallments(total, count)).toThrow();
  });
});

describe('formatMoney', () => {
  it('formata reais e permite saldos zerados ou negativos', () => {
    expect(formatMoney(123456)).toBe('R$\u00a01.234,56');
    expect(formatMoney(0)).toBe('R$\u00a00,00');
    expect(formatMoney(-101)).toBe('-R$\u00a01,01');
    expect(formatMoney(-1)).toBe('-R$\u00a00,01');
    expect(formatMoney(Number.MAX_SAFE_INTEGER)).toBe('R$\u00a090.071.992.547.409,91');
  });

  it.each([NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejeita centavos não inteiros ou inseguros: %s', (value) => {
    expect(() => formatMoney(value)).toThrow();
  });
});
