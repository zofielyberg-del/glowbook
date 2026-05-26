'use client';

import { useState, useEffect } from "react";
import { Search, UserPlus, Mail, Phone, Calendar, MoreVertical, Filter, Users, X, Check, ArrowUpRight, CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import Header from "@/components/layout/Header";
import { motion, AnimatePresence } from "framer-motion";

type Customer = {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    lastVisit: string;
    totalBookings: number;
    totalCancellations: number;
    status: string;
};

export default function CustomersPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [invitePhone, setInvitePhone] = useState('');
    const [inviteSent, setInviteSent] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);

    const loadCustomers = () => {
        const saved = localStorage.getItem('glowbook_salon');
        if (saved) {
            const data = JSON.parse(saved);
            const appts = data.appointments || [];
            const localCusts = data.customers || [];
            
            const customerMap: Record<string, Customer> = {};

            // 1. Map invited/saved customers
            localCusts.forEach((c: any) => {
                const emailKey = (c.email || '').toLowerCase().trim();
                customerMap[emailKey] = {
                    id: c.id || Math.random().toString(),
                    firstName: c.firstName || '',
                    lastName: c.lastName || '',
                    email: c.email || '',
                    phone: c.phone || '-',
                    lastVisit: c.lastVisit || '-',
                    totalBookings: c.totalBookings || 0,
                    totalCancellations: c.totalCancellations || 0,
                    status: c.status || 'Active'
                };
            });

            // 2. Extrakt and map from actual appointments
            appts.forEach((apt: any) => {
                const emailKey = (apt.clientEmail || '').toLowerCase().trim();
                if (!emailKey) return;
                
                const isCancelled = apt.status === 'cancelled';

                const nameParts = (apt.clientName || '').split(' ');
                const firstName = nameParts[0] || 'Gäst';
                const lastName = nameParts.slice(1).join(' ') || '';

                if (customerMap[emailKey]) {
                    if (isCancelled) {
                        customerMap[emailKey].totalCancellations += 1;
                    } else {
                        customerMap[emailKey].totalBookings += 1;
                        // Keep the latest visit date
                        if (apt.date && (!customerMap[emailKey].lastVisit || apt.date > customerMap[emailKey].lastVisit)) {
                            customerMap[emailKey].lastVisit = apt.date;
                        }
                    }
                    if (apt.clientPhone && apt.clientPhone !== '-') {
                        customerMap[emailKey].phone = apt.clientPhone;
                    }
                } else {
                    customerMap[emailKey] = {
                        id: apt.id || Math.random().toString(),
                        firstName,
                        lastName,
                        email: apt.clientEmail,
                        phone: apt.clientPhone || '-',
                        lastVisit: isCancelled ? '-' : (apt.date || '-'),
                        totalBookings: isCancelled ? 0 : 1,
                        totalCancellations: isCancelled ? 1 : 0,
                        status: 'Active'
                    };
                }
            });

            setCustomers(Object.values(customerMap));
        }
    };

    useEffect(() => {
        loadCustomers();
        window.addEventListener('storage', loadCustomers);
        window.addEventListener('glowbook_update', loadCustomers);

        return () => {
            window.removeEventListener('storage', loadCustomers);
            window.removeEventListener('glowbook_update', loadCustomers);
        };
    }, []);

    const handleInviteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const saved = localStorage.getItem('glowbook_salon');
        if (saved) {
            const data = JSON.parse(saved);
            const localCusts = data.customers || [];
            
            const nameParts = inviteName.split(' ');
            const firstName = nameParts[0] || 'Ny';
            const lastName = nameParts.slice(1).join(' ') || 'Kund';

            const newCust = {
                id: Date.now().toString(),
                firstName,
                lastName,
                email: inviteEmail,
                phone: invitePhone || '-',
                lastVisit: '-',
                totalBookings: 0,
                totalCancellations: 0,
                status: 'Active'
            };
            
            data.customers = [...localCusts, newCust];
            localStorage.setItem('glowbook_salon', JSON.stringify(data));
            sessionStorage.setItem('glowbook_salon', JSON.stringify(data));
            
            // Trigger API sync if exists
            fetch('/api/salons/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).catch(err => console.error('Failed to sync invitation:', err));

            window.dispatchEvent(new Event('glowbook_update'));
            loadCustomers();
        }

        setInviteSent(true);
        setTimeout(() => {
            setInviteSent(false);
            setIsInviteModalOpen(false);
            setInviteEmail('');
            setInviteName('');
            setInvitePhone('');
        }, 2000);
    };

    const filteredCustomers = customers.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#faf8f5] dark:bg-[#0c0c0a] text-foreground transition-colors duration-300">
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-16">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-heading font-black text-foreground tracking-tight">Kunder</h1>
                        <p className="text-foreground/40 text-sm font-medium mt-1">
                            Dina slutkunder sparas automatiskt vid bokning. Lägg till eller sök efter kunder i ditt nätverk.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="bg-foreground text-background px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-champagne-600 hover:text-white transition-all shadow-lg active:scale-95 text-sm"
                    >
                        <UserPlus size={18} /> Lägg till ny kund
                    </button>
                </div>

                {/* Filters and Search */}
                <div className="bg-card p-4 rounded-3xl shadow-sm border border-border flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30" size={18} />
                        <input
                            type="text"
                            placeholder="Sök på namn, e-post eller telefonnummer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-foreground/[0.02] pl-12 pr-4 py-3 rounded-2xl border border-border focus:border-champagne-500 focus:ring-1 focus:ring-champagne-500 outline-none transition-all text-sm font-medium"
                        />
                    </div>
                    <button className="flex items-center justify-center gap-2 px-5 py-3 text-foreground/60 hover:bg-foreground/5 rounded-2xl transition-all border border-border text-sm font-bold">
                        <Filter size={18} /> Filter
                    </button>
                </div>

                {/* Customer Content */}
                {filteredCustomers.length === 0 ? (
                    <div className="bg-card rounded-[40px] border border-dashed border-border p-16 md:p-24 text-center flex flex-col items-center justify-center space-y-6">
                        <div className="w-20 h-20 bg-champagne-500/10 text-champagne-500 rounded-full flex items-center justify-center">
                            <Users size={36} />
                        </div>
                        <div className="space-y-2 max-w-sm">
                            <h2 className="text-xl font-bold text-foreground">Inga kunder hittades</h2>
                            <p className="text-foreground/40 text-sm font-medium">
                                {searchTerm 
                                    ? "Din sökning matchade inte någon kund i registret. Försök med en annan sökning." 
                                    : "Registret är tomt just nu. Kunder läggs automatiskt till här så fort de genomför sin första bokning!"}
                            </p>
                        </div>
                        {!searchTerm && (
                            <button
                                onClick={() => setIsInviteModalOpen(true)}
                                className="bg-foreground text-background px-8 py-4 rounded-2xl font-bold hover:bg-champagne-600 hover:text-white transition-all shadow-lg active:scale-95"
                            >
                                Lägg till första kunden
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-card rounded-[32px] shadow-sm border border-border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-foreground/[0.01] border-b border-border">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-foreground/30 uppercase tracking-widest">Namn</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-foreground/30 uppercase tracking-widest">E-post</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-foreground/30 uppercase tracking-widest">Telefon</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-foreground/30 uppercase tracking-widest">Senaste besök</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-foreground/30 uppercase tracking-widest text-center">Bokningar</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-foreground/30 uppercase tracking-widest text-center">Avbokningar</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-foreground/30 uppercase tracking-widest text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {filteredCustomers.map(c => (
                                        <tr key={c.id} className="hover:bg-foreground/[0.01] transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-champagne-500/10 text-champagne-600 font-bold flex items-center justify-center text-sm uppercase">
                                                        {c.firstName[0]}{c.lastName[0] || ''}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-foreground block text-sm">{c.firstName} {c.lastName}</span>
                                                        <span className="text-[10px] text-foreground/30 font-medium">KundID: #{c.id.slice(-6)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-sm font-medium text-foreground/60">{c.email}</td>
                                            <td className="px-6 py-5 text-sm font-medium text-foreground/60">{c.phone}</td>
                                            <td className="px-6 py-5 text-sm font-medium text-foreground/60">
                                                {c.lastVisit !== '-' ? (
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar size={12} className="text-foreground/30" />
                                                        {c.lastVisit}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-5 text-sm font-black text-foreground text-center">
                                                <span className="px-2.5 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg border border-green-500/20">
                                                    {c.totalBookings}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-sm font-black text-foreground text-center">
                                                <span className={`px-2.5 py-1 ${c.totalCancellations > 0 ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' : 'bg-foreground/[0.04] text-foreground/40 border border-border/40'} rounded-lg`}>
                                                    {c.totalCancellations}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <span className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                    Aktiv
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Add New Customer Modal */}
                <AnimatePresence>
                    {isInviteModalOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsInviteModalOpen(false)}
                                className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[100]"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] sm:w-[440px] bg-card border border-border shadow-2xl rounded-3xl z-[101] overflow-hidden flex flex-col"
                            >
                                <div className="p-6 border-b border-border bg-foreground/[0.02] flex justify-between items-center">
                                    <div>
                                        <h3 className="text-base font-black text-foreground">Lägg till ny kund</h3>
                                        <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest mt-0.5">Manuellt register</p>
                                    </div>
                                    <button onClick={() => setIsInviteModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-foreground/5 text-foreground/40 hover:text-foreground transition-all">
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleInviteSubmit} className="p-6 space-y-4">
                                    {inviteSent ? (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="text-center py-8 space-y-4"
                                        >
                                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto shadow-xl shadow-green-500/10">
                                                <CheckCircle2 size={32} />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-lg font-bold text-foreground">Kunden har lagts till!</h4>
                                                <p className="text-foreground/40 text-xs font-medium">Registret har uppdaterats med den nya kunden.</p>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30 pl-1">För- och efternamn *</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={inviteName}
                                                    onChange={(e) => setInviteName(e.target.value)}
                                                    placeholder="Maria Andersson"
                                                    className="w-full bg-foreground/[0.02] border border-border rounded-xl px-4 py-3 text-sm focus:border-champagne-500 focus:ring-1 focus:ring-champagne-500 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30 pl-1">E-postadress *</label>
                                                <input
                                                    required
                                                    type="email"
                                                    value={inviteEmail}
                                                    onChange={(e) => setInviteEmail(e.target.value)}
                                                    placeholder="maria@exempel.se"
                                                    className="w-full bg-foreground/[0.02] border border-border rounded-xl px-4 py-3 text-sm focus:border-champagne-500 focus:ring-1 focus:ring-champagne-500 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30 pl-1">Mobilnummer</label>
                                                <input
                                                    type="tel"
                                                    value={invitePhone}
                                                    onChange={(e) => setInvitePhone(e.target.value)}
                                                    placeholder="070-000 00 00"
                                                    className="w-full bg-foreground/[0.02] border border-border rounded-xl px-4 py-3 text-sm focus:border-champagne-500 focus:ring-1 focus:ring-champagne-500 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="pt-2">
                                                <button
                                                    type="submit"
                                                    className="w-full bg-foreground text-background py-4 rounded-xl font-bold hover:bg-champagne-600 hover:text-white transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 text-xs uppercase tracking-wider"
                                                >
                                                    Spara kund i register <Check size={14} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </form>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
