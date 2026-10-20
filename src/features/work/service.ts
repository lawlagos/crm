import { z } from 'zod';
import type { Database } from '@/db';
import { todayInZone } from '@/lib/time';
import { area, business, camelPatch, dto, getRow, id, insert, now, parse, reference, update, version, type Handler, type Row } from '../shared';
import { projectCreate, projectPatch, taskCreate, taskPatch } from './schemas';

const taskFields = ['title','description','areaId','projectId','priority','status','dueDate','estimateMinutes','reviewDate','waitingReason','checklist','tags'];
const open = "status NOT IN ('concluida','cancelada')";
function taskDto(db:Database,row:Row) {
  const started=(db.$client.prepare(`SELECT count(*) n FROM tasks WHERE started_at IS NOT NULL AND ${open}`).get() as {n:number}).n;
  const limit=Number(JSON.parse((db.$client.prepare("SELECT value_json FROM settings WHERE key='wipLimit'").get() as {value_json:string}).value_json));
  return {...dto(row),warnings:started>limit?[`${started} tarefas iniciadas; limite de organização configurado: ${limit}.`]:[]};
}
function validateTask(db: Database, task: Row) {
  if (task.area_id) area(db, task.area_id);
  if (task.status !== 'entrada' && !task.area_id) business('Escolha uma frente para classificar a tarefa.');
  if (task.status === 'aguardando' && (!task.waiting_reason || !task.review_date)) business('Aguardando exige motivo e data de revisão.');
  const project = reference(db, 'projects', task.project_id);
  if (project && (project.area_id !== task.area_id || project.status === 'arquivado')) business('O projeto deve estar disponível na mesma frente da tarefa.');
}
export const createTask: Handler = (db, input) => {
  const value = parse(taskCreate, input); const time = now();
  const row: Row = { id: id(), title: value.title, description: '', area_id: null, project_id: null, priority: 'normal', status: value.areaId ? 'a_fazer' : 'entrada', due_date: null, estimate_minutes: null, review_date: null, waiting_reason: null, checklist: '[]', tags: '[]', started_at: null, completed_at: null, ...camelPatch(value, taskFields), version: 1, created_at: time, updated_at: time };
  validateTask(db, row);
  if (row.status === 'em_andamento') row.started_at = time;
  if (row.status === 'concluida') row.completed_at = time;
  return taskDto(db,insert(db, 'tasks', row));
};
export const updateTask: Handler = (db, input, meta) => {
  const value = parse(taskPatch, input); const current = getRow(db, 'tasks', value.id); version(current, meta);
  const patch = camelPatch(value, taskFields); const merged = { ...current, ...patch }; validateTask(db, merged);
  if ('area_id' in patch || 'project_id' in patch) {
    const hasCalendar = db.$client.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='calendar_events'").get();
    if (hasCalendar && db.$client.prepare('SELECT 1 FROM calendar_events WHERE task_id = ? AND (area_id IS NOT ? OR (? IS NOT NULL AND project_id IS NOT NULL AND project_id IS NOT ?)) LIMIT 1').get(value.id, merged.area_id, merged.project_id, merged.project_id)) business('A alteração invalidaria eventos vinculados à tarefa.');
  }
  if (merged.status === 'em_andamento' && !current.started_at) patch.started_at = now();
  if (merged.status === 'concluida' && current.status !== 'concluida') patch.completed_at = now();
  if (merged.status !== 'concluida') patch.completed_at = null;
  if (['concluida','cancelada'].includes(String(merged.status))) patch.focus_date = null;
  if (current.series_id) patch.is_exception = 1;
  return taskDto(db,update(db, 'tasks', value.id, patch));
};
export const setFocus: Handler = (db, input, meta) => {
  const value = parse(z.object({ id: z.string(), selected: z.boolean() }).strict(), input); const task = getRow(db, 'tasks', value.id); version(task, meta);
  const today = todayInZone(now());
  if (value.selected && ['concluida','cancelada'].includes(String(task.status))) business('Escolha uma tarefa aberta.');
  const count = db.$client.prepare(`SELECT count(*) n FROM tasks WHERE focus_date = ? AND id != ? AND ${open}`).get(today, value.id) as { n: number };
  if (value.selected && count.n >= 3) business('Meu foco permite no máximo três tarefas abertas.');
  return dto(update(db, 'tasks', value.id, { focus_date: value.selected ? today : null }));
};
export const createProject: Handler = (db, input) => {
  const value = parse(projectCreate, input); area(db, value.areaId); reference(db, 'contacts', value.contactId); const time = now();
  return dto(insert(db, 'projects', { id: id(), name: value.name, area_id: value.areaId, contact_id: value.contactId ?? null, goal: value.objective, target_date: value.targetDate ?? null, status: 'ativo', version: 1, created_at: time, updated_at: time }));
};
export const updateProject: Handler = (db, input, meta) => {
  const value = parse(projectPatch, input); const current = getRow(db, 'projects', value.id); version(current, meta);
  if ((value.status==='arquivado' || (value.areaId && value.areaId!==current.area_id)) && db.$client.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='recurrence_series'").get() && db.$client.prepare("SELECT 1 FROM recurrence_series WHERE active=1 AND json_extract(payload,'$.projectId')=? LIMIT 1").get(value.id)) business('Encerre ou ajuste as séries ativas antes de arquivar ou mudar a frente do projeto.');
  if (value.areaId) {
    area(db, value.areaId);
    if (value.areaId !== current.area_id) {
      for (const table of ['tasks','calendar_events','opportunities','receivables']) {
        if (db.$client.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table) && db.$client.prepare(`SELECT 1 FROM ${table} WHERE project_id=? LIMIT 1`).get(value.id)) business('Projeto com vínculos não pode mudar de frente.');
      }
    }
  }
  reference(db, 'contacts', value.contactId);
  if (['concluido','arquivado'].includes(value.status ?? '')) {
    const pending = db.$client.prepare(`SELECT count(*) n FROM tasks WHERE project_id = ? AND ${open}`).get(value.id) as { n: number };
    if (pending.n && !value.openTaskDecision) business('Escolha como tratar as tarefas abertas.');
    if (value.openTaskDecision === 'cancelar') db.$client.prepare(`UPDATE tasks SET status='cancelada', focus_date=NULL, version=version+1, updated_at=? WHERE project_id=? AND ${open}`).run(now(), value.id);
  }
  return dto(update(db, 'projects', value.id, { ...camelPatch(value, ['name','areaId','contactId','targetDate','status']), ...('objective' in value ? { goal: value.objective } : {}) }));
};
export const templates: Record<string, string[]> = { jiu: ['Avaliação técnica','Análise de vídeo','Devolutiva','Acompanhamento'], agencia: ['Briefing','Início','Plano','Entregas','Relatório'], cursos: ['Oferta','Conteúdo','Chamada para WhatsApp','Abertura','Acompanhamento'] };
export const applyProjectTemplate: Handler = (db, input, meta) => {
  const value = parse(z.object({ projectId: z.string(), templateKey: z.enum(['jiu','agencia','cursos']) }).strict(), input); const project = getRow(db, 'projects', value.projectId); version(project, meta);
  if (project.status === 'arquivado') business('Projeto arquivado.');
  update(db, 'projects', project.id, {});
  return templates[value.templateKey].map(title => createTask(db, { title, areaId: project.area_id, projectId: project.id, status: 'a_fazer' }, meta));
};
export const workHandlers = { createTask, updateTask, moveTask: updateTask, setFocus, createProject, updateProject, applyProjectTemplate };
