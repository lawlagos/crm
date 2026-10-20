export type ChecklistItem={id:string;text:string;done:boolean};
export type TaskProgressValue={completed:number;total:number;percent:number;pending:number;hasChecklist:boolean};
export function taskProgress(task:{status:string;checklist?:readonly Pick<ChecklistItem,'done'>[]}):TaskProgressValue{
  const items=task.checklist??[],hasChecklist=items.length>0,total=items.length||1,completed=hasChecklist?items.filter(item=>item.done).length:task.status==='concluida'?1:0;
  return{completed,total,percent:Math.round(completed/total*100),pending:total-completed,hasChecklist};
}
export function setChecklistItem<T extends ChecklistItem>(items:readonly T[],id:string,done:boolean):T[]{
  if(items.filter(item=>item.id===id).length!==1)throw new Error('Este item não está mais disponível. Confira o checklist atualizado.');
  return items.map(item=>item.id===id?{...item,done}:item);
}
