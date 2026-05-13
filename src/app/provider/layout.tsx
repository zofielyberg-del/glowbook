
'use client';

import { DashboardGuard } from '@/components/dashboard/DashboardGuard';

export default function ProviderLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardGuard>
            {children}
        </DashboardGuard>
    );
}
