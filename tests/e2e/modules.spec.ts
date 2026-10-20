import { expect, test } from '@playwright/test';

test('create a client and an opportunity with an explicit next action', async ({ page }) => {
  await page.goto('/contatos');
  await page.getByRole('button', { name: 'Criar cliente', exact: true }).first().click();
  await page.getByLabel('Nome *', { exact: true }).fill('Pessoa de teste');
  await page.getByLabel('E-mail', { exact: true }).fill('pessoa-teste@example.com');
  await page.getByRole('dialog').getByRole('button', { name: 'Criar cliente', exact: true }).click();
  await expect(page.getByRole('link', { name: /Pessoa de teste/ }).first()).toBeVisible();
  await page.goto('/comercial');
  await page.getByRole('button', { name: 'Criar oportunidade', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'Criar oportunidade' })).toBeVisible();
  await page.getByLabel('Oferta *').fill('Consultoria de teste');
  await expect(page.getByLabel('Próxima ação', { exact: true })).toBeVisible();
});

test('financial entry explains that it is a local record', async ({ page }) => {
  await page.goto('/financeiro');
  await expect(page.getByRole('heading', { name: 'Financeiro', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Criar previsão', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'Criar previsão' })).toBeVisible();
  await expect(page.getByText('Registro local. Não emite cobrança nem movimenta dinheiro.')).toBeVisible();
});

test('agenda, weekly review and settings are reachable', async ({ page }) => {
  const errors:string[]=[];page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});page.on('pageerror',error=>errors.push(error.message));
  for (const [route, title] of [['/agenda', 'Agenda'], ['/revisao', 'Revisão semanal'], ['/configuracoes', 'Configurações']]) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});
