
'use client';

import RegisterContent from "./RegisterContent";
import { Suspense } from "react";

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-champagne-50 flex items-center justify-center">Loading...</div>}>
            <RegisterContent />
        </Suspense>
    );
}
