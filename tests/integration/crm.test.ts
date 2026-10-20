import { afterEach, expect, test } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeDatabase, openDatabase } from '@/db';
import { domainHandlers } from '@/features/commands';
const cleanup: (() => void)[] = []; afterEach(() => cleanup.splice(0).reverse().forEach(fn => fn()));
test('contacts normalize exact duplicate suggestions and interactions atomically update next action', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'central-crm-')); cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
  await initializeDatabase(dir); const db = openDatabase(dir); cleanup.push(() => db.$client.close());
  const cmd = (name: string, input: unknown, expectedVersion?: number) => {
    expect(domainHandlers[name], name).toBeTypeOf('function');
    return db.$client.transaction(() => domainHandlers[name](db, input, { operationId: crypto.randomUUID(), expectedVersion }))() as Record<string, unknown>;
  };
  const contact = cmd('createContact', { name: 'Pessoa teste', phone: '(11) 99999-8888', email: ' PESSOA@EXAMPLE.COM ' });
  expect(contact).toMatchObject({ phone: '5511999998888', email: 'pessoa@example.com' });
  const second = cmd('createContact', { name: 'Outro nome', phone: '+55 11 99999-8888' });
  expect(second.duplicates).toEqual([expect.objectContaining({ id: contact.id })]);
  expect(() => cmd('createOpportunity', { contactId: contact.id, areaId: '44444444-4444-4444-8444-444444444444', offerName: 'Oferta' })).toThrow(/comercial/i);
  const opportunity = cmd('createOpportunity', { contactId: contact.id, areaId: '11111111-1111-4111-8111-111111111111', offerName: 'Consultoria' });
  const result = cmd('recordInteractionAndNextAction', { opportunityId: opportunity.id, channel: 'WhatsApp', type: 'conversa', summary: 'Conversa inicial', occurredAt: '2026-10-19T15:00:00Z', nextAction: 'Enviar proposta', nextActionDate: '2026-10-21' }, 1);
  expect(result).toMatchObject({ nextAction: 'Enviar proposta', version: 2 });
  expect(() => cmd('recordInteractionAndNextAction', { opportunityId: opportunity.id, channel: 'WhatsApp', type: 'conversa', summary: 'Stale', occurredAt: '2026-10-19T15:00:00Z', nextAction: 'X', nextActionDate: '2026-10-21' }, 1)).toThrow();
  expect(db.$client.prepare('SELECT count(*) n FROM interactions').get()).toEqual({ n: 1 });
});
test('opportunity area and contact remain bound to manual and reversed-sale financial history',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'central-crm-')); cleanup.push(()=>rmSync(dir,{recursive:true,force:true}));
  await initializeDatabase(dir); const db=openDatabase(dir); cleanup.push(()=>db.$client.close());
  const cmd=(name:string,input:unknown,expectedVersion?:number)=>db.$client.transaction(()=>domainHandlers[name](db,input,{operationId:crypto.randomUUID(),expectedVersion}))() as Record<string,unknown>;
  const contact=cmd('createContact',{name:'Pessoa original'}); const other=cmd('createContact',{name:'Outra pessoa'});
  const opportunity=cmd('createOpportunity',{contactId:contact.id,areaId:'11111111-1111-4111-8111-111111111111',offerName:'Consultoria'});
  cmd('createReceivable',{opportunityId:opportunity.id,areaId:'11111111-1111-4111-8111-111111111111',description:'Manual vinculada',amountCents:10000,dueDate:'2026-10-20'});
  expect(()=>cmd('updateOpportunity',{id:opportunity.id,areaId:'22222222-2222-4222-8222-222222222222'},1)).toThrow(/histórico|vínculos/i);
  expect(()=>cmd('updateOpportunity',{id:opportunity.id,contactId:other.id},1)).toThrow(/histórico|vínculos/i);
  cmd('winOpportunity',{id:opportunity.id,amountCents:10000,closedDate:'2026-10-20',firstDueDate:'2026-10-20'},1);
  cmd('reopenOpportunity',{id:opportunity.id},2);
  expect(()=>cmd('updateOpportunity',{id:opportunity.id,contactId:other.id},3)).toThrow(/histórico|vínculos/i);
  expect(db.$client.prepare('SELECT area_id,contact_id FROM opportunities WHERE id=?').get(opportunity.id)).toEqual({area_id:'11111111-1111-4111-8111-111111111111',contact_id:contact.id});
});
