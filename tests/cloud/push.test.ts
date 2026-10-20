import { createPublicKey, verify } from 'node:crypto';
import { expect, it } from 'vitest';
import { pushEndpointOrigin, vapidAuthorization, vapidPublicKey } from '../../cloud/server/push';
const privateKey='1'.padStart(64,'0');
it('signs a valid ES256 VAPID JWT with the exact push service audience', () => {
  const endpoint='https://fcm.googleapis.com/fcm/send/example';
  const authorization=vapidAuthorization(endpoint,privateKey,'2026-10-20T15:00:00Z');
  const jwt=authorization.match(/t=([^,]+)/)![1], [header,payload,signature]=jwt.split('.');
  const publicBytes=Buffer.from(vapidPublicKey(privateKey),'base64url');
  const key=createPublicKey({key:{kty:'EC',crv:'P-256',x:publicBytes.subarray(1,33).toString('base64url'),y:publicBytes.subarray(33).toString('base64url')},format:'jwk'});
  expect(verify('sha256',Buffer.from(header+'.'+payload),{key,dsaEncoding:'ieee-p1363'},Buffer.from(signature,'base64url'))).toBe(true);
  expect(JSON.parse(Buffer.from(payload,'base64url').toString())).toMatchObject({aud:'https://fcm.googleapis.com',sub:'mailto:lawlagos@gmail.com'});
});
it.each(['http://fcm.googleapis.com/x','https://attacker.example/x','https://fcm.googleapis.com.attacker.example/x','https://fcm.googleapis.com@attacker.example/x','https://fcm.googleapis.com:8443/x','https://127.0.0.1/x'])('rejects a non-push destination %s', endpoint=>{
  expect(()=>pushEndpointOrigin(endpoint)).toThrow();
});
