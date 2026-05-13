
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClearStorage() {
    const router = useRouter();

    useEffect(() => {
        // Rensa allt
        localStorage.clear();
        sessionStorage.clear();

        // Trigga uppdatering i headern
        window.dispatchEvent(new Event('glowbook_update'));

        // Gå tillbaka hem
        setTimeout(() => {
            router.replace('/');
        }, 500);
    }, [router]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center text-white font-heading">
            <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-champagne-500 mx-auto"></div>
                <h1 className="text-2xl font-black tracking-widest uppercase">Rensar allt...</h1>
                <p className="text-white/40 text-sm">Skickar dig tillbaka till startsidan strax.</p>
            </div>
        </div>
    );
}
