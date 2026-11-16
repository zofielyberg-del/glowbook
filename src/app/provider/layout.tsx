'use client';

import { Suspense } from 'react';
import { DashboardGuard } from '@/components/dashboard/DashboardGuard';
import ProviderShell from '@/components/dashboard/ProviderShell';

export default function ProviderLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardGuard>
            <Suspense fallback={
                <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-[#C2A26A] border-t-transparent animate-spin" />
                </div>
            }>
                <ProviderShell>
                    {children}
                </ProviderShell>
            </Suspense>
        </DashboardGuard>
    );
}
