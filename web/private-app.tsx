import { Component, lazy, Suspense, useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDraft } from '../src/components/layout/providers';
import { AppShell } from '../src/components/layout/app-shell';
import { OverviewPage } from '../src/components/data/overview';
import { TasksPage } from '../src/components/data/task-list';
import { ProjectsPage } from '../src/components/data/project-list';
import { RecordDetail } from '../src/components/data/record-detail';
import { ContactsPage, ContactDetail } from '../src/components/data/contacts';
import { CommercialPage, OpportunityDetail } from '../src/components/data/commercial';
import { FinancePage, ReceivableDetail } from '../src/components/data/finance';
const CalendarPage = lazy(() => import("../src/components/data/calendar").then(module => ({ default: module.CalendarPage })));
import { ReviewPage } from '../src/components/data/review';
import { SettingsPage } from '../src/components/data/settings';
import { EmptyState, ErrorState, LoadingState } from '../src/components/ui/primitives';


import { AccountBar } from './auth';
import { Notifications } from './notifications';
import { registerDraftGuard, useRoute } from './router';
import Link from './shims/link';


function RouterDraftGuard() { const { dirty, guard } = useDraft(); useEffect(() => registerDraftGuard(dirty ? guard : null), [dirty, guard]); return null; }
function Routes() {
  const path = useRoute().split('?')[0].replace(/\/$/, '') || '/'; const parts = path.split('/').filter(Boolean); const id = parts[1] ? decodeURIComponent(parts[1]) : '';
  if (parts.length > 2) return <MissingRoute />;
  if (id) { if (parts[0] === 'tarefas') return <RecordDetail key={path} kind="task" id={id} />; if (parts[0] === 'projetos') return <RecordDetail key={path} kind="project" id={id} />; if (parts[0] === 'contatos') return <ContactDetail key={path} id={id} />; if (parts[0] === 'comercial') return <OpportunityDetail key={path} id={id} />; if (parts[0] === 'financeiro') return <ReceivableDetail key={path} id={id} />; return <MissingRoute />; }
  switch (path) { case '/': return <OverviewPage />; case '/tarefas': return <TasksPage />; case '/projetos': return <ProjectsPage />; case '/contatos': return <ContactsPage />; case '/comercial': return <CommercialPage />; case '/financeiro': return <FinancePage />; case '/agenda': return <CalendarPage />; case '/revisao': return <ReviewPage />; case '/configuracoes': return <><SettingsPage /><Notifications /></>; default: return <MissingRoute />; }
}
function MissingRoute() { return <EmptyState title="Esta página não foi encontrada" description="Volte ao seu espaço de trabalho para continuar." action={<Link href="/" className="button button-primary">Voltar para Hoje</Link>} />; }
class RouteBoundary extends Component<{ children: ReactNode }, { failed: boolean }> { state = { failed: false }; static getDerivedStateFromError() { return { failed: true }; } render() { return this.state.failed ? <ErrorState message="A tela não pôde ser carregada. Os registros salvos permanecem no seu espaço privado." retry={() => this.setState({ failed: false })} /> : this.props.children; } }
function ClearSessionCache() { const client = useQueryClient(); useEffect(() => () => { void client.cancelQueries(); client.clear(); }, [client]); return null; }
export default function PrivateApp() { const path = useRoute().split("?")[0]; return <><ClearSessionCache /><RouterDraftGuard /><AppShell sessionControls={<AccountBar />}><RouteBoundary key={path}><Suspense fallback={<LoadingState />}><Routes /></Suspense></RouteBoundary></AppShell></>; }


