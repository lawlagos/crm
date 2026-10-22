"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, createContext, useContext, useEffect, type ReactNode } from "react";
import { makeQueryClient } from "@/lib/query-client";
import { ToastProvider, Modal, Button } from "../ui/primitives";
import { TaskMoveQueueProvider } from "../data/task-move-queue";
import { PwaClient } from "../pwa/client";
import { useRouter } from "next/navigation";

const DraftContext = createContext({ dirty: false, setDirty: (value: boolean) => { void value; }, guard: (action: () => void) => action() });
export const useDraft = () => useContext(DraftContext);
export function Providers({ children, taskMovesEnabled = true }: { children: ReactNode; taskMovesEnabled?: boolean }) {
  const [client] = useState(makeQueryClient);
  const [dirty, setDirty] = useState(false);
  const [nextAction, setNextAction] = useState<(() => void) | null>(null);
  const router = useRouter();
  function guard(action: () => void) { if (dirty) setNextAction(() => action); else action(); }
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
      if (anchor.getAttribute("href")?.startsWith("#") && !anchor.hash.startsWith("#/")) return;
      if (anchor.origin === window.location.origin && anchor.href !== window.location.href) { event.preventDefault(); event.stopPropagation(); setNextAction(() => () => router.push(anchor.hash.startsWith("#/") ? anchor.hash.slice(1) : anchor.pathname + anchor.search)); }
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", click, true); };
  }, [dirty, router]);
  return <QueryClientProvider client={client}><ToastProvider><TaskMoveQueueProvider enabled={taskMovesEnabled}><DraftContext.Provider value={{ dirty, setDirty, guard }}>{children}{taskMovesEnabled && <PwaClient />}<Modal open={!!nextAction} onOpenChange={open => { if (!open) setNextAction(null); }} title="Descartar rascunho?" description="As alterações ainda não foram salvas. Se sair agora, o que digitou será descartado."><div className="dialog-actions"><Button variant="outline" onClick={() => setNextAction(null)} autoFocus>Continuar editando</Button><Button variant="danger" onClick={() => { const action = nextAction; setNextAction(null); setDirty(false); action?.(); }}>Descartar rascunho</Button></div></Modal></DraftContext.Provider></TaskMoveQueueProvider></ToastProvider></QueryClientProvider>;
}


