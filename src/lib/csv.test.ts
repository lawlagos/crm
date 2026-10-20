import { expect,test } from 'vitest';
import { csvCell } from './csv';
test('CSV escapes quotes and neutralizes spreadsheet formulas including whitespace prefixes',()=>{
 expect(csvCell('a;"b\nc')).toBe('"a;""b\nc"');
 for(const value of ['=1+1','+SUM(A1)','-1+1','@foo','\tbad','\rbad','  =2']) expect(csvCell(value)).toMatch(/^"'/);
 expect(csvCell('ação')).toBe('"ação"');
});
