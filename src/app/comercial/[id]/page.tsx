import { OpportunityDetail } from "@/components/data/commercial";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <OpportunityDetail id={(await params).id} />; }
