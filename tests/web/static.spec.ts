import { expect, test, type Page } from '@playwright/test';

const session = { session: 'static-test-session-0000000000000000000000', email: 'lawlagos@gmail.com', expiresAt: '2099-10-20T12:00:00.000Z' };
async function mockCloud(page: Page, authenticated = true) {
  const tasks: Record<string, unknown>[] = [];
  const area = { id: 'area-jiu', name: 'Jiu-jítsu', colorKey: 'jiu', commercialEnabled: true, archivedAt: null, version: 1 };
  const now = '2026-10-20T12:00:00.000Z';
  await page.route('**/config.js', route => route.fulfill({ contentType: 'application/javascript', body: `window.CENTRAL_CONFIG={apiUrl:'https://script.google.com/macros/s/static-test-api/exec',googleClientId:'test.apps.googleusercontent.com',basePath:'/crm/'};` }));
  await page.addInitScript(({ session, authenticated }) => {
    if (authenticated) localStorage.setItem('central-session-v1', JSON.stringify(session));
    else localStorage.removeItem('central-session-v1');
    let callback: ((response: { credential: string }) => void) | undefined;
    window.google = { accounts: { id: { initialize: options => { callback = options.callback; }, renderButton: element => { const button = document.createElement('button'); button.textContent = 'Continuar com Google'; button.onclick = () => callback?.({ credential: 'test-id-token' }); element.replaceChildren(button); }, disableAutoSelect: () => {} } } };
  }, { session, authenticated });
  await page.route('https://script.google.com/macros/s/static-test-api/exec', async route => {
    const body = route.request().postDataJSON(); let data: unknown = {};
    if (body.action === 'login') data = session;
    if (body.action === 'api') {
      const url = new URL(body.request.path, 'https://api.invalid'); const path = url.pathname;
      if (path === '/api/bootstrap') data = { areas: [area], settings: { wipLimit: 3, forumHours: { weekdays: [1, 2, 3, 4, 5], start: '09:00', end: '17:00' }, availabilityWindows: [] }, settingsVersions: { wipLimit: 1, forumHours: 1, availabilityWindows: 1 }, serverNow: now, isDemo: false };
      else if (path === '/api/commands') { const input = body.request.body.input; const record = { ...input, id: `task-${tasks.length + 1}`, version: 1, createdAt: now }; tasks.push(record); data = { result: record }; }
      else if (path === '/api/overview') data = { focus: [], events: [], attention: { overdueTasks: 0, overdueOpportunities: 0, withoutNextAction: 0 }, areas: [{ ...area, openTasks: tasks.length, startedTasks: 0, openOpportunities: 0, nextDelivery: null }], finance: { receivedCents: 0, overdueCents: 0 } };
      else if (path === '/api/tasks') data = { items: tasks, total: tasks.length, page: 1, pageSize: 25 };
      else if (path.startsWith('/api/tasks/')) data = tasks.find(task => task.id === path.split('/').at(-1));
      else if (path === '/api/backup') data = { download: { content: JSON.stringify({ tables: { tasks } }), contentType: 'application/json', filename: 'central-backup.json' } };
      else if (path === '/api/notifications') data = { enabled: false, publicKey: null };
      else data = { items: [], total: 0, page: 1, pageSize: 25 };
    }
    await route.fulfill({ json: { ok: true, data } });
  });
}

test('login preserves a direct hash route and logout removes the private interface', async ({ page }) => {
  await mockCloud(page, false); await page.goto('./#/tarefas');
  await expect(page.getByRole('heading', { name: 'Entre na sua Central' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar com Google' }).click();
  await expect(page.getByRole('heading', { name: 'Tarefas', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/crm\/#\/tarefas$/);
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Entre na sua Central' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tarefas', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('central-session-v1'))).toBeNull();
});

test('static forms, detail routes and draft protection work inside /crm/', async ({ page }) => {
  await mockCloud(page); await page.goto('./#/tarefas');
  await page.getByRole('button', { name: 'Criar tarefa', exact: true }).first().click();
  const form = page.getByRole('dialog', { name: 'Criar tarefa' });
  await form.getByLabel('Título *').fill('Retorno na Central online');
  await page.evaluate(() => { window.location.hash = '/projetos'; });
  await expect(page.getByRole('dialog', { name: 'Descartar rascunho?' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar editando' }).click();
  await expect(form.getByLabel('Título *')).toHaveValue('Retorno na Central online');
  await form.getByRole('button', { name: 'Criar tarefa', exact: true }).click();
  await expect(form).not.toBeVisible();
  await page.getByRole('link', { name: 'Retorno na Central online', exact: true }).click();
  await expect(page).toHaveURL(/\/crm\/#\/tarefas\/task-1$/);
  await expect(page.getByRole('heading', { name: 'Retorno na Central online', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('cloud backup is an authenticated JSON download', async ({ page }) => {
  await mockCloud(page); await page.goto('./#/configuracoes');
  await expect(page.getByRole('heading', { name: 'Backup dos dados' })).toBeVisible();
  await expect(page.getByText('Backup completo do banco SQLite.')).toHaveCount(0);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar backup JSON' }).click();
  expect((await download).suggestedFilename()).toBe('central-backup.json');
});

test('an access rejection keeps the private interface closed', async ({ page }) => {
  await mockCloud(page, false);
  await page.route('https://script.google.com/macros/s/static-test-api/exec', route => route.request().postDataJSON().action === 'login' ? route.fulfill({ json: { ok: false, error: { code: 'FORBIDDEN', status: 403, message: 'Use a conta autorizada para acessar esta Central.' } } }) : route.fallback());
  await page.goto('./#/tarefas');
  await page.getByRole('button', { name: 'Continuar com Google' }).click();
  await expect(page.getByRole('alert')).toContainText('Use a conta autorizada');
  await expect(page.getByRole('heading', { name: 'Tarefas', exact: true })).toHaveCount(0);
});

test('failed revocation preserves the session and reports the failure', async ({ page }) => {
  await mockCloud(page);
  await page.route('https://script.google.com/macros/s/static-test-api/exec', route => route.request().postDataJSON().action === 'logout' ? route.abort('internetdisconnected') : route.fallback());
  await page.goto('./#/tarefas');
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Não foi possível confirmar a saída');
  await expect(page.getByRole('heading', { name: 'Tarefas', exact: true })).toBeVisible();
  expect(await page.evaluate(() => !!localStorage.getItem('central-session-v1'))).toBe(true);
});
