
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
        const adminData = sessionStorage.getItem('glowbook_admin') || localStorage.getItem('glowbook_admin');
        const salonDataString = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
        const customerData = sessionStorage.getItem('glowbook_customer') || localStorage.getItem('glowbook_customer');

        if (adminData && (!salonDataString || !JSON.parse(salonDataString).isImpersonated)) {
            setState({ user: JSON.parse(adminData), role: 'admin', isLoading: false });
        } else if (salonDataString) {
            let data = JSON.parse(salonDataString);
            const role: Role = data.role === 'practitioner' ? 'practitioner' : 'salon_owner';

            // ⚡️ Instant render: Set the state immediately using local sessionStorage data
            setState({ user: data, role, isLoading: false });

            // 🔄 Background Sync: Refresh data from server without blocking the UI
            if (data.id && data.id.length > 20) {
                fetch(`/api/salons/get?id=${data.id}&_t=${Date.now()}`)
                    .then(res => res.json())
                    .then(serverResult => {
                        if (serverResult.success) {
                            const currentSaved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
                            const currentData = currentSaved ? JSON.parse(currentSaved) : data;
                            const lastMutation = localStorage.getItem('glowbook_last_mutation') || sessionStorage.getItem('glowbook_last_mutation');
                            const isRecentMutation = lastMutation && (Date.now() - Number(lastMutation) < 4000);
                            const refreshedData = { 
                                ...currentData, 
                                ...serverResult.salon,
                                availability: isRecentMutation 
                                    ? currentData.availability 
                                    : (serverResult.salon.availability || currentData.availability)
                            };
                            sessionStorage.setItem('glowbook_salon', JSON.stringify(refreshedData));
                            localStorage.setItem('glowbook_salon', JSON.stringify(refreshedData));
                            setState({ user: refreshedData, role, isLoading: false });
                        } else if (serverResult.error === 'Salon not found') {
                            sessionStorage.removeItem('glowbook_salon');
                            localStorage.removeItem('glowbook_salon');
                            setState({ user: null, role: 'guest', isLoading: false });
                        }
                    })
                    .catch(e => {
                        console.error('Background salon sync failed:', e);
                    });
            }
        } else if (customerData) {
            const data = JSON.parse(customerData);
            
            // ⚡️ Instant render for customers
            setState({ user: data, role: 'customer', isLoading: false });
            
            // 🔄 Background verify
            if (data.id && data.id.length > 20) {
                fetch(`/api/auth/verify?id=${data.id}`)
                    .then(res => res.json())
                    .then(result => {
                        if (result.success && !result.exists) {
                            sessionStorage.removeItem('glowbook_customer');
                            setState({ user: null, role: 'guest', isLoading: false });
                        }
                    })
                    .catch(() => {});
            }
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
        sessionStorage.removeItem('glowbook_admin');
        sessionStorage.removeItem('glowbook_salon');
        sessionStorage.removeItem('glowbook_customer');
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
