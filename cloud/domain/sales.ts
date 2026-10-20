import{z}from'zod';
import{Temporal}from'temporal-polyfill';
import{splitInstallments}from'../../src/lib/money';
import{area,business,dateSchema,get,insert,moneySchema,openOpportunity,parse,patch,record,reference,rows,today,version,type Handler,type Row}from'./shared';
import{createProject,applyProjectTemplate}from'./work';
import{linkCustomer}from'./crm';
import{received,validClosure}from'./finance';
export const winOpportunity:Handler=(env,input,meta)=>{
  const value=parse(z.object({id:z.string(),amountCents:moneySchema,closedDate:dateSchema,installmentCount:z.number().int().min(1).max(120).default(1),firstDueDate:dateSchema,installments:z.array(z.object({amountCents:moneySchema,dueDate:dateSchema}).strict()).min(1).max(120).optional(),projectId:z.string().nullable().optional(),createProject:z.boolean().default(false),projectName:z.string().trim().min(1).max(160).optional(),templateKey:z.enum(['jiu','agencia','cursos']).optional()}).strict(),input);
  const opportunity=get(env,'opportunities',value.id);version(opportunity,meta);area(env,opportunity.areaId,true);if(!openOpportunity(opportunity))business('Oportunidade já encerrada.');if(value.closedDate>today(env))business('Fechamento não pode ter data futura.');if(value.createProject&&value.projectId)business('Escolha criar ou vincular um projeto.');
  const installments=value.installments??splitInstallments(value.amountCents,value.installmentCount).map((amountCents,index)=>({amountCents,dueDate:Temporal.PlainDate.from(value.firstDueDate).add({months:index}).toString()}));if(installments.reduce((sum,row)=>sum+row.amountCents,0)!==value.amountCents)business('As parcelas devem somar exatamente o valor acordado.');
  let projectId:unknown=value.projectId??opportunity.projectId??null;
  if(value.createProject){const project=createProject(env,{name:value.projectName??opportunity.offerName,areaId:opportunity.areaId,contactId:opportunity.contactId},meta) as Row;projectId=project.id;if(value.templateKey)applyProjectTemplate(env,{projectId,templateKey:value.templateKey},{...meta,expectedVersion:Number(project.version)});}
  const project=reference(env,'projects',projectId);if(project&&(project.areaId!==opportunity.areaId||project.status==='arquivado'))business('Projeto incompatível com a frente da venda.');
  const closureId=env.context.uuid(),closeVersion=Number(opportunity.closeVersion)+1;
  insert(env,'deal_closures',{id:closureId,opportunityId:opportunity.id,closeVersion,amountCents:value.amountCents,closedDate:value.closedDate,projectId,reversedAt:null,createdAt:env.context.now});
  const receivableIds=installments.map((part,index)=>insert(env,'receivables',record(env,{areaId:opportunity.areaId,description:`${opportunity.offerName} · ${index+1}/${installments.length}`,contactId:opportunity.contactId,projectId,opportunityId:opportunity.id,closureId,amountCents:part.amountCents,dueDate:part.dueDate,cancelledAt:null,seriesId:null,occurrenceKey:null,isException:false})).id);
  linkCustomer(env,opportunity.contactId,opportunity.areaId);const updated=patch(env,'opportunities',opportunity.id,{stage:'ganho',closedAt:value.closedDate,closeVersion,projectId,nextAction:null,nextActionDate:null});return{opportunity:updated,closureId,projectId,receivableIds};
};
export const reopenOpportunity:Handler=(env,input,meta)=>{const value=parse(z.object({id:z.string()}).strict(),input),opportunity=get(env,'opportunities',value.id);version(opportunity,meta);if(openOpportunity(opportunity))business('A oportunidade já está aberta.');if(opportunity.stage==='ganho'){const closure=validClosure(env,opportunity.id);if(!closure)business('Fechamento válido não encontrado.');const receivables=rows(env,'receivables').filter(row=>row.closureId===closure.id);if(receivables.some(row=>received(env,row.id)>0))business('Reabertura exige recebimento líquido zero em cada parcela.');closure.reversedAt=env.context.now;receivables.forEach(row=>patch(env,'receivables',row.id,{cancelledAt:env.context.now}));}return patch(env,'opportunities',opportunity.id,{stage:'conversando',closedAt:null,lossReason:null,lossNote:null});};
export const salesHandlers={winOpportunity,reopenOpportunity};
