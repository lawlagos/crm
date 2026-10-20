import { z } from 'zod';
import type { Database } from '@/db';
import { area, business, camelPatch, dto, getRow, id, insert, now, parse, update, version, type Handler, type Row } from '../shared';
import { contactCreate, contactPatch } from './schemas';
function normalize(input: Row): Row {
  const result = { ...input };
  if ('phone' in result) {
    let phone = String(result.phone || '').replace(/\D/g, '');
    if (phone.length === 10 || phone.length === 11) phone = `55${phone}`;
    if (phone && !/^\d{10,15}$/.test(phone)) business('Informe um telefone válido com DDI e DDD.');
    result.phone = phone || null;
  }
  if ('email' in result) { const email = String(result.email || '').trim().toLowerCase(); if (email && !z.email().safeParse(email).success) business('Informe um e-mail válido.'); result.email = email || null; }
  return result;
}
export function findDuplicateContacts(db: Database, input: Row, excludeId = ''): Row[] {
  const normalized = normalize(input);
  return (db.$client.prepare('SELECT * FROM contacts WHERE id != ? AND ((? IS NOT NULL AND phone = ?) OR (? IS NOT NULL AND email = ?)) LIMIT 20').all(excludeId, normalized.phone ?? null, normalized.phone ?? null, normalized.email ?? null, normalized.email ?? null) as Row[]).map(dto);
}
export const createContact: Handler = (db, input) => {
  const value = normalize(parse(contactCreate, input)); const time = now();
  const row = insert(db, 'contacts', { id: id(), name: value.name, kind: value.kind, phone: value.phone ?? null, email: value.email ?? null, responsible_name: value.responsibleName ?? null, notes: value.notes, archived_at: null, version: 1, created_at: time, updated_at: time });
  return { ...dto(row), duplicates: findDuplicateContacts(db, value, String(row.id)) };
};
export const updateContact: Handler = (db, input, meta) => {
  const value = normalize(parse(contactPatch, input)); const current = getRow(db, 'contacts', value.id); version(current, meta);
  const row = update(db, 'contacts', value.id, camelPatch(value, ['name','kind','phone','email','responsibleName','notes']));
  return { ...dto(row), duplicates: findDuplicateContacts(db, { phone: row.phone, email: row.email }, String(row.id)) };
};
export const archiveContact: Handler = (db, input, meta) => {
  const value = parse(z.object({ id: z.string(), archived: z.boolean().default(true) }).strict(), input); const current = getRow(db, 'contacts', value.id); version(current, meta);
  return dto(update(db, 'contacts', value.id, { archived_at: value.archived ? now() : null }));
};
export function linkCustomer(db: Database, contactId: unknown, areaId: unknown) {
  area(db, areaId, true);
  db.$client.prepare("INSERT OR IGNORE INTO contact_relationships(contact_id,area_id,role,created_at) VALUES (?,?,'cliente',?)").run(contactId, areaId, now());
}
export function whatsappUrl(phone: string): string { const normalized = normalize({ phone }).phone; if (!normalized) business('Contato sem telefone.'); return `https://wa.me/${normalized}`; }
