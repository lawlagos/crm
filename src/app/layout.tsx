import type { Metadata } from "next";
import { Suspense } from "react";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/source-sans-3/latin-400.css";
import "@fontsource/source-sans-3/latin-600.css";
import "./globals.css";
import { Providers } from "@/components/layout/providers";
import { AppShell } from "@/components/layout/app-shell";
import { LoadingState } from "@/components/ui/primitives";
export const metadata: Metadata = { title: "Central", description: "Seu trabalho, conectado. Gestão local de tarefas, projetos e negócios.", robots: { index: false, follow: false } };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="pt-BR"><body><Providers><Suspense fallback={<LoadingState />}><AppShell>{children}</AppShell></Suspense></Providers></body></html>; }
