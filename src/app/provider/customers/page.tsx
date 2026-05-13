
'use client';

import { useState } from "react";
import { Search, UserPlus, Mail, Phone, Calendar, MoreVertical, Filter, Users, X, Check } from "lucide-react";
import clsx from "clsx";
import Header from "@/components/layout/Header";
import { motion, AnimatePresence } from "framer-motion";

// Mock Toggle for testing
const HAS_CUSTOMERS = false;

export default function CustomersPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteSent, setInviteSent] = useState(false);

    const customers = HAS_CUSTOMERS ? [
        { id: '1', firstName: 'Anna', lastName: 'Svensson', phone: '070-123 45 67', email: 'anna@example.com', lastVisit: '2024-02-10', totalBookings: 12, status: 'Active' },
        { id: '2', firstName: 'Maria', lastName: 'Karlsson', phone: '072-987 65 43', email: 'maria@example.com', lastVisit: '2024-01-25', totalBookings: 5, status: 'Active' },
    ] : [];

    const handleInviteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setInviteSent(true);
        setTimeout(() => {
            setInviteSent(false);
            setIsInviteModalOpen(false);
            setInviteEmail('');
        }, 3000);
    };

    const filteredCustomers = customers.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    );

    return (
        <div className="min-h-screen bg-champagne-50">
            <Header />
            <main className="max-w-7xl mx-auto px-6 pt-24 pb-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
                    <div>
                        <h1 className="text-3xl font-heading font-bold text-premium-black">Kundregister</h1>
                        <p className="text-gray-500">Bjud in nya kunder eller hantera dina befintliga.</p>
                    </div>
                    <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="bg-premium-black text-white px-6 py-3 rounded-full font-medium flex items-center gap-2 hover:bg-champagne-600 transition-colors w-fit"
                    >
                        <UserPlus size={18} /> Bjud in kund
                    </button>
                </div>

                {/* Filters and Search */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-champagne-100 flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Sök på namn eller telefon..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-100 focus:border-champagne-500 outline-none transition-all"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:bg-gray-50 rounded-xl transition-colors border border-gray-100">
                        <Filter size={18} /> Filter
                    </button>
                </div>

                {/* Customer Content */}
                {customers.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-dashed border-champagne-300 p-20 text-center">
                        <div className="w-20 h-20 bg-champagne-50 text-champagne-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Users size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-premium-black mb-2">Inga kunder än</h2>
                        <p className="text-gray-500 max-w-sm mx-auto mb-8">
                            Ditt kundregister är tomt. Genom att bjuda in kunder via mail kan de snabbt och enkelt bli en del av ditt system.
                        </p>
                        <button
                            onClick={() => setIsInviteModalOpen(true)}
                            className="bg-premium-black text-white px-8 py-3 rounded-full font-bold hover:bg-champagne-600 transition-colors"
                        >
                            Skicka första inbjudan
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-champagne-100 overflow-hidden">
                        {/* ... table content remains ... */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Namn</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Telefon</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Åtgärder</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCustomers.map(c => (
                                        <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="px-6 py-4 font-medium">{c.firstName} {c.lastName}</td>
                                            <td className="px-6 py-4 text-gray-500">{c.phone}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                                    <MoreVertical size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Invite Modal */}
                <AnimatePresence>
                    {isInviteModalOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsInviteModalOpen(false)}
                                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-[101] overflow-hidden"
                            >
                                <div className="bg-premium-black p-6 flex justify-between items-center text-white">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <Mail size={20} className="text-champagne-400" /> Bjud in kund
                                    </h3>
                                    <button onClick={() => setIsInviteModalOpen(false)} className="text-white/50 hover:text-white transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleInviteSubmit} className="p-8 space-y-6">
                                    {inviteSent ? (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="text-center py-4"
                                        >
                                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-green-100">
                                                <Check size={32} strokeWidth={3} />
                                            </div>
                                            <h4 className="text-xl font-bold text-premium-black mb-1">Inbjudan skickad!</h4>
                                            <p className="text-gray-500 text-sm">Ett mail har skickats till {inviteEmail}.</p>
                                        </motion.div>
                                    ) : (
                                        <>
                                            <p className="text-sm text-gray-500">
                                                Skriv in kundens e-postadress nedan för att skicka en inbjudan till din salong via Glowbook.
                                            </p>
                                            <div>
                                                <label className="block text-sm font-bold text-premium-black mb-2">Kundens E-post *</label>
                                                <input
                                                    required
                                                    type="email"
                                                    value={inviteEmail}
                                                    onChange={(e) => setInviteEmail(e.target.value)}
                                                    placeholder="namn@exempel.se"
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-champagne-500 outline-none transition-all"
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                className="w-full bg-premium-black text-white py-4 rounded-xl font-bold hover:bg-champagne-600 transition-all shadow-lg flex items-center justify-center gap-2"
                                            >
                                                Skicka inbjudan <Check size={18} />
                                            </button>
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
