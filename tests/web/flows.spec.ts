import { expect, test, type Locator, type Page } from '@playwright/test';
import { reviewApp, REVIEW_JIU } from './review-app';
import { mkdirSync } from 'node:fs';

test.afterEach(async ({page}, info) => {
  if (info.status !== 'passed') return;
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({path:info.outputPath('review.png'),fullPage:true});
});

async function choose(scope:Page|Locator,label:string,option:string) {
  await scope.getByRole('combobox',{name:label,exact:true}).click();
  await (('page' in scope?scope.page():scope) as Page).getByRole('option',{name:option,exact:true}).click();
}
test('people: validate, create, edit, archive and restore a person using the cloud domain',async({page})=>{
  const app=await reviewApp(page);await page.goto('./#/contatos');
  await page.getByRole('button',{name:'Criar cliente',exact:true}).first().click();
  let form=page.getByRole('dialog',{name:'Criar cliente',exact:true});
  await form.getByRole('button',{name:'Criar cliente',exact:true}).click();
  await expect(form.getByLabel('Nome *')).toBeFocused();
  await form.getByLabel('Nome *').fill('Pessoa de revisão');
  await form.getByLabel('Telefone',{exact:true}).fill('(11) 99999-1234');
  await form.getByLabel('E-mail',{exact:true}).fill('pessoa@example.com');
  await form.getByRole('button',{name:'Criar cliente',exact:true}).click();
  await expect(form).not.toBeVisible();await page.getByRole('link',{name:/Pessoa de revisão/}).click();
  await expect(page.getByRole('heading',{name:'Pessoa de revisão',exact:true})).toBeVisible();
  expect(app.state().tables.contacts[0].phone).toBe('5511999991234');
  await page.getByRole('button',{name:'Editar cliente',exact:true}).click();
  form=page.getByRole('dialog',{name:'Editar cliente',exact:true});await form.getByLabel('Nome *').fill('Pessoa atualizada');
  await form.getByRole('button',{name:'Editar cliente',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Pessoa atualizada',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Arquivar',exact:true}).click();
  await page.getByRole('dialog',{name:'Arquivar cliente',exact:true}).getByRole('button',{name:'Arquivar cliente',exact:true}).click();
  await expect(page.getByText('Arquivado',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Reativar',exact:true}).click();
  await page.getByRole('dialog',{name:'Reativar cliente',exact:true}).getByRole('button',{name:'Reativar cliente',exact:true}).click();
  await expect(page.getByText('Arquivado',{exact:true})).toHaveCount(0);expect(app.failures).toEqual([]);
});
test('a new person remains reachable when a front filter excludes unlinked contacts',async({page})=>{
  const app=await reviewApp(page);await page.goto('./#/contatos?areaId='+REVIEW_JIU);
  await page.getByRole('button',{name:'Criar cliente',exact:true}).first().click();
  const form=page.getByRole('dialog',{name:'Criar cliente',exact:true});await form.getByLabel('Nome *').fill('Novo contato geral');
  await form.getByRole('button',{name:'Criar cliente',exact:true}).click();
  await expect(form).not.toBeVisible();
  await expect(page.getByRole('link',{name:'Abrir cadastro criado',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Abrir cadastro criado',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Novo contato geral',exact:true})).toBeVisible();expect(app.failures).toEqual([]);
});
test('projects: create, edit and apply a template without losing the objective',async({page})=>{
  const app=await reviewApp(page);await page.goto('./#/projetos');
  await page.getByRole('button',{name:'Criar projeto',exact:true}).first().click();
  let form=page.getByRole('dialog',{name:'Criar projeto',exact:true});await form.getByLabel('Nome do projeto *').fill('Projeto de revisão');
  await choose(form,'Frente','Jiu-jítsu');await form.getByLabel('Objetivo').fill('Entregar com clareza');
  await form.getByRole('button',{name:'Criar projeto',exact:true}).click();await expect(form).not.toBeVisible();
  await page.getByRole('link',{name:/Projeto de revisão/}).click();
  await expect(page.getByText('Entregar com clareza',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Editar projeto',exact:true}).click();form=page.getByRole('dialog',{name:'Editar projeto',exact:true});
  await form.getByLabel('Nome do projeto *').fill('Projeto ajustado');await form.getByRole('button',{name:'Salvar alterações',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Projeto ajustado',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Aplicar template',exact:true}).click();
  await page.getByRole('dialog',{name:'Aplicar template',exact:true}).getByRole('button',{name:'Aplicar template',exact:true}).click();
  await expect.poll(()=>app.state().tables.tasks.length).toBe(4);expect(app.state().tables.projects[0].objective).toBe('Entregar com clareza');expect(app.failures).toEqual([]);
});
test('fronts: create, edit, archive, restore and prevent archiving an active front',async({page})=>{
  const app=await reviewApp(page);await page.goto('./#/configuracoes');await page.getByRole('button',{name:'Criar frente',exact:true}).click();
  let form=page.getByRole('dialog',{name:'Criar frente',exact:true});await form.getByLabel('Nome *').fill('Frente de revisão');
  await form.getByRole('button',{name:'Criar frente',exact:true}).click();await expect(form).not.toBeVisible();
  let row=page.locator('.settings-row').filter({has:page.getByRole('heading',{name:'Frente de revisão',exact:true})});
  await row.getByRole('button',{name:'Editar',exact:true}).click();form=page.getByRole('dialog',{name:'Editar frente',exact:true});
  await form.getByLabel('Nome *').fill('Frente ajustada');await form.getByRole('button',{name:'Editar frente',exact:true}).click();
  row=page.locator('.settings-row').filter({has:page.getByRole('heading',{name:'Frente ajustada',exact:true})});
  await row.getByRole('button',{name:'Arquivar',exact:true}).click();await page.getByRole('dialog',{name:'Arquivar frente',exact:true}).getByRole('button',{name:'Arquivar frente',exact:true}).click();
  await expect(row.getByText('Arquivada',{exact:true})).toBeVisible();await row.getByRole('button',{name:'Reativar',exact:true}).click();
  await page.getByRole('dialog',{name:'Reativar frente',exact:true}).getByRole('button',{name:'Reativar frente',exact:true}).click();
  await expect(row.getByText('Arquivada',{exact:true})).toHaveCount(0);
  const area=app.state().tables.business_areas.find(item=>item.name==='Frente ajustada')!;app.command('createTask',{title:'Pendência da frente',areaId:area.id});
  await row.getByRole('button',{name:'Arquivar',exact:true}).click();form=page.getByRole('dialog',{name:'Arquivar frente',exact:true});await form.getByRole('button',{name:'Arquivar frente',exact:true}).click();
  await expect(form.getByRole('alert')).toContainText(/tarefas/);expect(app.failures).toEqual([]);
});
test('finance: create a receivable, receive partially and reverse while preserving history',async({page})=>{
  const app=await reviewApp(page);await page.goto('./#/financeiro');await page.getByRole('button',{name:'Criar previsão',exact:true}).first().click();
  let form=page.getByRole('dialog',{name:'Criar previsão',exact:true});await form.getByLabel('Descrição *').fill('Previsão de revisão');await choose(form,'Frente','Jiu-jítsu');
  await form.getByLabel('Valor em reais *').fill('100,00');await form.getByLabel('Vencimento *').fill('20/10/2026');
  await form.getByRole('button',{name:'Criar previsão',exact:true}).click();await expect(form).not.toBeVisible();
  await page.getByRole('link',{name:/Previsão de revisão/}).click();await page.getByRole('button',{name:'Registrar recebimento',exact:true}).click();
  form=page.getByRole('dialog',{name:'Registrar recebimento',exact:true});await form.getByLabel('Valor em reais *').fill('40,00');
  await form.getByRole('button',{name:'Revisar dados',exact:true}).click();await form.getByRole('button',{name:/Confirmar recebimento/}).click();await expect(form).not.toBeVisible();
  await expect(page.getByText('R$ 60,00',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Estornar registro',exact:true}).click();
  form=page.getByRole('dialog',{name:'Estornar registro',exact:true});await form.getByLabel('Valor em reais *').fill('10,00');await form.getByLabel('Motivo do estorno *').fill('Correção de teste isolado');
  await form.getByRole('button',{name:'Revisar dados',exact:true}).click();await form.getByRole('button',{name:/Confirmar estorno/}).click();await expect(form).not.toBeVisible();
  await expect(page.getByText('R$ 70,00',{exact:true})).toBeVisible();expect(app.state().tables.payments).toHaveLength(1);expect(app.state().tables.payment_reversals).toHaveLength(1);expect(app.failures).toEqual([]);
});

test('commercial: filter, record a conversation and confirm installments without recording a payment',async({page})=>{
  const app=await reviewApp(page);
  const contact=app.command('createContact',{name:'Cliente comercial'});
  const opportunity=app.command('createOpportunity',{contactId:contact.id,areaId:REVIEW_JIU,offerName:'Oferta de revisão',estimatedCents:10000});
  await page.goto('./#/comercial');
  await choose(page,'Atenção comercial','Sem próximo passo');
  await expect(page).toHaveURL(/withoutNextAction=true/);
  await page.getByRole('link',{name:/Oferta de revisão/}).click();
  await page.getByRole('button',{name:'Registrar contato e próximo passo',exact:true}).click();
  let form=page.getByRole('dialog',{name:'Registrar contato e próximo passo',exact:true});
  await form.getByLabel('Resumo *').fill('Conversa de teste isolado');
  await form.getByLabel('Próxima ação *').fill('Enviar proposta');
  await form.getByRole('button',{name:'Registrar contato e próximo passo',exact:true}).click();
  await expect(form).not.toBeVisible();await expect(page.getByText('Enviar proposta',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Marcar como ganha',exact:true}).click();
  form=page.getByRole('dialog',{name:'Marcar como ganha',exact:true});
  await form.getByLabel('Quantidade de parcelas *').fill('3');
  await form.getByRole('button',{name:'Revisar dados',exact:true}).click();
  await expect(form.getByText('R$ 33,34',{exact:true})).toBeVisible();
  await form.getByRole('button',{name:'Confirmar venda e previsões',exact:true}).click();
  await expect(form).not.toBeVisible();
  expect(app.state().tables.receivables.map(row=>row.amountCents)).toEqual([3334,3333,3333]);
  expect(app.state().tables.payments).toHaveLength(0);expect(app.state().tables.interactions).toHaveLength(1);
  expect(app.state().tables.opportunities.find(row=>row.id===opportunity.id)?.stage).toBe('ganho');expect(app.failures).toEqual([]);
});

test('all modules: populated desktop/mobile navigation and weekly review persistence',async({page},info)=>{
  const app=await reviewApp(page);
  const contact=app.command('createContact',{name:'Cliente de demonstração isolada'});
  const project=app.command('createProject',{name:'Entrega de revisão',objective:'Organizar a próxima entrega',areaId:REVIEW_JIU});
  app.command('createTask',{title:'Preparar análise',areaId:REVIEW_JIU,projectId:project.id,dueDate:'2026-10-20',checklist:[{id:'one',text:'Conferir dados',done:true},{id:'two',text:'Finalizar análise',done:false}]});
  app.command('createOpportunity',{contactId:contact.id,areaId:REVIEW_JIU,offerName:'Consultoria de revisão'});
  app.command('createReceivable',{description:'Previsão de demonstração isolada',areaId:REVIEW_JIU,amountCents:15000,dueDate:'2026-10-20'});
  mkdirSync('.tooling/implementation/ux-review',{recursive:true});
  for(const route of ['', 'tarefas','contatos','projetos','comercial','financeiro','revisao','configuracoes']) {
    await page.goto('./#/'+route);
    await expect(page.getByRole('heading',{level:1})).toBeVisible();
    await expect(page.getByText('Carregando…',{exact:true})).toHaveCount(0);
    if(!route) await expect(page.locator('.front-delivery').first()).toContainText('20/10/2026');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await page.screenshot({path:`.tooling/implementation/ux-review/${route||'hoje'}-${info.project.name}.png`,fullPage:true});
  }
  await page.goto('./#/revisao');
  await page.getByRole('checkbox').first().check();await page.getByRole('button',{name:'Salvar revisão',exact:true}).click();
  await expect(page.getByText('Revisão salva para esta semana',{exact:true})).toBeVisible();
  await page.reload();await expect(page.getByRole('checkbox').first()).toBeChecked();
  expect(app.failures).toEqual([]);
});
