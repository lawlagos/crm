import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { createInitialState, executeCommand, queryApi, type DomainState, type Row } from '../../cloud/domain';
import { createHandler, type CloudRuntime } from '../../cloud/server/core';

const areaId = '11111111-1111-4111-8111-111111111111';
const endpoint = 'https://script.google.com/macros/s/task-move-queue-test/exec';

async function fixture(page: Page) {
  const context = { now: new Date().toISOString(), uuid: () => crypto.randomUUID() };
  let state: DomainState = createInitialState(context.now);
  state.tables.mutation_receipts = [];
  const tasks = ['Preparar entrega de teste', 'Revisar proposta de teste'].map(title =>
    executeCommand(state, 'createTask', { title, areaId }, { operationId: crypto.randomUUID() }, context) as Row);
  const session = { session: 'fixture-move-queue-session-00000000000000000000000', email: 'lawlagos@gmail.com', expiresAt: '2099-10-20T12:00:00Z' };
  const runtime: CloudRuntime = {
    now: () => context.now, uuid: context.uuid, randomToken: () => session.session, hash: value => value,
    clientId: 'fixture', verifyToken: () => ({}),
    getSession: key => key === session.session ? { ...session, sub: 'fixture' } : null,
    putSession: () => {}, deleteSession: () => {},
    transaction: work => { const draft = structuredClone(state), result = work(draft); state = draft; return result; },
    read: () => structuredClone(state),
  };
  const handle = createHandler(runtime, { executeCommand, queryApi });
  const operations: { command: string; input: Row; meta: Row }[] = [];
  let gate: Promise<void> | undefined, release: (() => void) | undefined, lostResponses = 0;
  await page.route('**/config.js', route => route.fulfill({ contentType: 'application/javascript', body: `window.CENTRAL_CONFIG={apiUrl:'${endpoint}',googleClientId:'fixture',basePath:'/crm/'};` }));
  await page.addInitScript(value => localStorage.setItem('central-session-v1', JSON.stringify(value)), session);
  await page.route(endpoint, async route => {
    const packet = route.request().postDataJSON();
    const command = packet.request?.path === '/api/commands';
    if (command) { operations.push(packet.request.body); await gate; }
    try {
      const data = handle(packet);
      // The server commits before losing the response, exercising receipt deduplication.
      if (command && lostResponses > 0) { lostResponses--; await route.abort('failed'); return; }
      await route.fulfill({ json: { ok: true, data } });
    } catch (error) {
      const failure = error as { code?: string; message: string; fieldErrors?: Record<string, string> };
      await route.fulfill({ json: { ok: false, error: { code: failure.code, message: failure.message, fieldErrors: failure.fieldErrors, status: failure.code === 'CONFLICT' ? 409 : 422 } } });
    }
  });
  return {
    tasks, operations,
    task: (index = 0) => state.tables.tasks.find(row => row.id === tasks[index].id)!,
    hold: () => { gate = new Promise(resolve => { release = resolve; }); },
    release: () => { gate = undefined; release?.(); },
    lose: (count: number) => { lostResponses = count; },
    conflict: () => executeCommand(state, 'updateTask', { id: tasks[0].id, description: 'Alterada em outro aparelho' }, { operationId: crypto.randomUUID(), expectedVersion: 1 }, context),
  };
}

async function move(page: Page, title: string) {
  await page.getByRole('button', { name: `Ações de ${title}`, exact: true }).click();
  await page.getByRole('menuitem', { name: 'Em andamento', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Mover para em andamento', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Mover tarefa', exact: true }).click();
  await expect(dialog).not.toBeVisible();
}

async function navigate(page: Page, name: string) {
  await page.getByRole('link', { name, exact: true }).filter({ visible: true }).click();
}

