'use client';

import { useAuth, Role } from '@/hooks/useAuth';
import { ReactNode } from 'react';

interface PermissionGateProps {
    children: ReactNode;
    allowedRoles: Role[];
    fallback?: ReactNode;
}

/**
 * A wrapper component that only renders its children if the current user
 * has one of the allowed roles.
 */
export function PermissionGate({
    children,
    allowedRoles,
    fallback = null
}: PermissionGateProps) {
    const { role, isLoading } = useAuth();

    if (isLoading) return null;

    if (allowedRoles.includes(role)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
}
