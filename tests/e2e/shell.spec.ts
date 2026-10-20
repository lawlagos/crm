import { expect, test } from '@playwright/test';

test('shell preserves local typography, authored controls and drafts', async ({ page }) => {
  await page.goto('/tarefas');
  await expect(page.getByRole('heading', { name: 'Tarefas', exact: true })).toBeVisible();
  expect(await page.locator('body').evaluate(element => getComputedStyle(element).fontFamily)).toContain('Source Sans 3');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Criar tarefa', exact: true }).last().click();
  const dialog = page.getByRole('dialog', { name: 'Criar tarefa' });
  await dialog.getByLabel('Título *').fill('Rascunho protegido');
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Descartar rascunho?' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar editando' }).click();
  await expect(dialog.getByLabel('Título *')).toHaveValue('Rascunho protegido');
  await dialog.getByLabel('Frente', { exact: true }).click();
  await expect(page.getByRole('option', { name: 'Jiu-jítsu' })).toBeVisible();
  await page.keyboard.press('Escape');
  await dialog.getByRole('button', { name: 'Abrir calendário' }).click();
  await expect(page.getByRole('dialog', { name: 'Escolher data' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mês anterior' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog.getByRole('button', { name: 'Abrir calendário' })).toBeFocused();
});

test('global search keeps personal text out of the address', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Buscar na Central' }).click();
  await page.getByRole('textbox', { name: 'O que você procura?' }).fill('pessoa@example.com');
  await expect(page).not.toHaveURL(/example/);
  await page.getByRole('button', { name: 'Limpar busca' }).click();
  await expect(page.getByRole('textbox', { name: 'O que você procura?' })).toBeFocused();
  await expect(page.getByRole('textbox', { name: 'O que você procura?' })).toHaveValue('');
});

test('background refresh preserves an edited draft and its original version', async ({ page }) => {
  await page.clock.install();
  const task = { id: 'snapshot-task', title: 'Título original', areaId: null, projectId: null, status: 'entrada', priority: 'normal', dueDate: null, description: '', estimateMinutes: null, waitingReason: null, reviewDate: null, tags: [], checklist: [], version: 1 };
  let current = task;
  await page.route('**/api/tasks/snapshot-task', route => route.fulfill({ json: current }));
  await page.goto('/tarefas/snapshot-task');
  await page.getByRole('button', { name: 'Editar tarefa', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar tarefa' });
  await dialog.getByLabel('Título *').fill('Meu rascunho');
  current = { ...task, title: 'Título atualizado no telefone', version: 2 };
  await page.clock.fastForward(31_000);
  await expect(dialog.getByLabel('Título *')).toHaveValue('Meu rascunho');
  let submittedVersion: number | undefined;
  await page.route('**/api/commands', route => {
    submittedVersion = route.request().postDataJSON().meta.expectedVersion;
    return route.fulfill({ status: 409, json: { code: 'CONFLICT', message: 'Este registro mudou em outra tela.' } });
  });
  await dialog.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Este registro mudou em outra tela.');
  expect(submittedVersion).toBe(1);
  await expect(dialog.getByLabel('Título *')).toHaveValue('Meu rascunho');
});

test('a failed background read keeps the draft and the operation used to verify an uncertain write',async({page})=>{
 await page.clock.install();let unavailable=false;let reads=0;let operationId='';
 const task={id:'offline-draft',title:'Título anterior',areaId:null,projectId:null,status:'entrada',priority:'normal',dueDate:null,description:'',estimateMinutes:null,waitingReason:null,reviewDate:null,tags:[],checklist:[],version:1};
 await page.route('**/api/tasks/offline-draft',route=>{reads++;return route.fulfill(unavailable?{status:503,json:{code:'UNAVAILABLE',message:'Servidor indisponível'}}:{json:task});});
 await page.route('**/api/commands',route=>{const payload=route.request().postDataJSON();if(!operationId){operationId=payload.meta.operationId;return route.abort('failed');}expect(payload.meta.operationId).toBe(operationId);return route.fulfill({json:{result:{...task,title:'Rascunho preservado',version:2}}});});
 await page.goto('/tarefas/offline-draft');await page.getByRole('button',{name:'Editar tarefa',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Editar tarefa'});await dialog.getByLabel('Título *').fill('Rascunho preservado');
 await dialog.getByRole('button',{name:'Salvar alterações'}).click();await expect(dialog.getByRole('button',{name:'Verificar resultado'})).toBeVisible();
 unavailable=true;await page.clock.fastForward(31_000);await expect.poll(()=>reads).toBeGreaterThan(1);await page.clock.fastForward(2_000);
 await expect(page.getByText(/Os dados são da última leitura/)).toBeVisible();
 await expect(dialog.getByLabel('Título *')).toHaveValue('Rascunho preservado');
 unavailable=false;await dialog.getByRole('button',{name:'Verificar resultado'}).click();await expect(dialog).not.toBeVisible();
});
