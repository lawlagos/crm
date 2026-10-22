"use client";

import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, useSyncExternalStore } from "react";

let apiTransport: ((url: string, options?: RequestInit) => Promise<Response>) | undefined;
let deployment: "local" | "cloud" = "local";
export function configureApiTransport(transport: typeof apiTransport, mode: typeof deployment = "cloud") { apiTransport = transport; deployment = mode; }
export const isCloudMode = () => deployment === "cloud";
const subscribeOnline = (listener: () => void) => { window.addEventListener("online", listener); window.addEventListener("offline", listener); return () => { window.removeEventListener("online", listener); window.removeEventListener("offline", listener); }; };
export const useOnlineState = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
export const requestRaw = (url: string, options?: RequestInit) => apiTransport ? apiTransport(url, options) : fetch(url, options);
export async function downloadFile(url: string, fallbackName: string) {
  const response = await requestRaw(url, { signal: AbortSignal.timeout(isCloudMode() ? 45_000 : 12_000) });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.message ?? body.error?.message ?? "Não foi possível baixar o arquivo. Tente novamente."); }
  const blob = await response.blob();
  const filename = /filename="?([^";]+)"?/i.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? fallbackName;
  const objectUrl = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = objectUrl; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export const makeQueryClient = () => new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: true, refetchInterval: 30_000, refetchIntervalInBackground: false }, mutations: { retry: false } } });
export class RequestError extends Error {
  constructor(message: string, public code = "UNAVAILABLE", public fields: Record<string, string> = {}, public uncertain = false) { super(message); }
}
export async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), isCloudMode() ? 45_000 : 12_000);
  const abort = () => controller.abort();
  options?.signal?.addEventListener("abort", abort, { once: true });
  if (options?.signal?.aborted) controller.abort();
  try {
    const response = await requestRaw(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers }, signal: controller.signal });
    const body = await response.json();
    if (!response.ok) {
      const error = body.error ?? body;
      throw new RequestError(error.message ?? "Não foi possível concluir. Tente novamente.", error.code, error.fieldErrors, response.status >= 500 && options?.method === "POST");
    }
    return body as T;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError(options?.method === "POST" ? "Não foi possível confirmar. Verificar resultado." : isCloudMode() ? "Confira sua conexão com a internet e tente novamente." : "Conecte-se à rede do computador e mantenha o servidor em execução.", "UNAVAILABLE", {}, options?.method === "POST");
  } finally { clearTimeout(timeout); options?.signal?.removeEventListener("abort", abort); }
}
export type Area = { id: string; name: string; colorKey: string; commercialEnabled: boolean; archivedAt: string | null; version: number };
export type Bootstrap = { areas: Area[]; settings: { wipLimit: number; forumHours: unknown; availabilityWindows: unknown }; settingsVersions: Record<string, number>; serverNow: string; isDemo: boolean };
export function useBootstrap() { return useQuery({ queryKey: ["bootstrap"], queryFn: ({ signal }) => request<Bootstrap>("/api/bootstrap", { signal }) }); }
export function useCommand() {
  const client = useQueryClient();
  const operation = useRef<{ command: string; input: unknown; meta: { operationId: string; expectedVersion?: number } } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<RequestError | null>(null);
  async function run(command: string, input: unknown, expectedVersion?: number) {
    if (pending) return;
    if (isCloudMode() && !navigator.onLine) { const failure = new RequestError("Conecte-se à internet antes de confirmar a gravação.", "UNAVAILABLE", {}, !!error?.uncertain); setError(failure); throw failure; }
    const payload = error?.uncertain && operation.current ? operation.current : { command, input, meta: { operationId: crypto.randomUUID(), ...(expectedVersion === undefined ? {} : { expectedVersion }) } };
    operation.current = payload; setPending(true); setError(null);
    try {
      const result = await request<{ result: Record<string, unknown> }>("/api/commands", { method: "POST", body: JSON.stringify(payload) });
      const records = Array.isArray(result.result) ? result.result : [result.result];
      const warnings = [...new Set(records.flatMap(record => Array.isArray(record?.warnings) ? record.warnings as string[] : []))];
      client.setQueryData(["command-warnings"], warnings);
      operation.current = null;
      await client.invalidateQueries();
      return result.result;
    } catch (caught) { const failure = caught as RequestError; setError(failure); throw failure; }
    finally { setPending(false); }
  }
  return { run, pending, error, clearError: () => setError(null) };
}



