export function csvCell(value:unknown):string {
  let text=value==null?'':typeof value==='object'?JSON.stringify(value):String(value);
  if(/^[\s]*[=+\-@]|^[\t\r]/.test(text))text=`'${text}`;
  return `"${text.replaceAll('"','""')}"`;
}
export function csvRows(rows:Record<string,unknown>[]):string {
  if(!rows.length)return '\uFEFF';
  const keys=Object.keys(rows[0]);
  return '\uFEFF'+[keys.map(csvCell).join(';'),...rows.map(row=>keys.map(key=>csvCell(row[key])).join(';'))].join('\r\n');
}
