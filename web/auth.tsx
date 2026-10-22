import { scheduleSessionExpiry } from "./session-expiry";
import { useOnlineState } from "../src/lib/query-client";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, FolderOpen, ListTodo, LoaderCircle, LockKeyhole, LogOut, ShieldCheck, WifiOff } from 'lucide-react';
import { Button } from '../src/components/ui/primitives';
import { useTaskMoveQueue } from "../src/components/data/task-move-queue";
import { useDraft } from '../src/components/layout/providers';
import { clearExpiredSession, getSession, login, logout, subscribeAuth } from './transport';

const ALLOWED_EMAIL = 'lawlagos@gmail.com';
export const useOnline = useOnlineState;
const noSession = () => null;
export function AuthGate({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(subscribeAuth, getSession, noSession);
  useEffect(() => { if (!session) return; return scheduleSessionExpiry(session.expiresAt, clearExpiredSession); }, [session]);
  return session?.email === ALLOWED_EMAIL ? children : <LoginScreen />;
}
function LoginScreen() {
  const button = useRef<HTMLDivElement>(null); const [ready, setReady] = useState(!!window.google?.accounts.id); const [pending, setPending] = useState(false); const [error, setError] = useState(''); const [attempt, setAttempt] = useState(0); const busy = useRef(false); const online = useOnline();
  const configured = !!window.CENTRAL_CONFIG?.googleClientId && !!window.CENTRAL_CONFIG?.apiUrl;
  useEffect(() => {
    if (!configured || !online || ready) return;
    let script = document.querySelector<HTMLScriptElement>('script[data-central-google]');
    if (attempt && script && !window.google) { script.remove(); script = null; }
    const loaded = () => setReady(true); const failed = () => setError('Não foi possível carregar o acesso Google. Confira a conexão e tente novamente.');
    if (!script) { script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client?hl=pt-BR'; script.async = true; script.defer = true; script.dataset.centralGoogle = 'true'; document.head.append(script); }
    script.addEventListener('load', loaded); script.addEventListener('error', failed);
    return () => { script?.removeEventListener('load', loaded); script?.removeEventListener('error', failed); };
  }, [configured, online, ready, attempt]);
  useEffect(() => {
    if (!ready || !configured || !online || !button.current || !window.google) return;
    window.google.accounts.id.initialize({ client_id: window.CENTRAL_CONFIG!.googleClientId, auto_select: false, callback: async ({ credential }) => {
      if (busy.current) return; busy.current = true; setPending(true); setError('');
      try { const session = await login(credential); if (session.email !== ALLOWED_EMAIL) { await logout(); setError('Use a conta autorizada para acessar esta Central.'); } }
      catch (caught) { setError((caught as Error).message || 'Não foi possível confirmar seu acesso. Tente novamente.'); }
      finally { busy.current = false; setPending(false); }
    } });
    window.google.accounts.id.renderButton(button.current, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', width: Math.min(320, button.current.clientWidth || 320), locale: 'pt-BR' });
  }, [ready, configured, online]);
  return <main className="auth-page"><div className="auth-frame"><section className="auth-intro"><div className="auth-brand"><span className="brand-mark"><span /><span /><span /><span /></span><span>Central</span></div><div><span className="auth-eyebrow">Uma frente de cada vez.</span><h1>Seu trabalho,<br />com direção.</h1><p>Projetos, compromissos e próximos passos reunidos no seu espaço pessoal.</p></div><div className="auth-capabilities"><span><ListTodo size={19} />Próximos passos</span><span><FolderOpen size={19} />Projetos e entregas</span><span><CalendarDays size={19} />Agenda e negócios</span></div></section><section className="auth-panel" aria-label="Acesso à Central"><span className="auth-lock"><LockKeyhole size={24} strokeWidth={1.6} /></span><h2>Entre na sua Central</h2><p>Continue com sua conta Google para abrir seu espaço de trabalho.</p><div className="authorized-account"><ShieldCheck size={18} /><div><span>Acesso pessoal e restrito</span><strong>{ALLOWED_EMAIL}</strong></div></div><div className="auth-login-action" aria-busy={pending}>{!configured ? <div className="auth-message" role="status">A conexão da Central ainda não foi configurada.</div> : !online ? <div className="auth-message" role="status"><WifiOff size={19} />Conecte-se à internet para entrar.</div> : <><div ref={button} className={`google-button ${pending ? 'google-button-busy' : ''}`} inert={pending} />{(!ready || pending) && <div className="auth-pending" role="status"><LoaderCircle size={18} className="spin" />{pending ? 'Confirmando seu acesso…' : 'Preparando acesso seguro…'}</div>}</>}{error && <div className="auth-error" role="alert"><p>{error}</p><Button variant="outline" onClick={() => { setError(''); setAttempt(current => current + 1); }}>Tentar novamente</Button></div>}</div><p className="auth-privacy">Seus registros são privados. A página pública mostra somente esta entrada até seu acesso ser confirmado.</p></section></div><footer className="auth-footer"><span>Central · Seu trabalho, conectado.</span><span>Horário de São Paulo</span></footer></main>;
}
export function AccountBar() {
  const { jobs } = useTaskMoveQueue(); const queued = jobs.some(job => job.state !== "saved");
  const session = useSyncExternalStore(subscribeAuth, getSession, noSession); const online = useOnline(); const { guard } = useDraft(); const client = useQueryClient(); const [pending, setPending] = useState(false); const [error, setError] = useState('');
  return <div className="cloud-account-bar"><span className={`cloud-network ${online ? '' : 'cloud-network-offline'}`}>{online ? <ShieldCheck size={15} /> : <WifiOff size={15} />}{online ? 'Espaço privado' : 'Sem conexão · gravações indisponíveis'}</span><span className="cloud-email">{session?.email}</span><button className="cloud-signout" title={queued ? "Resolva os movimentos na fila antes de sair" : undefined} disabled={pending || queued} onClick={() => guard(() => { setPending(true); setError(''); void logout().then(async () => { await client.cancelQueries(); client.clear(); window.google?.accounts.id.disableAutoSelect(); }).catch(() => { setError('Não foi possível confirmar a saída. Tente novamente.'); }).finally(() => setPending(false)); })}><LogOut size={15} />{pending ? 'Saindo…' : 'Sair'}</button>{error && <span className="error-text" role="alert">{error}</span>}</div>;
}




