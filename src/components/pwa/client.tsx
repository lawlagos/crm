'use client';
import { useEffect,useRef,useState,useSyncExternalStore } from 'react';
import { Download,RefreshCw } from 'lucide-react';
import { Button,Modal } from '@/components/ui/primitives';
import { isCloudMode } from "@/lib/query-client";
import { useDraft } from '@/components/layout/providers';
type InstallEvent=Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
function subscribeDisplayMode(callback:()=>void){const media=matchMedia('(display-mode: standalone)');media.addEventListener('change',callback);return()=>media.removeEventListener('change',callback);}
const iosSnapshot=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)&&!matchMedia('(display-mode: standalone)').matches;
const serverSnapshot=()=>false;
export function PwaClient(){
 const [install,setInstall]=useState<InstallEvent|null>(null);
 const [waiting,setWaiting]=useState<ServiceWorkerRegistration|null>(null);
 const [instructions,setInstructions]=useState(false);
 const ios=useSyncExternalStore(subscribeDisplayMode,iosSnapshot,serverSnapshot);const reload=useRef(false);const {guard}=useDraft();
 useEffect(()=>{
  const capture=(event:Event)=>{event.preventDefault();setInstall(event as InstallEvent);};
  window.addEventListener('beforeinstallprompt',capture);
  const activate=()=>{if(reload.current)window.location.reload();};
  if('serviceWorker' in navigator&&process.env.NODE_ENV==='production'){
   navigator.serviceWorker.addEventListener('controllerchange',activate);
   navigator.serviceWorker.register(isCloudMode() ? (window.CENTRAL_CONFIG?.basePath ?? '/crm/') + 'sw.js' : '/sw.js', isCloudMode() ? { scope: window.CENTRAL_CONFIG?.basePath ?? '/crm/' } : undefined).then(registration=>{
    if(registration.waiting)setWaiting(registration);
    registration.addEventListener('updatefound',()=>{
     const worker=registration.installing;
     worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)setWaiting(registration);});
    });
   }).catch(()=>{/* App remains usable online if this platform does not support installation. */});
  }
  return()=>{window.removeEventListener('beforeinstallprompt',capture);navigator.serviceWorker?.removeEventListener('controllerchange',activate);};
 },[]);
 if(!install&&!ios&&!waiting)return null;
 return <><div className="pwa-actions" aria-label="Instalação e atualização"><span>{waiting?'Uma atualização está pronta.':'Sua Central também pode ter um lugar na tela inicial.'}</span>{waiting?<Button variant="outline" onClick={()=>guard(()=>{reload.current=true;waiting.waiting?.postMessage('ACTIVATE_UPDATE');})}><RefreshCw size={16}/>Atualizar Central</Button>:<Button variant="outline" onClick={async()=>{if(install){await install.prompt();const choice=await install.userChoice;if(choice.outcome==='accepted')setInstall(null);}else setInstructions(true);}}><Download size={16}/>Instalar Central</Button>}</div><Modal open={instructions} onOpenChange={setInstructions} title="Central no iPhone" description={isCloudMode() ? "Abra esta Central no Safari." : "Use o Safari na mesma rede do computador."}><div className="form-body"><p>Abra o menu Compartilhar e escolha Adicionar à Tela de Início.</p><p>{isCloudMode() ? "Entre com sua conta autorizada. O acesso aos registros precisa de conexão com a internet." : "O endereço precisa usar HTTPS confiável no aparelho. O computador permanece ligado para acessar os mesmos dados."}</p></div><div className="dialog-actions"><Button onClick={()=>setInstructions(false)}>Entendi</Button></div></Modal></>;
}

