// @vitest-environment jsdom
import { afterEach, expect, test } from 'vitest';
import { currentRoute, hrefFor, installHistoryBridge, navigate } from '../../web/router';

afterEach(() => window.history.replaceState(null, '', '/crm/'));
test('keeps the GitHub Pages base and route filters in the hash', () => {
  expect(hrefFor('/tarefas?areaId=jiu')).toBe('/crm/#/tarefas?areaId=jiu');
  window.history.replaceState(null, '', '/crm/#/projetos/abc?areaId=jiu');
  expect(currentRoute()).toBe('/projetos/abc?areaId=jiu');
  expect(hrefFor('https://example.com')).toBe('https://example.com');
});
test('adapts existing history calls without leaving /crm/', () => {
  installHistoryBridge();
  window.history.replaceState(null, '', '/comercial?stage=ganho');
  expect(window.location.pathname).toBe('/crm/');
  expect(currentRoute()).toBe('/comercial?stage=ganho');
  navigate('/tarefas/task-123');
  expect(currentRoute()).toBe('/tarefas/task-123');
});
