"use client";

import { useQuery } from "@tanstack/react-query";
import { request, useBootstrap } from "@/lib/query-client";
import { type Page } from "./models";
import { AppSelect, Button } from "../ui/primitives";
import type { FormField } from "../ui/entity-form";
import { useRouter, useSearchParams } from "next/navigation";
export type Row = Record<string, unknown> & { id: string; version: number };
export function useRecords<T = Row>(resource: string, params = "", enabled = true) { return useQuery({ queryKey: [resource, params], queryFn: ({ signal }) => request<Page<T>>(`/api/${resource}?${params}`, { signal }), enabled }); }
export function useOptions(resource: string, nameKey = "name", params = "") { const query = useRecords<Row>(resource, `pageSize=100&${params}`); return { query, options: query.data?.items.map(row => ({ value: row.id, label: String(row[nameKey] ?? row.id) })) ?? [] }; }
export function useAreaField(commercial = false): FormField { const bootstrap = useBootstrap(); return { key: "areaId", label: "Frente", required: true, type: "select", options: [{ value: "", label: "Escolha uma frente" }, ...(bootstrap.data?.areas.filter(area => !area.archivedAt && (!commercial || area.commercialEnabled)).map(area => ({ value: area.id, label: area.name })) ?? [])] }; }
export function useListFilters(route: string) { const params = useSearchParams(); const router = useRouter(); function set(key: string, value: string) { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); if (key !== "page") next.delete("page"); router.replace(`${route}?${next}`); } return { params, set, areaId: params.get("areaId") ?? "", page: Number(params.get("page")) || 1, pageSize: Number(params.get("pageSize")) || 25 }; }
export function Pager({ total, route }: { total: number; route: string }) { const { set, page, pageSize } = useListFilters(route); if (!total) return null; return <div className="pagination"><span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}</span><AppSelect label="Registros por página" value={String(pageSize)} onChange={value => set("pageSize", value)} options={[25, 50, 100].map(value => ({ value: String(value), label: `${value} por página` }))} /><Button variant="outline" disabled={page <= 1} onClick={() => set("page", String(page - 1))}>Anterior</Button><Button variant="outline" disabled={page * pageSize >= total} onClick={() => set("page", String(page + 1))}>Próxima</Button></div>; }
export const selectField = (key: string, label: string, options: { value: string; label: string }[], required = false): FormField => ({ key, label, type: "select", options, required });
