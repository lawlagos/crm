import { p256 } from '@noble/curves/nist.js';
import { CloudError } from './core';

const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function base64url(bytes:Uint8Array) {
  let out='';
  for (let i=0;i<bytes.length;i+=3) {
    const bits=(bytes[i]<<16)|((bytes[i+1]??0)<<8)|(bytes[i+2]??0);
    out+=alphabet[(bits>>>18)&63]+alphabet[(bits>>>12)&63];
    if (i+1<bytes.length) out+=alphabet[(bits>>>6)&63];
    if (i+2<bytes.length) out+=alphabet[bits&63];
  }
  return out;
}
function ascii(text:string) { return Uint8Array.from(text, char=>char.charCodeAt(0)); }
function secret(value:string) {
  if (!/^[0-9a-f]{64}$/i.test(value)) throw new CloudError('NOT_CONFIGURED','As notificações ainda não foram configuradas.',503);
  return Uint8Array.from(value.match(/../g)!, hex=>parseInt(hex,16));
}
export function pushEndpointOrigin(endpoint:string):string {
  const match=/^https:\/\/([a-z0-9.-]+)(\/[^\s#]*)$/i.exec(endpoint);
  const host=match?.[1].toLowerCase();
  if (!host || endpoint.length>4096 || !(host==='fcm.googleapis.com' || host==='updates.push.services.mozilla.com' || /^[a-z0-9-]+\.push\.apple\.com$/.test(host) || /^[a-z0-9-]+\.notify\.windows\.com$/.test(host))) {
    throw new CloudError('VALIDATION','O endereço de notificação deste aparelho não é válido.');
  }
  return 'https://'+host;
}
export function vapidPublicKey(privateKey:string) { return base64url(p256.getPublicKey(secret(privateKey),false)); }
export function vapidAuthorization(endpoint:string,privateKey:string,now:string) {
  const header=base64url(ascii(JSON.stringify({typ:'JWT',alg:'ES256'})));
  const payload=base64url(ascii(JSON.stringify({aud:pushEndpointOrigin(endpoint),exp:Math.floor(Date.parse(now)/1000)+43200,sub:'mailto:lawlagos@gmail.com'})));
  const message=header+'.'+payload;
  const signature=p256.sign(ascii(message),secret(privateKey),{prehash:true,extraEntropy:false});
  return 'vapid t='+message+'.'+base64url(signature)+', k='+vapidPublicKey(privateKey);
}