test('fecha o modal, mantém fila ao navegar e salva tarefas distintas em sequência', async ({ page }, testInfo) => {
  const f = await fixture(page);
  await page.goto('./#/tarefas');
  await page.getByRole('button', { name: 'Quadro', exact: true }).click();
  const picker = page.getByRole('combobox', { name: 'Coluna do quadro' });
  if (await picker.isVisible()) { await picker.click(); await page.getByRole('option', { name: 'A fazer', exact: true }).click(); }
  f.hold();
  await move(page, String(f.tasks[0].title));
  const queue = page.getByRole('region', { name: 'Fila de tarefas', exact: true });
  await expect(queue).toContainText(String(f.tasks[0].title));
  await expect(queue).toContainText('Salvando · tentativa 1 de 3');
  await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: `Ações de ${f.tasks[0].title}`, exact: true })).toBeDisabled();
  await move(page, String(f.tasks[1].title));
  await expect(queue).toContainText('Na fila');
  expect(f.operations).toHaveLength(1);
  mkdirSync('.tooling/implementation/task-move-queue', { recursive: true });
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); scrollTo(0, 0); });
  await page.screenshot({ path: `.tooling/implementation/task-move-queue/board-${testInfo.project.name}.png`, fullPage: true });
  const collapse = queue.getByRole('button', { name: 'Recolher fila', exact: true });
  await collapse.focus();
  await page.keyboard.press('Enter');
  await expect(queue.getByRole('link', { name: String(f.tasks[0].title), exact: true })).not.toBeVisible();
  await expect(queue.getByRole('button', { name: 'Ver fila', exact: true })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(queue.getByRole('button', { name: 'Recolher fila', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await queue.getByRole('link', { name: String(f.tasks[0].title), exact: true }).click();
  await expect(page.getByRole('button', { name: 'Editar tarefa', exact: true })).toBeDisabled();
  await expect(page.getByRole('heading', { name: String(f.tasks[0].title), exact: true })).toBeVisible();
  await navigate(page, 'Hoje');
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole('heading', { name: 'Um dia. Os próximos passos.', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(queue).toContainText(String(f.tasks[1].title));
  expect(f.task().status).toBe('a_fazer');
  expect(f.task(1).status).toBe('a_fazer');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `.tooling/implementation/task-move-queue/${testInfo.project.name}.png`, fullPage: true });
  f.release();
  await expect(queue.getByText('Salvo', { exact: true })).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeEnabled();
  expect(f.operations).toHaveLength(2);
  expect(f.operations.map(operation => operation.input.id)).toEqual(f.tasks.map(task => task.id));
  expect(f.task().status).toBe('em_andamento');
  expect(f.task(1).status).toBe('em_andamento');
});

test('arrastar pelo puxador para outra coluna abre a confirmação antes de salvar', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'No celular, a troca de coluna usa o menu Ações.');
  const f = await fixture(page);
  await page.goto('./#/tarefas');
  await page.getByRole('button', { name: 'Quadro', exact: true }).click();
  const handle = page.getByRole('button', { name: `Arrastar ${f.tasks[0].title}; alternativa no menu Ações`, exact: true });
  await handle.scrollIntoViewIfNeeded();
  const target = page.locator('.kanban-column').filter({ has: page.getByRole('heading', { name: 'Em andamento', exact: true }) });
  const sourceBox = await handle.boundingBox(), targetBox = await target.boundingBox();
  expect(sourceBox).not.toBeNull(); expect(targetBox).not.toBeNull();
  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2 + 12, sourceBox!.y + sourceBox!.height / 2, { steps: 3 });
  await expect(page.locator('.kanban-card.dragging')).toBeVisible();
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + 100, { steps: 15 });
  await page.mouse.up();
  const dialog = page.getByRole('dialog', { name: 'Mover para em andamento', exact: true });
  await expect(dialog).toBeVisible();
  expect(f.operations).toHaveLength(0);
  expect(f.task().status).toBe('a_fazer');
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
});

