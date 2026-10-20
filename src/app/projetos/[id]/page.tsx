import { RecordDetail } from "@/components/data/record-detail";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <RecordDetail kind="project" id={id} />; }
