import { expect,test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
test('production service worker stores static assets only and recovers after losing the server',async({page,context,request})=>{
 await request.post('/api/commands',{headers:{origin:'http://127.0.0.1:3200'},data:{command:'createContact',input:{name:'Cliente privado do teste offline'},meta:{operationId:randomUUID()}}});
 await page.goto('/contatos');await expect(page.getByText('Cliente privado do teste offline')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
 const paths=await page.evaluate(async()=>{const result:string[]=[];for(const key of await caches.keys()){const cache=await caches.open(key);result.push(...(await cache.keys()).map(request=>new URL(request.url).pathname));}return result;});
 expect(paths.sort()).toEqual(['/apple-touch-icon.png','/icon-192.png','/icon-512.png','/offline.html']);
 await context.setOffline(true);await page.goto('/contatos');
 await expect(page.getByText('Cliente privado do teste offline')).not.toBeVisible();
 await expect(page.getByRole('heading')).toContainText('computador precisa');
 const write=await page.evaluate(async()=>{try{await fetch('/api/commands',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});return 'sent';}catch{return 'unavailable';}});
 expect(write).toBe('unavailable');
 await context.setOffline(false);await page.goto('/contatos');await expect(page.getByText('Cliente privado do teste offline')).toBeVisible();
});
