"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, FolderOpen, Plus } from "lucide-react";
import { request } from "@/lib/query-client";
import { formatDate } from "@/lib/time";
import { AppSelect, Badge, Button, EmptyState, ErrorState, LoadingState } from "../ui/primitives";
import { projectStatuses, type Page, type Project } from "./models";
import { RecordForm } from "./record-form";
import { AreaBadge } from "./task-list";
export function ProjectsPage() {
  const params = useSearchParams(); const router = useRouter(); const [create, setCreate] = useState(false); const areaId = params.get("areaId") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1); const size = Number(params.get("pageSize")) || 25;
  const query = useQuery({ queryKey: ["projects", params.toString()], queryFn: ({ signal }) => request<Page<Project>>(`/api/projects?${params}&pageSize=${size}`, { signal }) });
  function filter(key: string, value: string) { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); if (key !== "page") next.delete("page"); router.replace(`/projetos?${next}`); }
  return <><div className="page-heading"><div><span className="eyebrow">Entregas com direção</span><h1>Projetos</h1><p>Conecte objetivos, tarefas e os próximos passos de cada entrega.</p></div><Button onClick={() => setCreate(true)}><Plus size={18} />Criar projeto</Button></div><div className="filterbar"><AppSelect label="Filtrar projetos por status" value={params.get("status") ?? ""} onChange={value => filter("status", value)} options={[{ value: "", label: "Todos os status" }, ...projectStatuses]} /><span className="muted">{query.data?.total ?? "—"} projetos</span></div><section className="panel list-panel">{query.isPending ? <LoadingState /> : query.isError ? <ErrorState retry={() => query.refetch()} /> : !query.data.items.length ? <EmptyState title={params.get("status") || areaId ? "Nenhum projeto neste filtro" : "Uma entrega começa com direção"} description="Crie um projeto para reunir o objetivo e os próximos passos de uma entrega." action={<Button onClick={() => setCreate(true)}><Plus size={18} />Criar projeto</Button>} /> : <div className="project-list">{query.data.items.map(project => <Link href={`/projetos/${project.id}`} className="project-row" key={project.id}><span className="project-icon"><FolderOpen size={22} strokeWidth={1.5} /></span><div className="project-summary"><h2>{project.name}</h2><p>{project.objective || "Objetivo ainda não definido"}</p><AreaBadge areaId={project.areaId} /></div><span className="project-date">{project.targetDate ? `Alvo ${formatDate(project.targetDate)}` : "Sem data alvo"}</span><Badge tone={project.status === "concluido" ? "success" : "neutral"}>{projectStatuses.find(status => status.value === project.status)?.label}</Badge><ArrowUpRight size={18} /></Link>)}</div>}{query.data && query.data.total > 0 && <div className="pagination"><span>{Math.min((page - 1) * size + 1, query.data.total)}–{Math.min(page * size, query.data.total)} de {query.data.total}</span><AppSelect label="Projetos por página" value={String(size)} onChange={value => filter("pageSize", value)} options={[25, 50, 100].map(value => ({ value: String(value), label: `${value} por página` }))} /><Button variant="outline" disabled={page <= 1} onClick={() => filter("page", String(page - 1))}>Anterior</Button><Button variant="outline" disabled={page * size >= query.data.total} onClick={() => filter("page", String(page + 1))}>Próxima</Button></div>}</section>{create && <RecordForm kind="project" open initialArea={areaId} onClose={() => setCreate(false)} />}</>;
}

