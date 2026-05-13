
'use client';

import ExploreContent from "./ExploreContent";
import { Suspense } from "react";

export default function ExplorePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
            <ExploreContent />
        </Suspense>
    );
}
