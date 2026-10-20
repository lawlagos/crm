import { ContactDetail } from "@/components/data/contacts";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <ContactDetail id={(await params).id} />; }
