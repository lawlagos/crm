// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { DateField } from './date-field';
afterEach(() => { cleanup(); vi.useRealTimers(); });
test('abre no valor, destaca hoje e move foco pelo limite do mês', () => {
 vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-20T15:00:00Z'));
 render(createElement(DateField,{id:'date',value:'2026-10-31',onChange:vi.fn()}));
 fireEvent.click(screen.getByRole('button',{name:'Abrir calendário'}));
 const selected=screen.getByRole('button',{name:'31/10/2026'});
 expect(document.activeElement).toBe(selected);
 expect(screen.getByRole('button',{name:'20/10/2026'}).getAttribute('aria-current')).toBe('date');
 fireEvent.keyDown(selected,{key:'ArrowRight'});
 expect(screen.getByRole('button',{name:'01/11/2026'})).toBe(document.activeElement);
});
test('reabrir acompanha novo valor e Hoje seleciona data de São Paulo', () => {
 vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-21T01:00:00Z'));
 const onChange=vi.fn();const view=render(createElement(DateField,{id:'date',value:'2026-10-01',onChange}));
 fireEvent.click(screen.getByRole('button',{name:'Abrir calendário'}));
 fireEvent.click(screen.getByRole('button',{name:'Fechar calendário'}));
 view.rerender(createElement(DateField,{id:'date',value:'2026-11-10',onChange}));
 fireEvent.click(screen.getByRole('button',{name:'Abrir calendário'}));
 expect(document.activeElement).toBe(screen.getByRole('button',{name:'10/11/2026'}));
 fireEvent.click(screen.getByRole('button',{name:'Hoje'}));
 expect(onChange).toHaveBeenCalledWith('2026-10-20');
});
