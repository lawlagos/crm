import{expect,test}from'vitest';
import{taskProgress,setChecklistItem}from'./task-progress';
const checklist=Array.from({length:10},(_,index)=>({id:`step-${index}`,text:`Etapa ${index+1}`,done:false}));
test('each checked item advances one tenth without deriving progress from the task status',()=>{
  expect(taskProgress({status:'a_fazer',checklist})).toMatchObject({completed:0,total:10,percent:0,pending:10});
  const updated=setChecklistItem(checklist,'step-0',true);
  expect(taskProgress({status:'a_fazer',checklist:updated})).toMatchObject({completed:1,total:10,percent:10,pending:9});
  expect(taskProgress({status:'concluida',checklist:updated})).toMatchObject({completed:1,total:10,percent:10,pending:9});
});
test('a task without checklist uses manual completion as its single step',()=>{
  expect(taskProgress({status:'entrada',checklist:[]})).toMatchObject({completed:0,total:1,percent:0,hasChecklist:false});
  expect(taskProgress({status:'concluida'})).toMatchObject({completed:1,total:1,percent:100});
  expect(taskProgress({status:'a_fazer',checklist:[]})).toMatchObject({completed:0,total:1,percent:0});
});
test('the last item and a manual reopening leave the real checked items intact',()=>{
  const done=checklist.map(item=>({...item,done:true}));
  expect(taskProgress({status:'a_fazer',checklist:done})).toMatchObject({completed:10,total:10,percent:100});
  expect(taskProgress({status:'concluida',checklist:done})).toMatchObject({completed:10,total:10,percent:100});
});
test('retrying one intended item on the latest checklist keeps concurrent changes and never restores a removed item',()=>{
  const latest=[{...checklist[0],text:'Texto atualizado'},{...checklist[1],done:true}];
  const result=setChecklistItem(latest,'step-0',true);
  expect(result).toEqual([{id:'step-0',text:'Texto atualizado',done:true},{...checklist[1],done:true}]);
  expect(latest[0].done).toBe(false);expect(result).not.toBe(latest);
  expect(()=>setChecklistItem(latest,'removed',true)).toThrow(/item|checklist/i);
});
