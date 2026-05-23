'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

export default function ClearStorage() {
    const router = useRouter();
    const [status, setStatus] = useState('starting');

    useEffect(() => {
        // Complete full factory reset: clear absolutely all local storage and session data
        localStorage.clear();
        sessionStorage.clear();

        // Dispatch update to ensure headers and global contexts update
        window.dispatchEvent(new Event('glowbook_update'));
        setStatus('done');

        // Redirect back home for a completely fresh start
        setTimeout(() => {
            router.replace('/');
        }, 1500);
    }, [router]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center text-white font-heading">
            <div className="text-center space-y-6 max-w-sm px-6">
                {status === 'starting' && (
                    <div className="space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-champagne-500 mx-auto"></div>
                        <h1 className="text-xl font-black tracking-widest uppercase">Nollställer allt...</h1>
                        <p className="text-white/40 text-xs font-medium leading-relaxed">
                            Rensar absolut all data, salonger, bokningar och inställningar helt från grunden.
                        </p>
                    </div>
                )}
                {status === 'done' && (
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto shadow-xl shadow-green-500/20 animate-bounce">
                            <CheckCircle2 size={32} />
                        </div>
                        <h1 className="text-xl font-black tracking-widest uppercase text-green-500">Nollställd!</h1>
                        <p className="text-white/40 text-xs font-medium leading-relaxed">
                            Allting har raderats helt. Skickar dig till startsidan för en helt ny början...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
