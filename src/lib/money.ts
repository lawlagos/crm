import type { MoneyCents } from './contracts';

const MAX_MONEY_CENTS = 9_999_999_999;

function assertPositiveMoney(cents: number): void {
  if (!Number.isSafeInteger(cents) || cents < 1 || cents > MAX_MONEY_CENTS) {
    throw new RangeError('O valor deve estar entre R$ 0,01 e R$ 99.999.999,99.');
  }
}

export function parseMoneyBRL(text: string): MoneyCents {
  const value = text.trim().replace(/^R\$\s*/, '');
  if (!/^(?:\d+|[1-9]\d{0,2}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(value)) {
    throw new RangeError('Informe um valor em reais com até duas casas decimais.');
  }
  const [whole, fraction = ''] = value.replaceAll('.', '').split(',');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  assertPositiveMoney(cents);
  return cents;
}

export function splitInstallments(total: MoneyCents, count: number): MoneyCents[] {
  assertPositiveMoney(total);
  if (!Number.isSafeInteger(count) || count < 1 || count > total) {
    throw new RangeError('Informe uma quantidade de parcelas inteiras sem parcelas de valor zero.');
  }
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

const moneyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatMoney(cents: MoneyCents): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError('O valor deve ser um número inteiro seguro de centavos.');
  }
  const whole = BigInt(cents) / BigInt(100);
  const fraction = String(Math.abs(cents % 100)).padStart(2, '0');
  return moneyFormatter.formatToParts(cents < 0 && whole === BigInt(0) ? -0 : whole)
    .map((part) => part.type === 'fraction' ? fraction : part.value)
    .join('');
}
