import { StrictMode, lazy, Suspense, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/source-sans-3/latin-400.css';
import '@fontsource/source-sans-3/latin-600.css';
import '../src/app/globals.css';
import './styles.css';
import { configureApiTransport } from '../src/lib/query-client';
import { LoadingState } from '../src/components/ui/primitives';
import { cloudFetch, getSession, subscribeAuth } from './transport';
import { Providers } from '../src/components/layout/providers';
import { AuthGate } from './auth';
import { installHistoryBridge } from './router';
const PrivateApp = lazy(() => import('./private-app'));
configureApiTransport(cloudFetch, 'cloud'); installHistoryBridge();
function CloudApp() {
  const session = useSyncExternalStore(subscribeAuth, getSession, () => null);
  return <Providers taskMovesEnabled={!!session}><AuthGate><Suspense fallback={<LoadingState />}><PrivateApp /></Suspense></AuthGate></Providers>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><CloudApp /></StrictMode>);
