import SalonContent from "./SalonContent";
import { Suspense } from "react";

export default function SalonPublicPage() {
    return (
        <Suspense fallback={null}>
            <SalonContent />
        </Suspense>
    );
}
