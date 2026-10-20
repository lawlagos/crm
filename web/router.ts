import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
let installed = false;
let previous = '/';
let guard: ((action: () => void) => void) | null = null;
const originalPush = (...args: Parameters<History['pushState']>) => History.prototype.pushState.apply(window.history, args);
const originalReplace = (...args: Parameters<History['replaceState']>) => History.prototype.replaceState.apply(window.history, args);
export function basePath() { return typeof window !== 'undefined' ? (window.CENTRAL_CONFIG?.basePath ?? '/crm/').replace(/\/?$/, '/') : '/crm/'; }
export function currentRoute() { const hash = window.location.hash.slice(1); return hash.startsWith('/') ? hash : '/'; }
export function hrefFor(href: string) { if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href)) return href; if (href.startsWith('/api/')) return href; return `${basePath()}#${href.startsWith('/') ? href : `/${href}`}`; }
function emit() { previous = currentRoute(); listeners.forEach(listener => listener()); }
function adaptUrl(url?: string | URL | null) { if (typeof url === 'string' && url.startsWith('/') && !url.startsWith(basePath()) && !url.startsWith('/api/')) return hrefFor(url); return url; }
export function installHistoryBridge() {
  if (installed) return; installed = true; previous = currentRoute();
  window.history.pushState = (data, unused, url) => { originalPush(data, unused, adaptUrl(url)); emit(); };
  window.history.replaceState = (data, unused, url) => { originalReplace(data, unused, adaptUrl(url)); emit(); };
  const changed = () => { const destination = currentRoute(); if (destination === previous) return; if (guard) { originalReplace(null, '', hrefFor(previous)); guard(() => { originalPush(null, '', hrefFor(destination)); emit(); }); } else emit(); };
  window.addEventListener('hashchange', changed); window.addEventListener('popstate', changed);
}
export function navigate(href: string, replace = false) { const destination = hrefFor(href); if (/^[a-z][a-z\d+.-]*:/i.test(destination)) { window.location.assign(destination); return; } (replace ? window.history.replaceState : window.history.pushState).call(window.history, null, '', destination); window.scrollTo({ top: 0 }); }
export function registerDraftGuard(next: typeof guard) { guard = next; return () => { if (guard === next) guard = null; }; }
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
export const useRoute = () => useSyncExternalStore(subscribe, currentRoute, () => '/');