test('repete duas respostas perdidas com mesmo corpo e aplica a mudança uma única vez', async ({ page }) => {
  const f = await fixture(page);
  await page.goto('./#/tarefas');
  f.lose(2);
  await move(page, String(f.tasks[0].title));
  const queue = page.getByRole('region', { name: 'Fila de tarefas' });
  await expect(queue.getByText('Salvo', { exact: true })).toBeVisible({ timeout: 20_000 });
  expect(f.operations).toHaveLength(3);
  expect(f.operations[1]).toEqual(f.operations[0]);
  expect(f.operations[2]).toEqual(f.operations[0]);
  expect(f.task().version).toBe(2);
  expect(f.task().status).toBe('em_andamento');
});

test('pausa sem sessão e retoma a mesma operação após restaurar o acesso', async ({ page }) => {
  const f = await fixture(page);
  await page.goto('./#/tarefas');
  const session = await page.evaluate(() => localStorage.getItem('central-session-v1'));
  expect(session).not.toBeNull();
  f.lose(1);
  await move(page, String(f.tasks[0].title));
  const queue = page.getByRole('region', { name: 'Fila de tarefas' });
  await expect(queue).toContainText('Nova tentativa em instantes');
  await page.evaluate(() => {
    localStorage.removeItem('central-session-v1');
    dispatchEvent(new StorageEvent('storage', { key: 'central-session-v1', newValue: null }));
  });
  await expect(page.getByRole('heading', { name: 'Entre na sua Central', exact: true })).toBeVisible();
  await expect(queue).not.toBeVisible();
  await page.waitForTimeout(1_500);
  expect(f.operations).toHaveLength(1);
  await page.evaluate(value => {
    localStorage.setItem('central-session-v1', value!);
    dispatchEvent(new StorageEvent('storage', { key: 'central-session-v1', newValue: value }));
  }, session);
  await expect(queue.getByText('Salvo', { exact: true })).toBeVisible();
  expect(f.operations).toHaveLength(2);
  expect(f.operations[1]).toEqual(f.operations[0]);
  expect(f.task().version).toBe(2);
});

test('limita a três tentativas e verifica resultado incerto com a operação original', async ({ page }) => {
  const f = await fixture(page);
  await page.goto('./#/tarefas');
  f.lose(3);
  await move(page, String(f.tasks[0].title));
  const queue = page.getByRole('region', { name: 'Fila de tarefas' });
  await expect(queue.getByRole('button', { name: 'Verificar resultado', exact: true })).toBeVisible({ timeout: 20_000 });
  expect(f.operations).toHaveLength(3);
  await expect(queue.getByRole('button', { name: 'Dispensar', exact: true })).not.toBeVisible();
  await page.waitForTimeout(1_500);
  expect(f.operations).toHaveLength(3);
  await queue.getByRole('button', { name: 'Verificar resultado', exact: true }).click();
  await expect(queue.getByText('Salvo', { exact: true })).toBeVisible();
  expect(f.operations).toHaveLength(4);
  for (const operation of f.operations) expect(operation).toEqual(f.operations[0]);
  expect(f.task().version).toBe(2);
});

test('conflito encerra sem repetir e não bloqueia a próxima tarefa independente', async ({ page }) => {
  const f = await fixture(page);
  await page.goto('./#/tarefas');
  await expect(page.getByRole('button', { name: `Ações de ${f.tasks[0].title}`, exact: true })).toBeVisible();
  f.conflict(); f.hold();
  await move(page, String(f.tasks[0].title));
  await move(page, String(f.tasks[1].title));
  const queue = page.getByRole('region', { name: 'Fila de tarefas' });
  await expect(queue).toContainText('Na fila');
  f.release();
  await expect(queue.getByRole('button', { name: 'Dispensar', exact: true })).toBeVisible();
  await expect(queue.getByText('Salvo', { exact: true })).toBeVisible();
  await expect(queue.getByRole('button', { name: 'Verificar resultado', exact: true })).not.toBeVisible();
  expect(f.operations).toHaveLength(2);
  expect(f.task().status).toBe('a_fazer');
  expect(f.task(1).status).toBe('em_andamento');
  await queue.getByRole('button', { name: 'Dispensar', exact: true }).click();
  await expect(queue).not.toContainText(String(f.tasks[0].title));
});
