"use client";
import { useState, type ReactNode } from "react";
import { downloadFile, isCloudMode } from "@/lib/query-client";
export function DownloadLink({ href, filename = "central-exportacao.csv", className = "subtle-link", children }: { href: string; filename?: string; className?: string; children: ReactNode }) {
  const [pending, setPending] = useState(false); const [error, setError] = useState("");
  if (!isCloudMode()) return <a href={href} className={className}>{children}</a>;
  return <span className="download-control"><button type="button" className={`download-link ${className}`} disabled={pending} aria-busy={pending} onClick={async () => { if (pending) return; setPending(true); setError(""); try { await downloadFile(href, filename); } catch (caught) { setError((caught as Error).message); } finally { setPending(false); } }}>{children}</button>{error && <span className="download-error" role="alert">{error}</span>}</span>;
}
