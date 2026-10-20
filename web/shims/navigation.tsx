import { useMemo } from 'react';
import { navigate, useRoute } from '../router';
const router = { push: (href: string) => navigate(href), replace: (href: string) => navigate(href, true), back: () => window.history.back(), forward: () => window.history.forward(), refresh: () => window.location.reload(), prefetch: async () => {} };
export function usePathname() { return useRoute().split('?')[0]; }
export function useSearchParams() { const route = useRoute(); return useMemo(() => new URLSearchParams(route.split('?')[1] ?? ''), [route]); }
export function useRouter() { return router; }
export function useParams() { const path = usePathname().split('/').filter(Boolean); return path.length > 1 ? { id: decodeURIComponent(path[1]) } : {}; }
