import { expect,test,type Page } from '@playwright/test';
import { createInitialState,executeCommand,queryApi } from '../../cloud/domain';
import { randomUUID } from 'node:crypto';
const agency='22222222-2222-4222-8222-222222222222';
async function fixture(page:Page){
 const context={now:'2026-10-20T15:00:00.000Z',uuid:randomUUID};const state=createInitialState(context.now);
 executeCommand(state,'createEvent',{title:'Sessão de teste em novembro',areaId:agency,kind:'sessao',startsAt:'2026-11-10T10:00:00.000Z',endsAt:'2026-11-10T10:30:00.000Z'},{operationId:randomUUID()},context);
 await page.clock.install({time:new Date(context.now)});
 await page.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:"window.CENTRAL_CONFIG={apiUrl:'https://script.google.com/macros/s/calendar-test/exec',googleClientId:'test.apps.googleusercontent.com',basePath:'/crm/'}"}));
 await page.addInitScript(()=>localStorage.setItem('central-session-v1',JSON.stringify({session:'calendar-test-session-0000000000000000',email:'lawlagos@gmail.com',expiresAt:'2099-10-20T12:00:00Z'})));
 await page.route('https://script.google.com/macros/s/calendar-test/exec',async route=>{const body=route.request().postDataJSON();try{const data=queryApi(state,body.request.path,body.request.method,body.request.body,context);await route.fulfill({json:{ok:true,data}});}catch(error){const err=error as {code:string;message:string;status:number;fields:unknown};await route.fulfill({json:{ok:false,error:{code:err.code,message:err.message,status:err.status??400,fields:err.fields}}});}});
 return state;
}
test('mês seleciona novembro e mostra horário de São Paulo em qualquer fuso',async({page},info)=>{
 await fixture(page);await page.goto('./#/agenda');
 await expect(page.locator('.agenda-view-dayGridMonth')).toBeVisible();
 await expect(page.locator('.agenda-day-number[aria-current="date"]')).toHaveAttribute('data-date','2026-10-20');
 await page.getByRole('button',{name:'Próximo período'}).click();
 await expect(page.locator('.calendar-range')).toContainText('novembro');
 await expect(page.locator('.agenda-day-number[data-date="2026-11-01"]')).toHaveAttribute('data-selected','true');
 await page.getByRole('link',{name:'Selecionar 10/11/2026',exact:true}).click();
 const day=page.getByRole('region',{name:'Compromissos do dia'});
 await expect(day).toContainText('Sessão de teste em novembro');await expect(day).toContainText('07:00');
 await expect(page.getByRole('link',{name:'Selecionar 10/11/2026, dia selecionado',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(info.project.name.startsWith("mobile")) expect((await page.locator(".agenda-view-dayGridMonth .agenda-cell").first().boundingBox())!.height).toBeLessThanOrEqual(80);
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`.tooling/implementation/ux/calendar-final-${info.project.name}.png`,fullPage:true});
});
test('salvar fora do mês navega e término acompanha início sem apagar vários dias',async({page})=>{
 const state=await fixture(page);await page.goto(`./#/agenda?areaId=${agency}`);
 await page.getByRole('button',{name:'Marcar compromisso',exact:true}).first().click();
 const form=page.getByRole('dialog',{name:'Marcar compromisso'});
 await form.getByLabel('Título *').fill('Registro futuro de teste');await form.getByLabel('Data *',{exact:true}).fill('10/12/2026');
 await expect(form.getByLabel('Data de término *')).toHaveValue('10/12/2026');
 await form.getByLabel('Data de término *').fill('12/12/2026');await form.getByLabel('Data *',{exact:true}).fill('11/12/2026');
 await expect(form.getByLabel('Data de término *')).toHaveValue('12/12/2026');
 await form.getByRole('button',{name:'Marcar compromisso',exact:true}).click();
 await expect(form).not.toBeVisible();await expect(page.locator('.calendar-range')).toContainText('dezembro');
 await expect(page.getByRole('region',{name:'Compromissos do dia'})).toContainText('Registro futuro de teste');
 expect(state.tables.calendar_events.some(e=>e.title==='Registro futuro de teste'&&e.startsAt==='2026-12-11T21:00:00.000Z'&&e.endsAt==='2026-12-12T21:30:00.000Z')).toBe(true);
});

test('filtro explica vazio e pode revelar compromissos de outra frente',async({page})=>{
 await fixture(page);await page.goto('./#/agenda?areaId=11111111-1111-4111-8111-111111111111');
 await page.getByRole('button',{name:'Próximo período'}).click();await page.getByRole('link',{name:'Selecionar 10/11/2026',exact:true}).click();
 const day=page.getByRole('region',{name:'Compromissos do dia'});await expect(day).toContainText('Dia sem compromissos neste filtro');
 await day.getByRole('button',{name:'Ver todas as frentes e vínculos'}).click();await expect(day).toContainText('Sessão de teste em novembro');
});

test('prazos respeitam o projeto e a tarefa filtrados',async({page})=>{
 const state=await fixture(page),context={now:'2026-10-20T15:00:00.000Z',uuid:randomUUID};
 const command=(name:string,input:unknown)=>executeCommand(state,name,input,{operationId:randomUUID()},context) as {id:string};
 const project=command('createProject',{name:'Projeto filtrado',areaId:agency});
 const task=command('createTask',{title:'Prazo escolhido',areaId:agency,projectId:project.id,dueDate:'2026-10-20'});
 command('createTask',{title:'Outro prazo do projeto',areaId:agency,projectId:project.id,dueDate:'2026-10-20'});
 command('createTask',{title:'Prazo fora do projeto',areaId:agency,dueDate:'2026-10-20'});
 await page.goto(`./#/agenda?areaId=${agency}&projectId=${project.id}&taskId=${task.id}`);
 const day=page.getByRole('region',{name:'Compromissos do dia'});
 await expect(day.getByRole('link',{name:/Prazo escolhido/})).toBeVisible();
 await expect(day).not.toContainText('Outro prazo do projeto');await expect(day).not.toContainText('Prazo fora do projeto');
});
test('seletor tem hoje e foco visíveis; reabertura acompanha data preenchida',async({page},info)=>{
 await fixture(page);await page.goto(`./#/agenda?areaId=${agency}`);await page.getByRole('button',{name:'Marcar compromisso',exact:true}).first().click();
 const form=page.getByRole('dialog',{name:'Marcar compromisso'});await form.getByRole('button',{name:'Abrir calendário'}).first().click();
 const picker=page.getByRole('dialog',{name:'Escolher data'});await expect(picker.getByRole('button',{name:'20/10/2026'})).toBeFocused();
 await expect(picker.getByRole('button',{name:'20/10/2026'})).toHaveAttribute('aria-current','date');
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`.tooling/implementation/ux/date-picker-final-${info.project.name}.png`,fullPage:true});
 await picker.getByRole('button',{name:'Hoje',exact:true}).click();await form.getByLabel('Data *',{exact:true}).fill('31/10/2026');
 await form.getByRole('button',{name:'Abrir calendário'}).first().click();await expect(picker.getByRole('button',{name:'31/10/2026'})).toBeFocused();
 await page.keyboard.press('ArrowRight');await expect(picker.getByRole('button',{name:'01/11/2026'})).toBeFocused();await page.keyboard.press('Enter');
 await expect(form.getByLabel('Data *',{exact:true})).toHaveValue('01/11/2026');
});
