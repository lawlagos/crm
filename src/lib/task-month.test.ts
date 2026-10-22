import { expect, test } from 'vitest';
import { taskMonthSummary } from './task-month';

test('counts creation and completion independently in São Paulo, including older tasks and excluding reopened tasks', () => {
  expect(taskMonthSummary([
    { createdAt: '2026-10-01T02:59:59Z', completedAt: '2026-10-01T03:00:00Z', status: 'concluida' },
    { createdAt: '2026-10-01T03:00:00Z', completedAt: null, status: 'a_fazer' },
    { createdAt: '2026-11-01T02:59:59Z', completedAt: '2026-11-01T03:00:00Z', status: 'concluida' },
    { createdAt: '2026-09-01T12:00:00Z', completedAt: '2026-10-20T12:00:00Z', status: 'a_fazer' },
  ], '2026-10')).toEqual({ created: 2, completed: 1 });
  expect(taskMonthSummary([], '2026-10')).toEqual({ created: 0, completed: 0 });
});
