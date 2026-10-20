import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, BellOff, Send } from 'lucide-react';
import { request } from '../src/lib/query-client';
import { Button, useToast } from '../src/components/ui/primitives';
import { basePath } from './router';
import { useOnline } from './auth';
type NotificationState = { enabled: boolean; publicKey: string | null; subscriptionId?: string };
function serverKey(value: string) { const decoded = atob(value.replace(/-/g, '+').replace(/_/g, '/')); const bytes = new Uint8Array(decoded.length); for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i); return bytes; }
export function Notifications() {
  const supported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && window.isSecureContext;
  const query = useQuery({ queryKey: ['notifications'], queryFn: ({ signal }) => request<NotificationState>('/api/notifications', { signal }) }); const [subscription, setSubscription] = useState<PushSubscription | null>(null); const [pending, setPending] = useState(false); const [error, setError] = useState(''); const online = useOnline(); const toast = useToast();
  useEffect(() => { if (!supported) return; let current = true; void navigator.serviceWorker.getRegistration(basePath()).then(registration => registration?.pushManager.getSubscription()).then(value => { if (current) setSubscription(value ?? null); }).catch(() => {}); return () => { current = false; }; }, [supported]);
  const enabled = !!subscription && !!query.data?.enabled;
  async function activate() {
    setPending(true); setError('');
    try {
      const permission = await Notification.requestPermission(); if (permission !== 'granted') throw new Error('A permissão não foi concedida. Você pode ajustar as notificações nas configurações deste navegador.');
      await navigator.serviceWorker.register(`${basePath()}sw.js`, { scope: basePath() }); const registration = await navigator.serviceWorker.ready;
      const next = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: serverKey(query.data!.publicKey!) });
      await request('/api/notifications', { method: 'POST', body: JSON.stringify({ action: 'subscribe', subscription: next.toJSON() }) }); setSubscription(next); await query.refetch(); toast('Notificações ativadas neste aparelho.');
    } catch (caught) { setError((caught as Error).message); } finally { setPending(false); }
  }
  async function deactivate() { setPending(true); setError(''); try { await request('/api/notifications', { method: 'POST', body: JSON.stringify({ action: 'unsubscribe', endpoint: subscription?.endpoint }) }); await subscription?.unsubscribe(); setSubscription(null); await query.refetch(); toast('Notificações desativadas neste aparelho.'); } catch (caught) { setError((caught as Error).message); } finally { setPending(false); } }
  async function test() { setPending(true); setError(''); try { await request('/api/notifications', { method: 'POST', body: JSON.stringify({ action: 'test', endpoint: subscription?.endpoint }) }); toast('Teste solicitado. Confira as notificações deste aparelho.'); } catch (caught) { setError((caught as Error).message); } finally { setPending(false); } }
  return <><div className="section-heading"><div><span className="eyebrow">Você escolhe onde receber</span><h2>Notificações neste aparelho</h2></div></div><section className="panel detail-panel notification-settings"><div className="notification-intro"><span className="empty-icon">{enabled ? <Bell size={23} /> : <BellOff size={23} />}</span><div><h3>{enabled ? 'Ativadas neste aparelho' : 'Um lembrete para voltar à Central'}</h3><p>As notificações usam somente texto genérico. Nomes, valores e conteúdo dos seus registros não aparecem na tela bloqueada.</p></div></div>{!supported ? <p className="module-note">Este navegador não oferece notificações para esta página. No iPhone, instale a Central na tela inicial e abra por lá.</p> : query.isError ? <div className="inline-error" role="alert"><p>Não foi possível consultar as notificações.</p><Button variant="outline" onClick={() => query.refetch()}>Tentar novamente</Button></div> : <><p className="muted small-note">{!query.data?.publicKey && !query.isPending ? 'As notificações ainda não estão configuradas no serviço.' : 'A ativação vale somente para este aparelho e precisa da sua permissão.'}</p><div className="heading-actions">{enabled ? <><Button variant="outline" busy={pending} disabled={!online} onClick={test}><Send size={16} />Enviar teste para este aparelho</Button><Button variant="ghost" disabled={pending || !online} onClick={deactivate}>Desativar neste aparelho</Button></> : <Button variant="outline" busy={pending} disabled={!online || !query.data?.publicKey} onClick={activate}><Bell size={17} />Ativar neste aparelho</Button>}</div></>}{!online && <p className="muted small-note">Conecte-se à internet para alterar ou testar as notificações.</p>}{error && <div className="inline-error" role="alert">{error}</div>}</section></>;
}
