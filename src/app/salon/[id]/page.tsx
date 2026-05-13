
import SalonContent from "../SalonContent";

export default async function SalonDynamicPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    return <SalonContent params={resolvedParams} />;
}
