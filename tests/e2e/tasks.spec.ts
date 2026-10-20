import { test,expect } from '@playwright/test';
test('captures a task, persists it and keeps the layout usable on this device',async({page})=>{
 await page.goto('/tarefas');
 await expect(page.getByRole('heading',{name:'Tarefas',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Criar tarefa',exact:true}).first().click();
 const dialog=page.getByRole('dialog');
 await dialog.getByLabel('Título *',{exact:true}).fill(`Retorno de teste ${test.info().project.name}`);
 await dialog.getByRole('button',{name:'Criar tarefa',exact:true}).click();
 await expect(dialog).not.toBeVisible();
 await expect(page.getByText(`Retorno de teste ${test.info().project.name}`,{exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByText(`Retorno de teste ${test.info().project.name}`,{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('server rejects writes forged from another origin',async({request})=>{
 const response=await request.post('/api/commands',{headers:{origin:'https://outside.example'},data:{command:'createTask',input:{title:'forged'},meta:{operationId:crypto.randomUUID()}}});
 expect(response.status()).toBe(403);
});
