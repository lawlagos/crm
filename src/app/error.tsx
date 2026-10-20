"use client";
import { ErrorState } from "@/components/ui/primitives";
export default function ErrorPage({ reset }: { reset: () => void }) { return <ErrorState message="A tela não pôde ser carregada. Seus registros salvos permanecem no computador." retry={reset} />; }
