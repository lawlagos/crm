import{expect,test,type Page}from'@playwright/test';
import{mkdirSync}from'node:fs';
import{createInitialState,executeCommand,queryApi,type DomainState,type Row}from'../../cloud/domain';
import{createHandler,type CloudRuntime}from'../../cloud/server/core';
const jiu='11111111-1111-4111-8111-111111111111',endpoint='https://script.google.com/macros/s/task-checklist-test/exec';
async function fixture(page:Page,checked=0){
  const context={now:new Date().toISOString(),uuid:()=>crypto.randomUUID()};let state:DomainState=createInitialState(context.now);state.tables.mutation_receipts=[];
  const seed=(input:unknown)=>executeCommand(state,'createTask',input,{operationId:crypto.randomUUID()},context)as Row;
  const task=seed({title:'Preparar entrega de teste',areaId:jiu,description:'Checklist isolado para validar dez etapas de uma entrega.',checklist:Array.from({length:10},(_,index)=>({id:`step-${index+1}`,text:`Etapa ${index+1}`,done:index<checked}))});
  const inbox=seed({title:'Captura sem frente'});state.tables.tasks.find(row=>row.id===task.id)!.focusDate=context.now.slice(0,10);
  const session={session:'fixture-task-checklist-session-0000000000000000000000',email:'lawlagos@gmail.com',expiresAt:'2099-10-20T12:00:00Z'};
  const runtime:CloudRuntime={now:()=>context.now,uuid:context.uuid,randomToken:()=>session.session,hash:value=>value,clientId:'fixture',verifyToken:()=>({}),getSession:key=>key===session.session?{...session,sub:'fixture'}:null,putSession:()=>{},deleteSession:()=>{},transaction:work=>{const draft=structuredClone(state),result=work(draft);state=draft;return result;},read:()=>structuredClone(state)};
  const handle=createHandler(runtime,{executeCommand,queryApi});const operations:{command:string;input:Row;meta:Row}[]=[];let lose=false;
  await page.route('**/config.js',route=>route.fulfill({contentType:'application/javascript',body:`window.CENTRAL_CONFIG={apiUrl:'${endpoint}',googleClientId:'fixture',basePath:'/crm/'};`}));
  await page.addInitScript(session=>localStorage.setItem('central-session-v1',JSON.stringify(session)),session);
  await page.route(endpoint,async route=>{
    const packet=route.request().postDataJSON();if(packet.request?.path==='/api/commands')operations.push(packet.request.body);
    try{const data=handle(packet);if(lose&&packet.request?.path==='/api/commands'){lose=false;await route.abort('failed');return;}await route.fulfill({json:{ok:true,data}});}catch(error){const failure=error as{code?:string;message:string;fieldErrors?:Record<string,string>};await route.fulfill({json:{ok:false,error:{...failure,code:failure.code,message:failure.message,fieldErrors:failure.fieldErrors,status:failure.code==='CONFLICT'?409:422}}});}
  });
  return{task,inbox,operations,getTask:()=>state.tables.tasks.find(row=>row.id===task.id)!,loseNext:()=>{lose=true;},concurrentItem:(index:number)=>{const current=state.tables.tasks.find(row=>row.id===task.id)!;executeCommand(state,'updateTask',{id:task.id,checklist:(current.checklist as Row[]).map((item,at)=>at===index?{...item,done:true}:item)},{operationId:crypto.randomUUID(),expectedVersion:Number(current.version)},context);}};
}
test('marca diretamente e mostra dez por cento por item em ficha, lista, quadro e Hoje',async({page},testInfo)=>{
  const f=await fixture(page);await page.goto(`./#/tarefas/${f.task.id}`);
  await expect(page.getByRole('checkbox',{name:'Etapa 1',exact:true})).not.toBeChecked();await expect(page.getByRole('progressbar',{name:'Progresso da tarefa'})).toHaveAttribute('aria-valuenow','0');
  await page.getByRole('checkbox',{name:'Etapa 1',exact:true}).click();await expect(page.getByText('1 de 10 concluídos',{exact:true})).toBeVisible();await expect(page.getByText('10%',{exact:true})).toBeVisible();
  expect(f.getTask().status).toBe('a_fazer');mkdirSync('.tooling/implementation/task-progress',{recursive:true});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`.tooling/implementation/task-progress/detail-${testInfo.project.name}.png`,fullPage:true});await page.getByRole('progressbar',{name:'Progresso da tarefa'}).evaluate(element=>scrollTo(0,element.getBoundingClientRect().top+scrollY-260));await page.screenshot({path:`.tooling/implementation/task-progress/checklist-viewport-${testInfo.project.name}.png`});
  await page.getByRole('link',{name:'Todas as tarefas',exact:true}).click();await expect(page.getByText('1 de 10 concluídos',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Quadro',exact:true}).click();const picker=page.getByRole('combobox',{name:'Coluna do quadro'});if(await picker.isVisible()){await picker.click();await page.getByRole('option',{name:'A fazer',exact:true}).click();}
  await expect(page.getByText('1 de 10 concluídos',{exact:true})).toBeVisible();await page.screenshot({path:`.tooling/implementation/task-progress/board-${testInfo.project.name}.png`,fullPage:true});
  await page.goto('./#/');await expect(page.getByText('1 de 10 concluídos',{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('último item não conclui e conclusão manual preserva itens e avisa pendências',async({page})=>{
  const f=await fixture(page,9);await page.goto(`./#/tarefas/${f.task.id}`);await page.getByRole('checkbox',{name:'Etapa 10',exact:true}).click();await expect(page.getByText('10 de 10 concluídos',{exact:true})).toBeVisible();expect(f.getTask().status).toBe('a_fazer');
  await page.getByRole('checkbox',{name:'Etapa 10',exact:true}).click();await page.getByRole('link',{name:'Todas as tarefas',exact:true}).click();await page.getByRole('button',{name:'Concluir Preparar entrega de teste',exact:true}).click();await expect(page.getByText(/Concluída manualmente · 1 item pendente/)).toBeVisible();
  await page.getByRole('link',{name:'Preparar entrega de teste',exact:true}).click();await page.getByRole('checkbox',{name:'Etapa 10',exact:true}).click();await expect(page.getByText('10 de 10 concluídos',{exact:true})).toBeVisible();expect(f.getTask().status).toBe('concluida');
});
test('conflito reaplica somente o item pretendido na versão atual',async({page})=>{
  const f=await fixture(page);await page.goto(`./#/tarefas/${f.task.id}`);await expect(page.getByRole('checkbox',{name:'Etapa 1',exact:true})).toBeVisible();f.concurrentItem(1);
  await page.getByRole('checkbox',{name:'Etapa 1',exact:true}).click();await expect(page.getByRole('alert')).toContainText('outra tela');await page.getByRole('button',{name:'Atualizar e tentar novamente',exact:true}).click();
  await expect(page.getByRole('checkbox',{name:'Etapa 1',exact:true})).toBeChecked();await expect(page.getByRole('checkbox',{name:'Etapa 2',exact:true})).toBeChecked();await expect(page.getByText('2 de 10 concluídos',{exact:true})).toBeVisible();
});
test('resposta perdida verifica a mesma operação sem confirmar progresso antes do servidor',async({page})=>{
  const f=await fixture(page);await page.goto(`./#/tarefas/${f.task.id}`);await expect(page.getByRole('checkbox',{name:'Etapa 1',exact:true})).toBeVisible();f.loseNext();await page.getByRole('checkbox',{name:'Etapa 1',exact:true}).click();
  await expect(page.getByRole('button',{name:'Verificar resultado',exact:true})).toBeVisible();await expect(page.getByText('0 de 10 concluídos',{exact:true})).toBeVisible();f.concurrentItem(1);await page.getByRole('button',{name:'Verificar resultado',exact:true}).click();await expect(page.getByText('2 de 10 concluídos',{exact:true})).toBeVisible();
  expect(f.operations).toHaveLength(2);expect(f.operations[1]).toEqual(f.operations[0]);expect(f.getTask().version).toBe(3);
});
test('sem rede não marca nem enfileira e captura exige escolher a frente para concluir',async({page,context})=>{
  const f=await fixture(page);await page.goto(`./#/tarefas/${f.task.id}`);await expect(page.getByRole('checkbox',{name:'Etapa 1',exact:true})).toBeVisible();await context.setOffline(true);await expect(page.getByRole('checkbox',{name:'Etapa 1',exact:true})).toBeDisabled();await expect(page.getByText(/Conecte-se para marcar os itens/)).toBeVisible();await context.setOffline(false);
  await page.getByRole('link',{name:'Todas as tarefas',exact:true}).click();await page.getByRole('button',{name:'Concluir Captura sem frente',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Mover para concluída'});await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:'Mover tarefa',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('frente');await dialog.getByRole('combobox',{name:'Frente',exact:true}).click();await page.getByRole('option',{name:'Jiu-jítsu',exact:true}).click();await dialog.getByRole('button',{name:'Mover tarefa',exact:true}).click();await expect(dialog).not.toBeVisible();expect(f.operations).toHaveLength(1);
  const row=page.locator('.task-row').filter({has:page.getByRole('link',{name:'Captura sem frente',exact:true})});await expect(row.getByText('1 de 1 concluído',{exact:true})).toBeVisible();
});
