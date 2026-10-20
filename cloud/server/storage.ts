import { CloudError, type CloudState } from './core';
export type SheetSnapshot = {sheets:Record<string,{id:number;rowCount:number;values:unknown[][]}>};
type CellsRequest = Record<string,unknown>;
function tableRows(values: unknown[][]) {
  if (values[0]?.[0] !== 'id' || values[0]?.[1] !== 'json') throw new CloudError('CORRUPT_DATA','Cabeçalho da planilha inválido. Restaure o backup antes de continuar.',500);
  return values.slice(1).flatMap((cells,index)=>{
    if (!cells[0] && !cells[1]) return [];
    const id=String(cells[0] ?? '');
    let row;
    try { row=JSON.parse(String(cells[1])); } catch { throw new CloudError('CORRUPT_DATA','Registro inválido na planilha. Nenhuma alteração foi salva.',500); }
    if (!id || !row || row.id !== id) throw new CloudError('CORRUPT_DATA','Identidade inválida na planilha.',500);
    return [{id,row,index:index+1}];
  });
}
export function decodeState(snapshot: SheetSnapshot): CloudState {
  const tables:CloudState['tables']={};
  for (const [name,sheet] of Object.entries(snapshot.sheets)) {
    const rows=tableRows(sheet.values);
    if (new Set(rows.map(item=>item.id)).size!==rows.length) throw new CloudError('CORRUPT_DATA','Registro duplicado na planilha.',500);
    tables[name]=rows.map(item=>item.row);
  }
  return {tables};
}
function cells(id:string,json:string) {
  if (json.length>49000 || id.length>1000) throw new CloudError('VALIDATION','O registro excede o limite da planilha. Reduza o conteúdo e tente novamente.');
  return [{userEnteredValue:{stringValue:id}},{userEnteredValue:{stringValue:json}}];
}
export function commitState(snapshot:SheetSnapshot,before:CloudState,after:CloudState,batch:(requests:CellsRequest[])=>void): void {
  const requests:CellsRequest[]=[];
  for (const [name,rows] of Object.entries(after.tables)) {
    const sheet=snapshot.sheets[name];
    if (!sheet) throw new CloudError('NOT_CONFIGURED','Atualize a estrutura da planilha antes de continuar.',503);
    const positions=new Map(tableRows(sheet.values).map(item=>[item.id,item.index]));
    const old=new Map((before.tables[name] ?? []).map(row=>[String(row.id),JSON.stringify(row)]));
    const next=new Set<string>(); let end=sheet.values.length;
    const updates:CellsRequest[]=[];
    for (const row of rows) {
      const id=String(row.id ?? '');
      if (!id || next.has(id)) throw new CloudError('CORRUPT_DATA','Identidade duplicada ou ausente. Nenhuma alteração foi salva.',500);
      next.add(id); const json=JSON.stringify(row);
      if (old.get(id)===json) continue;
      const index=positions.get(id) ?? end++;
      updates.push({updateCells:{start:{sheetId:sheet.id,rowIndex:index,columnIndex:0},rows:[{values:cells(id,json)}],fields:'userEnteredValue'}});
    }
    for (const [id,index] of positions) if (!next.has(id)) updates.push({updateCells:{range:{sheetId:sheet.id,startRowIndex:index,endRowIndex:index+1,startColumnIndex:0,endColumnIndex:2},fields:'userEnteredValue'}});
    if (end>sheet.rowCount) requests.push({appendDimension:{sheetId:sheet.id,dimension:'ROWS',length:end-sheet.rowCount}});
    requests.push(...updates);
  }
  if (Object.keys(before.tables).some(name=>!(name in after.tables))) throw new CloudError('CORRUPT_DATA','A operação não pode remover uma tabela.',500);
  // One Sheets batch: entity changes and the mutation receipt succeed or fail together.
  if (requests.length) batch(requests);
}
