import { expect, test } from 'vitest';
import { assertTrustedRequest, readJsonBody } from '@/lib/http-security';
const url = 'http://127.0.0.1:3000/api/commands';
function request(headers: Record<string,string>, body = '{}') { return new Request(url, { method: 'POST', headers, body }); }
test('rejects wrong host, absent origin, external origin and non-JSON writes', () => {
  expect(() => assertTrustedRequest(request({host:'evil.example',origin:'http://127.0.0.1:3000','content-type':'application/json'}))).toThrow();
  expect(() => assertTrustedRequest(request({host:'127.0.0.1:3000','content-type':'application/json'}))).toThrow();
  expect(() => assertTrustedRequest(request({host:'127.0.0.1:3000',origin:'https://evil.example','content-type':'application/json'}))).toThrow();
  expect(() => assertTrustedRequest(request({host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000','content-type':'text/plain'}))).toThrow();
  expect(() => assertTrustedRequest(request({host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000','content-type':'application/json'}))).not.toThrow();
});
test('limits streamed bodies even without content-length', async () => {
  const req = request({host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000','content-type':'application/json'}, JSON.stringify({text:'x'.repeat(270000)}));
  await expect(readJsonBody(req)).rejects.toThrow(/grande/i);
});
