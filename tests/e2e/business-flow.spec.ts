import { expect,test,type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { todayInZone } from '../../src/lib/time';
import { Temporal } from 'temporal-polyfill';

async function command(api:APIRequestContext,name:string,input:unknown,expectedVersion?:number){
 const response=await api.post('/api/commands',{headers:{origin:'http://127.0.0.1:3100'},data:{command:name,input,meta:{operationId:randomUUID(),...(expectedVersion?{expectedVersion}:{})}}});
 expect(response.ok(),await response.text()).toBe(true);return (await response.json()).result;
}

test('sell in three installments, recover a lost payment response, and reverse five reais',async({page,request})=>{
 const suffix=test.info().project.name;const areaId='11111111-1111-4111-8111-111111111111';
 const bootstrap=await(await request.get('/api/bootstrap')).json();const today=todayInZone(bootstrap.serverNow);
 const contact=await command(request,'createContact',{name:`Cliente contrato ${suffix}`});
 const opportunity=await command(request,'createOpportunity',{contactId:contact.id,areaId,offerName:`Consultoria ${suffix}`,estimatedCents:10000,nextAction:'Confirmar proposta',nextActionDate:today});
 await page.goto(`/comercial/${opportunity.id}`);
 await page.getByRole('button',{name:'Marcar como ganha',exact:true}).click();
 let dialog=page.getByRole('dialog',{name:'Marcar como ganha',exact:true});
 await dialog.getByLabel('Quantidade de parcelas *').fill('3');
 await dialog.getByRole('combobox',{name:'Criar projeto para a entrega?'}).click();
 await page.getByRole('option',{name:'Criar projeto',exact:true}).click();
 await dialog.getByRole('button',{name:'Revisar dados',exact:true}).click();
 await expect(dialog.getByText(/33,34/)).toBeVisible();
 await dialog.getByRole('button',{name:'Confirmar venda e previsões'}).click();
 await expect(dialog).not.toBeVisible();
 const list=await(await request.get(`/api/receivables?contactId=${contact.id}&pageSize=100`)).json();
 expect(list.total).toBe(3);expect(list.items.map((row:{amountCents:number})=>row.amountCents)).toEqual([3334,3333,3333]);
 expect(list.items.every((row:{receivedCents:number})=>row.receivedCents===0)).toBe(true);
 const projects=await(await request.get(`/api/projects?contactId=${contact.id}`)).json();expect(projects.total).toBe(1);
 const record=list.items[0];await page.goto(`/financeiro/${record.id}`);
 let dropResponse=true;
 await page.route('**/api/commands',async route=>{
  const response=await route.fetch();
  if(route.request().postDataJSON().command==='recordPayment'&&dropResponse){dropResponse=false;await route.abort('failed');}
  else await route.fulfill({response});
 });
 await page.getByRole('button',{name:'Registrar recebimento',exact:true}).click();
 dialog=page.getByRole('dialog',{name:'Registrar recebimento',exact:true});
 await dialog.getByLabel('Valor em reais *').fill('20,00');
 await dialog.getByRole('button',{name:'Revisar dados',exact:true}).click();
 await dialog.getByRole('button',{name:'Confirmar recebimento local'}).click();
 await expect(dialog.getByRole('button',{name:'Verificar resultado'})).toBeVisible();
 await dialog.getByRole('button',{name:'Verificar resultado'}).click();
 await expect(dialog).not.toBeVisible();
 await expect(page.locator('.balance-panel strong')).toContainText('13,34');
 let history=await(await request.get(`/api/receivables/${record.id}/history`)).json();expect(history.totalPayments).toBe(1);
 await page.getByRole('button',{name:'Estornar registro',exact:true}).click();
 dialog=page.getByRole('dialog',{name:'Estornar registro',exact:true});
 await dialog.getByLabel('Valor em reais *').fill('5,00');
 await dialog.getByLabel('Motivo do estorno *').fill('Correção do valor anotado');
 await dialog.getByRole('button',{name:'Revisar dados',exact:true}).click();
 await dialog.getByRole('button',{name:'Confirmar estorno local'}).click();
 await expect(dialog).not.toBeVisible();await expect(page.locator('.balance-panel strong')).toContainText('18,34');
 const final=await(await request.get(`/api/receivables/${record.id}`)).json();expect(final.receivedCents).toBe(1500);
 history=await(await request.get(`/api/receivables/${record.id}/history`)).json();expect(history.totalPayments).toBe(1);expect(history.reversals).toHaveLength(1);
});

test('schedule a task inside forum hours only after acknowledging the conflict',async({page,request})=>{
 const areaId='11111111-1111-4111-8111-111111111111';const bootstrap=await(await request.get('/api/bootstrap')).json();
 let day=Temporal.PlainDate.from(todayInZone(bootstrap.serverNow));while(day.dayOfWeek>5)day=day.add({days:1});
 const date=day.toString(),display=`${String(day.day).padStart(2,'0')}/${String(day.month).padStart(2,'0')}/${day.year}`;
 const project=await command(request,'createProject',{name:`Projeto agenda ${test.info().project.name}`,areaId});
 const task=await command(request,'createTask',{title:`Tarefa agendada ${test.info().project.name}`,areaId,projectId:project.id,dueDate:date,description:'O prazo permanece independente do compromisso.'});
 await page.goto(`/agenda?areaId=${areaId}`);await page.getByRole('button',{name:'Marcar compromisso',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Marcar compromisso',exact:true});
 const title=`Bloco de execução ${test.info().project.name}`;
 await dialog.getByLabel('Título *').fill(title);await dialog.getByLabel('Data *',{exact:true}).fill(display);await dialog.getByLabel('Data de término *',{exact:true}).fill(display);
 await dialog.getByLabel('Início *').fill('10:00');await dialog.getByLabel('Fim *').fill('10:30');
 await dialog.getByRole('combobox',{name:'Tipo de compromisso'}).click();await page.getByRole('option',{name:'Bloco de tarefa',exact:true}).click();
 await dialog.getByRole('combobox',{name:'Projeto do compromisso'}).click();await page.getByRole('option',{name:project.name,exact:true}).click();
 await dialog.getByRole('combobox',{name:'Tarefa do compromisso'}).click();await page.getByRole('option',{name:task.title,exact:true}).click();
 await dialog.getByRole('button',{name:'Marcar compromisso',exact:true}).click();
 await expect(dialog.getByText('Jornada do Fórum',{exact:false})).toBeVisible();
 await dialog.getByRole('button',{name:'Agendar mesmo assim',exact:true}).click();await expect(dialog).not.toBeVisible();
 const events=await(await request.get(`/api/calendar?from=${date}&to=${date}&pageSize=100`)).json();const event=events.items.find((row:{title:string})=>row.title===title);expect(event.taskId).toBe(task.id);expect(event.projectId).toBe(project.id);
 await command(request,'updateEvent',{id:event.id,status:'cancelado'},event.version);
 const unchanged=await(await request.get(`/api/tasks/${task.id}`)).json();expect(unchanged).toMatchObject({status:'a_fazer',dueDate:date,description:task.description});
});
