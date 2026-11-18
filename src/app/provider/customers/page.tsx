'use client';

import { useState, useEffect } from "react";
import { Search, UserPlus, Mail, Phone, Calendar, MoreVertical, Filter, Users, X, Check, ArrowUpRight, CheckCircle2, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useLanguage } from "@/context/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { PermissionGate } from "@/components/auth/PermissionGate";

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
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [invitePhone, setInvitePhone] = useState('');
    const [inviteSent, setInviteSent] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);

    const loadCustomers = async () => {
        const saved = localStorage.getItem('glowbook_salon') || sessionStorage.getItem('glowbook_salon');
        let localSalonId = '';
        const customerMap: Record<string, Customer> = {};

        // Track hidden customers to prevent resurrecting deleted customers
        const hiddenEmails = new Set<string>();
        const hiddenIds = new Set<string>();
        const hiddenPhones = new Set<string>();

        if (saved) {
            try {
                const data = JSON.parse(saved);
                localSalonId = data.id || data.salonId || '';

                if (Array.isArray(data.availability)) {
                    const hiddenBlock = data.availability.find((a: any) => a && a.type === 'hidden_customers');
                    if (hiddenBlock) {
                        (hiddenBlock.emails || []).forEach((e: string) => hiddenEmails.add((e || '').toLowerCase().trim()));
                        (hiddenBlock.ids || []).forEach((id: any) => hiddenIds.add(String(id)));
                        (hiddenBlock.phones || []).forEach((p: string) => hiddenPhones.add((p || '').replace(/[^0-9]/g, '')));
                    }
                }

                const appts = data.appointments || [];
                const localCusts = data.customers || [];

                // 1. Map invited/saved customers
                localCusts.forEach((c: any) => {
                    const emailKey = (c.email || '').toLowerCase().trim();
                    const phoneKey = (c.phone || '').replace(/[^0-9]/g, '');
                    if (hiddenEmails.has(emailKey) || (c.id && hiddenIds.has(String(c.id))) || (phoneKey && hiddenPhones.has(phoneKey))) {
                        return;
                    }
                    const key = emailKey || phoneKey || c.id;
                    if (!key) return;

                    customerMap[key] = {
                        id: c.id || Math.random().toString(),
                        firstName: c.firstName || '',
                        lastName: c.lastName || '',
                        email: c.email || '',
                        phone: c.phone || '-',
                        lastVisit: c.lastVisit || '-',
                        totalBookings: c.totalBookings || 0,
                        totalCancellations: c.totalCancellations || 0,
                        status: c.status || 'Aktiv'
                    };
                });

                // 2. Extract and map from local appointments (ONLY if not hidden)
                appts.forEach((apt: any) => {
                    const rawEmail = apt.customer_email || apt.clientEmail || '';
                    const emailKey = rawEmail.toLowerCase().trim();
                    const rawPhone = apt.customer_phone || apt.clientPhone || '-';
                    const phoneKey = rawPhone.replace(/[^0-9]/g, '');
                    const aptId = apt.id ? String(apt.id) : '';

                    if (hiddenEmails.has(emailKey) || (aptId && hiddenIds.has(aptId)) || (phoneKey && hiddenPhones.has(phoneKey))) {
                        return;
                    }

                    const isCancelled = apt.status === 'cancelled';
                    const rawName = apt.customer_name || apt.clientName || '';
                    const nameParts = rawName.split(' ');
                    const firstName = nameParts[0] || 'Gäst';
                    const lastName = nameParts.slice(1).join(' ') || '';

                    let rawDate = '-';
                    if (apt.date) {
                        rawDate = apt.date;
                    } else if (apt.start_time) {
                        rawDate = new Date(apt.start_time).toISOString().split('T')[0];
                    }

                    const key = emailKey || (phoneKey !== '' ? phoneKey : aptId);
                    if (!key) return;

                    if (customerMap[key]) {
                        if (isCancelled) {
                            customerMap[key].totalCancellations += 1;
                        } else {
                            customerMap[key].totalBookings += 1;
                            if (rawDate !== '-' && (!customerMap[key].lastVisit || rawDate > customerMap[key].lastVisit)) {
                                customerMap[key].lastVisit = rawDate;
                            }
                        }
                        if (rawPhone && rawPhone !== '-') {
                            customerMap[key].phone = rawPhone;
                        }
                    } else {
                        customerMap[key] = {
                            id: apt.id || Math.random().toString(),
                            firstName,
                            lastName,
                            email: rawEmail,
                            phone: rawPhone,
                            lastVisit: isCancelled ? '-' : rawDate,
                            totalBookings: isCancelled ? 0 : 1,
                            totalCancellations: isCancelled ? 1 : 0,
                            status: 'Aktiv'
                        };
                    }
                });

                setCustomers(Object.values(customerMap));
            } catch (e) {
                console.error('Error parsing local salon data:', e);
            }
        }

        // 3. Fetch full customer directory from database (authoritative source)
        if (localSalonId) {
            try {
                const res = await fetch(`/api/salons/customers?salonId=${localSalonId}&_t=${Date.now()}`);
                const result = await res.json();
                if (result.success && Array.isArray(result.customers)) {
                    const cleanList = result.customers.filter((c: Customer) => {
                        const emailKey = (c.email || '').toLowerCase().trim();
                        const phoneKey = (c.phone || '').replace(/[^0-9]/g, '');
                        return !hiddenEmails.has(emailKey) && !hiddenIds.has(String(c.id)) && (!phoneKey || !hiddenPhones.has(phoneKey));
                    });
                    setCustomers(cleanList);
                }
            } catch (err) {
                console.error('Failed to fetch customers from database:', err);
            }
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

    const handleInviteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const saved = localStorage.getItem('glowbook_salon') || sessionStorage.getItem('glowbook_salon');
        if (saved) {
            const data = JSON.parse(saved);
            const localCusts = data.customers || [];
            
            const nameParts = inviteName.trim().split(' ');
            const firstName = nameParts[0] || 'Ny';
            const lastName = nameParts.slice(1).join(' ') || '';

            let savedCust = {
                id: Date.now().toString(),
                firstName,
                lastName,
                email: inviteEmail,
                phone: invitePhone || '-',
                lastVisit: '-',
                totalBookings: 0,
                totalCancellations: 0,
                status: 'Aktiv'
            };

            if (data.id) {
                try {
                    const res = await fetch('/api/salons/customers', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            salonId: data.id,
                            firstName,
                            lastName,
                            email: inviteEmail,
                            phone: invitePhone || '-'
                        })
                    });
                    const json = await res.json();
                    if (res.ok && json.customer) savedCust = json.customer;
                } catch (err) {
                    console.error('Failed to save customer to database:', err);
                }
            }
            
            data.customers = [...localCusts, savedCust];
            localStorage.setItem('glowbook_salon', JSON.stringify(data));
            sessionStorage.setItem('glowbook_salon', JSON.stringify(data));

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

    const getDisplayCustomerId = (c: Customer) => {
        if (!c.id) return '#1001';
        if (c.id.includes('-')) {
            const lastPart = c.id.split('-').pop() || '';
            return '#' + lastPart.slice(-5).toUpperCase();
        }
        const clean = c.id.replace(/[^a-zA-Z0-9]/g, '');
        if (clean.length >= 5 && !c.id.includes('@')) {
            return '#' + clean.slice(-5).toUpperCase();
        }
        let hash = 0;
        const str = (c.email || c.phone || c.id).toLowerCase();
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return '#' + Math.abs(hash).toString(16).slice(-5).toUpperCase();
    };

    const handleDeleteCustomer = async () => {
        if (!customerToDelete) return;
        setIsDeletingCustomer(true);

        const targetEmail = (customerToDelete.email || '').toLowerCase().trim();
        const targetId = String(customerToDelete.id || '');
        const targetPhone = (customerToDelete.phone || '').replace(/[^0-9]/g, '');

        // 1. Optimistically update local state immediately
        setCustomers(prev => prev.filter(c => {
            const cEmail = (c.email || '').toLowerCase().trim();
            const cPhone = (c.phone || '').replace(/[^0-9]/g, '');
            if (targetEmail && cEmail === targetEmail) return false;
            if (targetId && String(c.id) === targetId) return false;
            if (targetPhone && cPhone && cPhone === targetPhone) return false;
            return true;
        }));

        try {
            const saved = localStorage.getItem('glowbook_salon') || sessionStorage.getItem('glowbook_salon');
            let localSalonId = '';
            if (saved) {
                const data = JSON.parse(saved);
                localSalonId = data.id || data.salonId || '';

                if (Array.isArray(data.customers)) {
                    data.customers = data.customers.filter((c: any) => {
                        const cEmail = (c.email || '').toLowerCase().trim();
                        const cPhone = (c.phone || '').replace(/[^0-9]/g, '');
                        return String(c.id) !== targetId &&
                            (!targetEmail || cEmail !== targetEmail) &&
                            (!targetPhone || !cPhone || cPhone !== targetPhone);
                    });
                }
                if (Array.isArray(data.appointments)) {
                    data.appointments = data.appointments.filter((apt: any) => {
                        const aptEmail = (apt.customer_email || apt.clientEmail || '').toLowerCase().trim();
                        const aptPhone = (apt.customer_phone || apt.clientPhone || '').replace(/[^0-9]/g, '');
                        return (!targetEmail || aptEmail !== targetEmail) &&
                            (!targetPhone || !aptPhone || aptPhone !== targetPhone) &&
                            String(apt.id) !== targetId;
                    });
                }

                if (!Array.isArray(data.availability)) data.availability = [];
                const hiddenBlock = data.availability.find((a: any) => a && a.type === 'hidden_customers') || {
                    type: 'hidden_customers',
                    emails: [],
                    ids: [],
                    phones: []
                };
                if (targetEmail) {
                    hiddenBlock.emails = Array.from(new Set([...(hiddenBlock.emails || []), targetEmail])).filter(Boolean);
                }
                if (targetId) {
                    hiddenBlock.ids = Array.from(new Set([...(hiddenBlock.ids || []), targetId])).filter(Boolean);
                }
                if (targetPhone) {
                    hiddenBlock.phones = Array.from(new Set([...(hiddenBlock.phones || []), targetPhone])).filter(Boolean);
                }
                data.availability = [
                    ...data.availability.filter((a: any) => a && a.type !== 'hidden_customers'),
                    hiddenBlock
                ];

                localStorage.setItem('glowbook_salon', JSON.stringify(data));
                sessionStorage.setItem('glowbook_salon', JSON.stringify(data));
            }

            // 2. Persist deletion in database
            if (localSalonId) {
                await fetch('/api/salons/customers', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        salonId: localSalonId,
                        email: targetEmail,
                        customerId: targetId,
                        phone: targetPhone
                    })
                });
            }

            setCustomerToDelete(null);
        } catch (error) {
            console.error('Kunde inte ta bort kunden:', error);
        } finally {
            setIsDeletingCustomer(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <PermissionGate allowedRoles={['salon_owner', 'practitioner', 'admin']}>
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
                <div className="space-y-1.5 pb-3 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C2A26A]">
                            Kundregister & Journal
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.05] text-neutral-400 border border-white/[0.06]">
                            {customers.length} {customers.length === 1 ? 'kund' : 'kunder'}
                        </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 
                                className="text-2xl sm:text-3xl font-normal text-white tracking-tight"
                                style={{ fontFamily: 'var(--font-cormorant), "Cormorant Garamond", Georgia, serif' }}
                            >
                                Kunder & Journal
                            </h1>
                            <p className="text-xs text-neutral-400 mt-0.5">
                                Dina kunder sparas automatiskt vid bokning. Lägg till eller sök efter kunder i ditt register.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsInviteModalOpen(true)}
                            className="px-4 py-2.5 rounded-xl bg-[#C2A26A] hover:bg-[#DFCA9B] text-[#0B0B0C] text-xs font-semibold tracking-wide uppercase transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 shrink-0"
                        >
                            <UserPlus size={15} /> Lägg till ny kund
                        </button>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="bg-[#111114] p-3 rounded-2xl shadow-sm border border-white/[0.08] flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                        <input
                            type="text"
                            placeholder="Sök på namn, e-post eller telefonnummer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/[0.03] pl-10 pr-4 py-2.5 rounded-xl border border-white/[0.06] focus:border-[#C2A26A] outline-none transition-all text-xs text-white placeholder:text-neutral-500 font-normal"
                        />
                    </div>
                    <button className="flex items-center justify-center gap-2 px-4 py-2.5 text-neutral-400 hover:text-white hover:bg-white/[0.04] rounded-xl transition-all border border-white/[0.06] text-xs font-medium">
                        <Filter size={15} /> Filter
                    </button>
                </div>

                {/* Customer Content */}
                {filteredCustomers.length === 0 ? (
                    <div className="bg-[#111114] rounded-2xl sm:rounded-3xl border border-dashed border-white/[0.1] p-12 sm:p-16 text-center flex flex-col items-center justify-center space-y-4">
                        <div className="w-14 h-14 bg-[#C2A26A]/10 text-[#C2A26A] rounded-full flex items-center justify-center">
                            <Users size={26} />
                        </div>
                        <div className="space-y-1.5 max-w-sm">
                            <h2 className="text-base font-semibold text-white">Inga kunder hittades</h2>
                            <p className="text-neutral-400 text-xs">
                                {searchTerm 
                                    ? "Din sökning matchade inte någon kund i registret. Försök med en annan sökning." 
                                    : "Registret är tomt just nu. Kunder läggs automatiskt till här så fort de genomför sin första bokning!"}
                            </p>
                        </div>
                        {!searchTerm && (
                            <button
                                onClick={() => setIsInviteModalOpen(true)}
                                className="bg-[#C2A26A] hover:bg-[#DFCA9B] text-[#0B0B0C] px-5 py-2.5 rounded-xl font-semibold text-xs tracking-wide uppercase transition-all shadow-md active:scale-95"
                            >
                                Lägg till första kunden
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-[#111114] rounded-2xl sm:rounded-3xl border border-white/[0.08] overflow-hidden shadow-sm">
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            <table className="w-full text-left border-collapse min-w-[700px] lg:min-w-[760px]">
                                <thead className="bg-white/[0.02] border-b border-white/[0.06]">
                                    <tr>
                                        <th className="px-4 sm:px-5 py-3 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Namn</th>
                                        <th className="px-3 sm:px-4 py-3 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">E-post</th>
                                        <th className="px-3 sm:px-4 py-3 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Telefon</th>
                                        <th className="px-3 sm:px-4 py-3 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">Senaste besök</th>
                                        <th className="px-2 sm:px-3 py-3 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider text-center whitespace-nowrap">Bokningar</th>
                                        <th className="px-2 sm:px-3 py-3 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider text-center whitespace-nowrap">Avbokningar</th>
                                        <th className="px-3 sm:px-4 py-3 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider text-center">Status</th>
                                        <th className="px-3 sm:px-4 py-3 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider text-center w-14">Åtgärd</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.05]">
                                    {filteredCustomers.map(c => (
                                        <tr key={c.id || c.email} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-[#C2A26A]/15 text-[#DFCA9B] font-bold flex items-center justify-center text-xs shrink-0 border border-[#C2A26A]/30">
                                                        {(c.firstName[0] || '').toUpperCase()}{(c.lastName[0] || '').toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="font-medium text-white block text-xs sm:text-sm truncate">
                                                            {c.firstName} {c.lastName}
                                                        </span>
                                                        <span className="text-[10px] text-neutral-400 font-medium">
                                                            KundID: {getDisplayCustomerId(c)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 sm:px-4 py-3 sm:py-3.5 text-xs text-neutral-300 font-normal">
                                                <span className="truncate block max-w-[150px] sm:max-w-[200px]" title={c.email}>
                                                    {c.email || '-'}
                                                </span>
                                            </td>
                                            <td className="px-3 sm:px-4 py-3 sm:py-3.5 text-xs text-neutral-300 font-normal whitespace-nowrap">
                                                {c.phone || '-'}
                                            </td>
                                            <td className="px-3 sm:px-4 py-3 sm:py-3.5 text-xs text-neutral-300 font-normal whitespace-nowrap">
                                                {c.lastVisit !== '-' ? (
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar size={12} className="text-[#C2A26A]" />
                                                        {c.lastVisit}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-3.5 text-xs font-semibold text-center whitespace-nowrap">
                                                <span className="inline-block px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20 text-xs">
                                                    {c.totalBookings}
                                                </span>
                                            </td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-3.5 text-xs font-semibold text-center whitespace-nowrap">
                                                <span className={clsx(
                                                    "inline-block px-2 py-0.5 rounded-md text-xs",
                                                    c.totalCancellations > 0 
                                                        ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                                                        : "bg-white/[0.04] text-neutral-400 border border-white/[0.06]"
                                                )}>
                                                    {c.totalCancellations}
                                                </span>
                                            </td>
                                            <td className="px-3 sm:px-4 py-3 sm:py-3.5 text-center">
                                                <span className="inline-block px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-semibold uppercase tracking-wider">
                                                    Aktiv
                                                </span>
                                            </td>
                                            <td className="px-3 sm:px-4 py-3 sm:py-3.5 text-center w-14">
                                                <button
                                                    type="button"
                                                    onClick={() => setCustomerToDelete(c)}
                                                    title="Ta bort från kundöversikt"
                                                    className="w-8 h-8 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-white/[0.05] transition-colors inline-flex items-center justify-center cursor-pointer"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
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

                {/* Delete Confirmation Modal */}
                <AnimatePresence>
                    {customerToDelete && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => !isDeletingCustomer && setCustomerToDelete(null)}
                                className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] sm:w-[440px] bg-[#141417] border border-white/[0.1] shadow-2xl rounded-3xl z-[101] overflow-hidden flex flex-col p-6"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mb-4 border border-red-500/20">
                                    <Trash2 size={22} />
                                </div>
                                <h3 className="text-base font-semibold text-white">Ta bort kund från listan?</h3>
                                <p className="text-neutral-400 text-xs mt-2 leading-relaxed">
                                    Vill du ta bort <strong className="text-white font-medium">{customerToDelete.firstName} {customerToDelete.lastName}</strong> ({customerToDelete.email || customerToDelete.phone}) från din salongs kundöversikt?
                                </p>
                                <div className="mt-4 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[11px] text-neutral-400 leading-relaxed">
                                    Detta rensar kunden från din salongs kundregister (lämpligt för att rensa bort spam och testkonton). Kundens eventuella personliga profil och lojalitetspoäng påverkas inte.
                                </div>

                                <div className="flex items-center gap-3 mt-6">
                                    <button
                                        type="button"
                                        disabled={isDeletingCustomer}
                                        onClick={() => setCustomerToDelete(null)}
                                        className="flex-1 py-3 px-4 rounded-xl border border-white/[0.08] font-semibold text-xs uppercase tracking-wider text-neutral-300 hover:text-white hover:bg-white/[0.04] transition-all disabled:opacity-50 cursor-pointer"
                                    >
                                        Avbryt
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isDeletingCustomer}
                                        onClick={handleDeleteCustomer}
                                        className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        {isDeletingCustomer ? 'Tar bort...' : 'Ja, ta bort'}
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </PermissionGate>
    );
}
