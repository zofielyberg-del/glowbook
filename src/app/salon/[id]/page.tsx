
import SalonContent from "../SalonContent";
import { Suspense } from "react";

export default async function SalonDynamicPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    return (
        <Suspense fallback={null}>
            <SalonContent params={resolvedParams} />
        </Suspense>
    );
}
