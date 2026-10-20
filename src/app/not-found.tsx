import Link from "next/link";
import { EmptyState } from "@/components/ui/primitives";
export default function NotFound() { return <EmptyState title="Esta página não foi encontrada" description="O endereço pode ter mudado. Volte ao seu espaço de trabalho." action={<Link href="/" className="button button-primary">Voltar para Hoje</Link>} />; }
