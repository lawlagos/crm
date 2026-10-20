import vm from 'node:vm';
import { expect, it } from 'vitest';
import { appsScriptCompatible } from '../../scripts/apps-script-compat.mjs';
it('rewrites bigint syntax for Apps Script without changing values or strings',()=>{
  const source='var value=9007199254740993000n+0xffn; var label="10n";';
  const result=appsScriptCompatible(source);
  expect(result).not.toMatch(/\b9007199254740993000n/);
  const sandbox=vm.createContext({}); vm.runInContext(result,sandbox);
  expect(sandbox.value).toBe(BigInt('9007199254740993255')); expect(sandbox.label).toBe('10n');
});
