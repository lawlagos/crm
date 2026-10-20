import { todayInZone } from '@/lib/time';
import { business, dto, getRow, id, insert, now, parse, update, version, type Handler } from '../shared';
import { paymentCreate, paymentReverse } from './schemas';
import { receivableDto } from './receivables';
export const recordPayment: Handler = (db, input, meta) => {
  const value = parse(paymentCreate, input); const receivable = getRow(db, 'receivables', value.receivableId); version(receivable, meta);
  if (receivable.cancelled_at) business('Previsão cancelada não recebe pagamentos.');
  if (value.effectiveDate > todayInZone(now())) business('Recebimento não pode ter data futura.');
  if (value.amountCents > Number(receivableDto(db, receivable).balanceCents)) business('O pagamento ultrapassa o saldo da previsão.');
  const payment = insert(db, 'payments', { id: id(), receivable_id: receivable.id, amount_cents: value.amountCents, effective_date: value.effectiveDate, method: value.method, created_at: now() });
  const current = update(db, 'receivables', receivable.id, {});
  return { ...dto(payment), balanceCents: receivableDto(db, current).balanceCents, receivableVersion: current.version };
};
export const reversePayment: Handler = (db, input, meta) => {
  const value = parse(paymentReverse, input); const payment = getRow(db, 'payments', value.paymentId); const receivable = getRow(db, 'receivables', payment.receivable_id); version(receivable, meta);
  if (value.effectiveDate > todayInZone(now()) || value.effectiveDate < String(payment.effective_date)) business('Estorno não pode preceder o pagamento nem estar no futuro.');
  const previous = db.$client.prepare('SELECT COALESCE(sum(amount_cents),0) n FROM payment_reversals WHERE payment_id=?').get(payment.id) as { n: number };
  if (previous.n + value.amountCents > Number(payment.amount_cents)) business('Estorno ultrapassa o valor restante do pagamento.');
  const reversal = insert(db, 'payment_reversals', { id: id(), payment_id: payment.id, amount_cents: value.amountCents, effective_date: value.effectiveDate, reason: value.reason, created_at: now() });
  const current = update(db, 'receivables', receivable.id, {});
  return { ...dto(reversal), balanceCents: receivableDto(db, current).balanceCents, receivableVersion: current.version };
};
