import { ReceivableDetail } from "@/components/data/finance";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <ReceivableDetail id={(await params).id} />; }
