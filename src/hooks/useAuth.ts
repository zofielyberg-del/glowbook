
'use client';

import { useState, useEffect, useCallback } from 'react';

export type Role = 'admin' | 'salon_owner' | 'practitioner' | 'customer' | 'guest';

interface AuthState {
    user: any | null;
    role: Role;
    isLoading: boolean;
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        role: 'guest',
        isLoading: true,
    });

    const checkAuth = useCallback(async () => {
        const adminData = localStorage.getItem('glowbook_admin');
        const salonDataString = localStorage.getItem('glowbook_salon');
        const customerData = localStorage.getItem('glowbook_customer');

        if (adminData) {
            setState({ user: JSON.parse(adminData), role: 'admin', isLoading: false });
        } else if (salonDataString) {
            let data = JSON.parse(salonDataString);

            // Try to fetch fresh data from server if we have an ID
            if (data.id && data.id.length > 20) {
                try {
                    const response = await fetch(`/api/salons/get?id=${data.id}`);
                    const serverResult = await response.json();
                    if (serverResult.success) {
                        data = { ...data, ...serverResult.salon };
                        localStorage.setItem('glowbook_salon', JSON.stringify(data));
                    } else if (serverResult.error === 'Salon not found') {
                        // DB was cleared, remove from local storage
                        localStorage.removeItem('glowbook_salon');
                        setState({ user: null, role: 'guest', isLoading: false });
                        return;
                    }
                } catch (e) {
                    console.error('Failed to refresh salon data from server:', e);
                }
            }

            const role: Role = data.role === 'practitioner' ? 'practitioner' : 'salon_owner';
            setState({ user: data, role, isLoading: false });
        } else if (customerData) {
            const data = JSON.parse(customerData);
            
            // For customers, also try to verify if they exist if they have a real ID
            if (data.id && data.id.length > 20) {
                try {
                    const response = await fetch(`/api/admin/data`); // We can use the admin data or a specific user check
                    const result = await response.json();
                    if (result.success) {
                        const exists = result.users.some((u: any) => u.id === data.id);
                        if (!exists) {
                            localStorage.removeItem('glowbook_customer');
                            setState({ user: null, role: 'guest', isLoading: false });
                            return;
                        }
                    }
                } catch (e) {}
            }
            
            setState({ user: data, role: 'customer', isLoading: false });
        } else {
            setState({ user: null, role: 'guest', isLoading: false });
        }
    }, []);

    useEffect(() => {
        checkAuth();

        // Listen for storage changes or custom events
        const handleUpdate = () => checkAuth();
        window.addEventListener('glowbook_update', handleUpdate);
        window.addEventListener('storage', handleUpdate);

        return () => {
            window.removeEventListener('glowbook_update', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, [checkAuth]);

    const hasPermission = (allowedRoles: Role[]) => {
        return allowedRoles.includes(state.role);
    };

    const logout = () => {
        localStorage.removeItem('glowbook_admin');
        localStorage.removeItem('glowbook_salon');
        localStorage.removeItem('glowbook_customer');
        window.dispatchEvent(new Event('glowbook_update'));
    };

    return {
        ...state,
        isLoggedIn: state.role !== 'guest',
        isAdmin: state.role === 'admin',
        isSalonOwner: state.role === 'salon_owner',
        isPractitioner: state.role === 'practitioner',
        isCustomer: state.role === 'customer',
        hasPermission,
        logout,
        refresh: checkAuth
    };
}
