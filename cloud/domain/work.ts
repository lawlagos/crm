import{z}from'zod';
import{area,business,get,insert,openTask,parse,patch,pick,record,reference,rows,setting,today,version,type DomainMeta,type Env,type Handler,type Row}from'./shared';
import{taskCreate,taskPatch,projectCreate,projectPatch}from'./schemas';
const taskFields=['title','description','areaId','projectId','priority','status','dueDate','estimateMinutes','reviewDate','waitingReason','checklist','tags'];
function validateTask(env:Env,task:Row){
  if(task.areaId)area(env,task.areaId);
  if(task.status!=='entrada'&&!task.areaId)business('Escolha uma frente para classificar a tarefa.');
  if(task.status==='aguardando'&&(!task.waitingReason||!task.reviewDate))business('Aguardando exige motivo e data de revisão.');
  const project=reference(env,'projects',task.projectId);if(project&&(project.areaId!==task.areaId||project.status==='arquivado'))business('O projeto deve estar disponível na mesma frente da tarefa.');
}
function taskDto(env:Env,row:Row):Row{const started=rows(env,'tasks').filter(item=>item.startedAt&&openTask(item)).length;const limit=Number(setting(env,'wipLimit'));return{...row,warnings:started>limit?[`${started} tarefas iniciadas; limite de organização configurado: ${limit}.`]:[]};}
export function createTask(env:Env,input:unknown,_meta:DomainMeta,forcedId?:string):Row{
  const value=parse(taskCreate,input);
  const row=record(env,{title:value.title,description:'',areaId:null,projectId:null,priority:'normal',status:value.areaId?'a_fazer':'entrada',dueDate:null,estimateMinutes:null,reviewDate:null,waitingReason:null,checklist:[],tags:[],startedAt:null,completedAt:null,focusDate:null,seriesId:null,occurrenceKey:null,isException:false,...pick(value,taskFields)},forcedId);
  validateTask(env,row);if(row.status==='em_andamento')row.startedAt=env.context.now;if(row.status==='concluida')row.completedAt=env.context.now;
  return taskDto(env,insert(env,'tasks',row));
}
export const updateTask:Handler=(env,input,meta)=>{
  const value=parse(taskPatch,input),current=get(env,'tasks',value.id);version(current,meta);const changes=pick(value,taskFields),merged={...current,...changes};validateTask(env,merged);
  if(('areaId'in changes||'projectId'in changes)&&rows(env,'calendar_events').some(event=>event.taskId===current.id&&(event.areaId!==merged.areaId||(merged.projectId&&event.projectId&&event.projectId!==merged.projectId))))business('A alteração invalidaria eventos vinculados à tarefa.');
  if(merged.status==='em_andamento'&&!current.startedAt)changes.startedAt=env.context.now;
  if(merged.status==='concluida'&&current.status!=='concluida')changes.completedAt=env.context.now;
  if(merged.status!=='concluida')changes.completedAt=null;if(!openTask(merged))changes.focusDate=null;if(current.seriesId)changes.isException=true;
  return taskDto(env,patch(env,'tasks',current.id,changes));
};
export const setFocus:Handler=(env,input,meta)=>{
  const value=parse(z.object({id:z.string(),selected:z.boolean()}).strict(),input),task=get(env,'tasks',value.id);version(task,meta);
  if(value.selected&&!openTask(task))business('Escolha uma tarefa aberta.');
  if(value.selected&&rows(env,'tasks').filter(row=>row.id!==task.id&&row.focusDate===today(env)&&openTask(row)).length>=3)business('Meu foco permite no máximo três tarefas abertas.');
  return patch(env,'tasks',task.id,{focusDate:value.selected?today(env):null});
};
export const createProject:Handler=(env,input)=>{
  const value=parse(projectCreate,input);area(env,value.areaId);reference(env,'contacts',value.contactId);
  return insert(env,'projects',record(env,{name:value.name,areaId:value.areaId,contactId:value.contactId??null,objective:value.objective,targetDate:value.targetDate??null,status:'ativo'}));
};
export const updateProject:Handler=(env,input,meta)=>{
  const value=parse(projectPatch,input),current=get(env,'projects',value.id);version(current,meta);
  const moving=Boolean(value.areaId&&value.areaId!==current.areaId);
  if((moving||value.status==='arquivado')&&rows(env,'recurrence_series').some(series=>series.active&&(series.payload as Row).projectId===current.id))business('Encerre ou ajuste as séries ativas antes de arquivar ou mudar a frente do projeto.');
  if(value.areaId)area(env,value.areaId);
  if(moving&&['tasks','calendar_events','opportunities','receivables'].some(table=>rows(env,table).some(row=>row.projectId===current.id)))business('Projeto com vínculos não pode mudar de frente.');
  reference(env,'contacts',value.contactId);
  if(['concluido','arquivado'].includes(value.status??'')){
    const pending=rows(env,'tasks').filter(task=>task.projectId===current.id&&openTask(task));
    if(pending.length&&!value.openTaskDecision)business('Escolha como tratar as tarefas abertas.');
    if(value.openTaskDecision==='cancelar')pending.forEach(task=>patch(env,'tasks',task.id,{status:'cancelada',focusDate:null}));
  }
  return patch(env,'projects',current.id,pick(value,['name','areaId','contactId','objective','targetDate','status']));
};
export const templates:Record<string,string[]>={jiu:['Avaliação técnica','Análise de vídeo','Devolutiva','Acompanhamento'],agencia:['Briefing','Início','Plano','Entregas','Relatório'],cursos:['Oferta','Conteúdo','Chamada para WhatsApp','Abertura','Acompanhamento']};
export const applyProjectTemplate:Handler=(env,input,meta)=>{
  const value=parse(z.object({projectId:z.string(),templateKey:z.enum(['jiu','agencia','cursos'])}).strict(),input),project=get(env,'projects',value.projectId);version(project,meta);if(project.status==='arquivado')business('Projeto arquivado.');
  patch(env,'projects',project.id,{});return templates[value.templateKey].map(title=>createTask(env,{title,areaId:project.areaId,projectId:project.id,status:'a_fazer'},meta));
};
export const workHandlers={createTask,updateTask,moveTask:updateTask,setFocus,createProject,updateProject,applyProjectTemplate};
