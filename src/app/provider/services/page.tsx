'use client';

import { useState, useEffect } from "react";
import { Plus, Search, Clock, DollarSign, Edit, Trash2, Camera, Image as ImageIcon, X, Check, Save, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";

// Services are stored per-provider and added manually
const MOCK_SERVICES: { id: string, name: string, price: number, duration: number, description: string }[] = [];

// Suggestions by Category (Keys should match CATEGORIES in onboarding)
const SUGGESTIONS: Record<string, { name: string, price: number, duration: number }[]> = {
    "Naglar": [
        { name: 'Gellack Nytt set', price: 550, duration: 90 },
        { name: 'Gellack Återbesök', price: 450, duration: 75 },
        { name: 'Nagelförlängning Naturell', price: 750, duration: 120 },
    ],
    "Fransar & Bryn": [
        { name: 'Volymfransar Nytt set', price: 950, duration: 120 },
        { name: 'Singelfransar Nytt set', price: 750, duration: 90 },
        { name: 'Lashlift inkl. färg', price: 650, duration: 60 },
    ],
    "Hudvård": [
        { name: 'Ansiktsbehandling Lyx', price: 1250, duration: 90 },
        { name: 'Kemisk Peeling', price: 850, duration: 45 },
        { name: 'Microneedling', price: 1500, duration: 60 },
    ],
    "Tatuering": [
        { name: 'Tatuering Liten (5x5cm)', price: 1200, duration: 60 },
        { name: 'Tatuering Medium', price: 2500, duration: 120 },
        { name: 'Dagsittning', price: 6500, duration: 420 },
    ],
    "Hårvård": [
        { name: 'Klippning Dam', price: 650, duration: 60 },
        { name: 'Klippning Herr', price: 450, duration: 45 },
        { name: 'Färg & Slingor', price: 1800, duration: 150 },
    ],
    "Massage": [
        { name: 'Klassisk Massage 60 min', price: 750, duration: 60 },
        { name: 'Idrottsmassage', price: 850, duration: 60 },
        { name: 'Aromamassage', price: 950, duration: 75 },
    ],
    "Estetisk Injektion": [
        { name: 'Botox 1 område', price: 2500, duration: 30 },
        { name: 'Filler Läppar 1ml', price: 3500, duration: 45 },
        { name: 'Skinbooster 1 behandling', price: 2800, duration: 45 },
    ],
    "Spa": [
        { name: 'Spapaket Heldag', price: 1800, duration: 360 },
        { name: 'Hamam behandling', price: 950, duration: 90 },
        { name: 'Bodyscrub inkl. massage', price: 1200, duration: 90 },
    ],
    "Makeup": [
        { name: 'Festsminkning', price: 850, duration: 60 },
        { name: 'Brudsminkning', price: 1500, duration: 90 },
        { name: 'Makeup rådgivning', price: 600, duration: 45 },
    ],
    "Fotvård": [
        { name: 'Medicinsk fotvård', price: 650, duration: 60 },
        { name: 'Pedikyr Lyx', price: 850, duration: 75 },
        { name: 'Fotmassage 30 min', price: 450, duration: 30 },
    ],
    "Kiropraktik": [
        { name: 'Nybesök Kiropraktik', price: 850, duration: 40 },
        { name: 'Kiropraktisk behandling', price: 650, duration: 25 },
        { name: 'Akut behandling', price: 950, duration: 30 },
    ],
    "Naprapati": [
        { name: 'Nybesök Naprapati', price: 850, duration: 40 },
        { name: 'Naprapatbehandling', price: 650, duration: 30 },
        { name: 'Stötvågsbehandling', price: 750, duration: 20 },
    ],
    "Tandblekning": [
        { name: 'Tandblekning Brilliant', price: 2500, duration: 90 },
        { name: 'Tandblekning Touch-up', price: 1200, duration: 45 },
        { name: 'Konsultation', price: 0, duration: 15 },
    ],
    "Piercing": [
        { name: 'Öronpiercing (x2)', price: 450, duration: 15 },
        { name: 'Näs/Navel piercing', price: 550, duration: 20 },
        { name: 'Smyckesbyte', price: 150, duration: 10 },
    ],
    "Barberare": [
        { name: 'Klipp & Skäggtrim', price: 850, duration: 75 },
        { name: 'Klassisk rakning m. kniv', price: 550, duration: 45 },
        { name: 'Skäggfärgning', price: 350, duration: 30 },
    ]
};

// Placeholders by Category
const PLACEHOLDERS: Record<string, string> = {
    "Naglar": "T.ex. Gellack Nytt set",
    "Fransar & Bryn": "T.ex. Volymfransar Nytt set",
    "Hudvård": "T.ex. Ansiktsbehandling Lyx",
    "Tatuering": "T.ex. Tatuering Liten (5x5cm)",
    "Hårvård": "T.ex. Klippning & Föning",
    "Massage": "T.ex. Klassisk Massage 60 min",
    "Estetisk Injektion": "T.ex. Botox 1 område",
    "Spa": "T.ex. Spapaket Heldag",
    "Makeup": "T.ex. Festsminkning",
    "Fotvård": "T.ex. Medicinsk fotvård",
    "Kiropraktik": "T.ex. Ryggjustering",
    "Naprapati": "T.ex. Ledmobilisering",
    "Tandblekning": "T.ex. Klinisk blekning",
    "Piercing": "T.ex. Helix Piercing",
    "Barberare": "T.ex. Trim & Rakning",
};

export default function ServicesPage() {
    const { t, currency } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [category, setCategory] = useState('Naglar');
    const [services, setServices] = useState<{ id: string, name: string, price: number, sale_price?: number | null, sale_ends_at?: string | null, duration: number, description: string, category?: string }[]>([]);
    const [salonProfile, setSalonProfile] = useState<{ profile: string | null, background: string | null }>({
        profile: null,
        background: null
    });
    const [editingService, setEditingService] = useState<{ id: string, name: string, price: string, duration: string, description: string, category?: string } | null>(null);
    const [newService, setNewService] = useState({
        name: '',
        price: '',
        salePrice: '',
        saleEndsAt: '',
        duration: '',
        description: '',
        category: '',
        practitionerIds: [] as string[]
    });
    const [salonTier, setSalonTier] = useState('bas');

    const NICHE_TO_CATEGORIES: Record<string, string[]> = {
        "Naglar": ['Nagelterapeut', 'Övrigt'],
        "Fransar & Bryn": ['Fransstylist', 'Brow stylist', 'Övrigt'],
        "Hudvård": ['Hudterapeut', 'Lasertekniker', 'Övrigt'],
        "Hårvård": ['Frisör', 'Barberare', 'Övrigt'],
        "Barberare": ['Barberare', 'Frisör', 'Övrigt'],
        "Massage": ['Massör', 'Övrigt'],
        "Makeup": ['Makeup-artist', 'Övrigt'],
        "Tatuerare": ['Tatuerare', 'Övrigt'],
        "Fotvård": ['Fotvårdsterapeut', 'Övrigt'],
        "Estetisk Injektion": ['Sjuksköterska', 'Läkare', 'Lasertekniker', 'Övrigt']
    };

    const getAvailableCategories = () => {
        if (salonTier === 'bas') return availableCategories.length > 0 ? availableCategories : [category];
        return NICHE_TO_CATEGORIES[category] || [category, 'Övrigt'];
    };

    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Save salon profile changes
    const updateSalonData = (updates: any) => {
        const saved = localStorage.getItem('glowbook_salon');
        const data = saved ? JSON.parse(saved) : {};
        const newData = { ...data, ...updates };
        localStorage.setItem('glowbook_salon', JSON.stringify(newData));
    };

    const handleGlobalSave = async () => {
        setIsSaving(true);
        setSaveStatus('idle');
        try {
            const saved = localStorage.getItem('glowbook_salon');
            const baseData = saved ? JSON.parse(saved) : {};

            // MERGE: Take what's in localStorage BUT overwrite with current page state
            const payload = {
                ...baseData,
                id: baseData.id && baseData.id !== 'undefined' ? baseData.id : 'luxe-by-essi',
                services: services, // Current state services
                practitioners: practitioners // Current state practitioners
            };

            const response = await fetch('/api/salons/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setSaveStatus('success');
                // Ensure localStorage is also updated to avoid mismatches
                localStorage.setItem('glowbook_salon', JSON.stringify(payload));
                setTimeout(() => setSaveStatus('idle'), 3000);
            } else {
                setSaveStatus('error');
            }
        } catch (error) {
            console.error('Failed to save services:', error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    // Load data on mount
    useEffect(() => {
        const saved = localStorage.getItem('glowbook_salon');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.category) {
                // Safely handle if category is an array (new format)
                const mainCategory = Array.isArray(data.category) ? data.category[0] : data.category;
                setCategory(mainCategory);
                setNewService(prev => ({ ...prev, category: mainCategory }));
            }
            if (data.services) setServices(data.services);
            if (data.profileImage) setSalonProfile(prev => ({ ...prev, profile: data.profileImage }));
            if (data.backgroundImage) setSalonProfile(prev => ({ ...prev, background: data.backgroundImage }));
            if (data.tier) setSalonTier(data.tier.toLowerCase());
            // Collect all available categories from main category + practitioners
            const allPossibleCats = Array.from(new Set([
                ...(Array.isArray(data.category) ? data.category : (data.category ? [data.category] : [])),
                ...(data.categories || []),
                ...(data.practitioners?.flatMap((p: any) => p.categories || []) || [])
            ])).filter(Boolean);
            setAvailableCategories(allPossibleCats as string[]);
            if (data.practitioners) setPractitioners(data.practitioners);
        }
    }, []);

    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [practitioners, setPractitioners] = useState<any[]>([]);

    const [discountType, setDiscountType] = useState<'price' | 'amount' | 'percent'>('amount');
    const [discountValue, setDiscountValue] = useState('');

    const calculateSalePrice = (type: 'price' | 'amount' | 'percent', value: string, basePrice: string) => {
        const base = Number(basePrice);
        const val = Number(value);
        if (!base || !val) return '';

        if (type === 'price') return value;
        if (type === 'amount') return Math.max(0, base - val).toString();
        if (type === 'percent') return Math.max(0, base * (1 - val / 100)).toString();
        return '';
    };

    // Effect to sync salePrice when discount inputs change
    useEffect(() => {
        const calculated = calculateSalePrice(discountType, discountValue, newService.price);
        setNewService(prev => ({ ...prev, salePrice: calculated }));
    }, [discountType, discountValue, newService.price]);

    const handleAddService = (e: React.FormEvent) => {
        e.preventDefault();

        const serviceData = {
            id: editingService ? editingService.id : Date.now().toString(),
            name: newService.name,
            price: Number(newService.price),
            sale_price: newService.salePrice ? Number(newService.salePrice) : null,
            sale_ends_at: newService.saleEndsAt || null,
            duration: Number(newService.duration),
            description: newService.description,
            category: newService.category || category,
            practitionerIds: newService.practitionerIds
        };

        let updatedServices;
        if (editingService) {
            updatedServices = services.map(s => s.id === editingService.id ? serviceData : s);
        } else {
            updatedServices = [...services, serviceData];
        }

        setServices(updatedServices);
        updateSalonData({ services: updatedServices });

        setIsModalOpen(false);
        setEditingService(null);
        setNewService({ name: '', price: '', salePrice: '', saleEndsAt: '', duration: '', description: '', category: '', practitionerIds: [] });
        setDiscountValue('');
        setDiscountType('amount');
    };

    const handleEditClick = (s: any) => {
        setEditingService({
            id: s.id,
            name: s.name,
            price: s.price.toString(),
            duration: s.duration.toString(),
            description: s.description || '',
            category: s.category || category
        });
        setNewService({
            name: s.name,
            price: s.price.toString(),
            salePrice: s.sale_price ? s.sale_price.toString() : '',
            saleEndsAt: s.sale_ends_at || '',
            duration: s.duration.toString(),
            description: s.description || '',
            category: s.category || category,
            practitionerIds: s.practitionerIds || []
        });
        setDiscountType('amount');
        setDiscountValue(s.sale_price ? s.sale_price.toString() : '');
        setIsModalOpen(true);
    };

    const handleDeleteService = (id: string) => {
        const updatedServices = services.filter(s => s.id !== id);
        setServices(updatedServices);
        updateSalonData({ services: updatedServices });
    };

    const handleImageUpload = (type: 'profile' | 'background', file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setSalonProfile(prev => ({ ...prev, [type]: base64String }));
            updateSalonData({ [type === 'profile' ? 'profileImage' : 'backgroundImage']: base64String });
        };
        reader.readAsDataURL(file);
    };

    const currentSuggestions = SUGGESTIONS[category] || SUGGESTIONS["Naglar"];
    const currentPlaceholder = PLACEHOLDERS[category as keyof typeof PLACEHOLDERS] || PLACEHOLDERS["Naglar"];

    return (
        <div className="min-h-screen bg-background p-8 pt-24 md:pt-8 md:ml-64 transition-colors duration-300">
            <div className="max-w-6xl mx-auto space-y-12">


                {/* Services Section */}
                <section>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl font-heading font-bold text-foreground">{t('dash_nav_services') || 'Tjänster'}</h1>
                            <p className="text-foreground/50 text-sm">{t('dash_nav_services_desc') || 'Skapa och hantera de tjänster du erbjuder.'}</p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-black dark:bg-white text-white dark:text-black px-8 py-4 rounded-full font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-champagne-600 dark:hover:bg-champagne-600 hover:text-white transition-all w-fit shadow-2xl active:scale-95"
                        >
                            <Plus size={18} strokeWidth={3} /> {t('action_create_service') || 'Skapa ny tjänst'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {services.map(service => (
                            <div key={service.id} className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-bold text-foreground text-lg">{service.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleEditClick(service)}
                                            className="p-1.5 text-foreground/50 hover:text-blue-500 transition-colors"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteService(service.id)}
                                            className="p-1.5 text-foreground/50 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[9px] font-bold rounded-md uppercase tracking-wider">
                                        {(service as any).category || category}
                                    </span>
                                </div>
                                <p className="text-sm text-foreground/50 flex-1 mb-6 leading-relaxed">
                                    {service.description || "Ingen beskrivning angiven."}
                                </p>
                                <div className="flex items-center justify-between pt-4 border-t border-border text-sm font-medium">
                                    <div className="flex items-center gap-1.5 text-foreground/50">
                                        <Clock size={16} className="text-champagne-500" />
                                        {service.duration} min
                                    </div>
                                    <div className="text-foreground font-bold flex flex-col items-end">
                                        {service.sale_price && (!service.sale_ends_at || new Date(service.sale_ends_at) > new Date()) ? (
                                            <>
                                                <span className="text-[10px] text-red-500 line-through opacity-50">{service.price} {currency}</span>
                                                <span className="text-red-500">{service.sale_price} {currency}</span>
                                            </>
                                        ) : (
                                            <span>{service.price} {currency}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Floating Save Button */}
                <div className="fixed bottom-10 right-10 z-50">
                    <motion.button
                        layout
                        onClick={handleGlobalSave}
                        disabled={isSaving}
                        className={clsx(
                            "flex items-center gap-3 px-8 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-50",
                            saveStatus === 'success' 
                                ? "bg-emerald-500 text-white" 
                                : saveStatus === 'error'
                                ? "bg-red-500 text-white"
                                : "bg-[#111] dark:bg-white text-white dark:text-[#111] hover:bg-champagne-600 dark:hover:bg-champagne-600 dark:hover:text-white"
                        )}
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Sparar...
                            </>
                        ) : saveStatus === 'success' ? (
                            <>
                                <Check size={18} strokeWidth={3} />
                                Sparat!
                            </>
                        ) : saveStatus === 'error' ? (
                            <>
                                <X size={18} strokeWidth={3} />
                                Fel vid sparning
                            </>
                        ) : (
                            <>
                                <Check size={18} strokeWidth={3} />
                                Spara ändringar
                            </>
                        )}
                    </motion.button>
                </div>

                {/* Create Service Modal */}
                <AnimatePresence>
                    {isModalOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-background/50 backdrop-blur-sm z-[100]"
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setEditingService(null);
                                    setDiscountValue('');
                                    setDiscountType('price');
                                }}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-3xl shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[90vh]"
                            >
                                {/* Modal Header */}
                                <div className="p-8 border-b border-border flex items-center justify-between bg-card shrink-0">
                                    <div>
                                        <h3 className="text-xl font-bold text-foreground">
                                            {editingService ? 'Redigera tjänst' : 'Lägg till tjänst'}
                                        </h3>
                                        <p className="text-xs text-foreground/40 mt-1 uppercase font-bold tracking-widest">
                                            {editingService ? 'Uppdatera befintlig tjänst' : 'Skapa en ny tjänst för din salong'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsModalOpen(false);
                                                setEditingService(null);
                                                setNewService({ name: '', price: '', salePrice: '', saleEndsAt: '', duration: '', description: '', category: '', practitionerIds: [] });
                                                setDiscountValue('');
                                                setDiscountType('price');
                                            }}
                                            className="p-2 text-foreground/20 hover:text-foreground transition-colors"
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>
                                </div>

                                {/* Modal Body */}
                                <form id="service-form" onSubmit={handleAddService} className="contents">
                                    <div className="p-8 space-y-8 overflow-y-auto max-h-[calc(100vh-320px)] custom-scrollbar">
                                        {/* Suggestions for new services */}
                                        {!editingService && (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <label className="text-xs font-black uppercase tracking-widest text-foreground/40">
                                                        {t('label_niche_suggestions')} ({category})
                                                    </label>
                                                </div>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {currentSuggestions.slice(0, 3).map((s, i) => (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            onClick={() => setNewService({
                                                                name: s.name,
                                                                price: s.price.toString(),
                                                                duration: s.duration.toString(),
                                                                description: '',
                                                                category: category,
                                                                salePrice: '',
                                                                saleEndsAt: '',
                                                                practitionerIds: []
                                                            })}
                                                            className="flex items-center justify-between p-4 bg-background hover:bg-champagne-50/30 text-left rounded-2xl transition-all border border-border hover:border-champagne-200 group relative overflow-hidden"
                                                        >
                                                            <div className="absolute inset-0 bg-gradient-to-r from-champagne-100/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            <div className="relative z-10 flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center text-foreground/40 font-bold text-lg group-hover:scale-110 transition-transform">
                                                                    <DollarSign size={18} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-foreground">{s.name}</p>
                                                                    <p className="text-[10px] text-foreground/40">{s.duration} min • {s.price} {currency}</p>
                                                                </div>
                                                            </div>
                                                            <Plus size={14} className="text-foreground/20 group-hover:text-champagne-500 group-hover:rotate-90 transition-all" />
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="h-px bg-border/50 my-2" />
                                            </div>
                                        )}

                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-sm font-bold text-foreground mb-2">{t('label_service_name')} *</label>
                                                <input
                                                    required
                                                    type="text"
                                                    placeholder={currentPlaceholder}
                                                    value={newService.name}
                                                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:border-champagne-500 outline-none transition-all placeholder:text-foreground/20"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-foreground mb-2">Kategori *</label>
                                                <select
                                                    required
                                                    value={newService.category || category}
                                                    onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl border border-border focus:border-champagne-500 outline-none transition-all text-foreground appearance-none cursor-pointer bg-background"
                                                >
                                                    {getAvailableCategories().map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-bold text-foreground mb-2">{t('label_price')} ({currency}) *</label>
                                                    <div className="relative">
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 font-bold text-xs">{currency}</div>
                                                        <input
                                                            required
                                                            type="number"
                                                            placeholder="Pris"
                                                            value={newService.price}
                                                            onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground focus:border-champagne-500 outline-none transition-all placeholder:text-foreground/10"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-foreground mb-2">{t('label_time')} (minuter) *</label>
                                                    <div className="relative">
                                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50" size={16} />
                                                        <input
                                                            required
                                                            type="number"
                                                            placeholder="Tid"
                                                            value={newService.duration}
                                                            onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground focus:border-champagne-500 outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="border-t border-border pt-6 space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-foreground/5 rounded-lg flex items-center justify-center text-foreground/40"><DollarSign size={16} /></div>
                                                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/40">Rabatt & Kampanj</h4>
                                                    </div>
                                                    {(discountValue || newService.saleEndsAt) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setDiscountValue('');
                                                                setNewService(prev => ({ ...prev, salePrice: '', saleEndsAt: '' }));
                                                            }}
                                                            className="text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors uppercase tracking-wider"
                                                        >
                                                            Ta bort
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="flex bg-foreground/5 p-1 rounded-xl border border-border/50">
                                                    {(['amount', 'percent'] as const).map((t) => (
                                                        <button
                                                            key={t}
                                                            type="button"
                                                            onClick={() => {
                                                                setDiscountType(t);
                                                                setDiscountValue('');
                                                                setNewService(prev => ({ ...prev, salePrice: '' }));
                                                            }}
                                                            className={clsx(
                                                                "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                                                                discountType === t ? "bg-white dark:bg-[#222] text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/5" : "text-foreground/30 hover:text-foreground/50"
                                                            )}
                                                        >
                                                            {t === 'amount' ? `SEK` : '% Rabatt'}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.1em]">
                                                            {discountType === 'amount' ? 'Kr Av' : 'Procent (%)'}
                                                        </label>
                                                        <div className="relative group">
                                                            <input
                                                                type="number"
                                                                placeholder="0"
                                                                value={discountValue}
                                                                onChange={(e) => setDiscountValue(e.target.value)}
                                                                className="w-full px-5 py-4 rounded-2xl border border-border bg-foreground/[0.02] text-foreground focus:border-blue-500 outline-none transition-all font-bold"
                                                            />
                                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-foreground/20 font-black text-xs uppercase pointer-events-none">
                                                                {discountType === 'percent' ? '%' : currency}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.1em]">Gäller t.o.m</label>
                                                        <input
                                                            type="date"
                                                            value={newService.saleEndsAt}
                                                            onChange={(e) => setNewService({ ...newService, saleEndsAt: e.target.value })}
                                                            className="w-full px-5 py-4 rounded-2xl border border-border bg-foreground/[0.02] text-foreground focus:border-blue-500 outline-none transition-all font-bold"
                                                        />
                                                    </div>
                                                </div>

                                                {newService.salePrice && Number(newService.salePrice) < Number(newService.price) && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-[24px] flex items-center justify-between"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500">
                                                                <Check size={20} strokeWidth={3} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">Kundens pris</p>
                                                                <p className="text-xl font-black text-foreground">{Math.round(Number(newService.salePrice))} {currency}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] text-foreground/40 font-bold uppercase mb-1">Total Rabatt</p>
                                                            <div className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-emerald-500/20">
                                                                -{Math.round((1 - Number(newService.salePrice) / Number(newService.price)) * 100)}%
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-foreground mb-4">Vilka utför tjänsten? *</label>
                                                {practitioners.length > 0 ? (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {practitioners.map(p => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    const ids = newService.practitionerIds;
                                                                    setNewService({
                                                                        ...newService,
                                                                        practitionerIds: ids.includes(p.id)
                                                                            ? ids.filter(id => id !== p.id)
                                                                            : [...ids, p.id]
                                                                    });
                                                                }}
                                                                className={clsx(
                                                                    "px-4 py-4 rounded-2xl text-xs font-bold transition-all border flex items-center gap-3",
                                                                    newService.practitionerIds.includes(p.id)
                                                                        ? "bg-[#111] dark:bg-white text-white dark:text-[#111] border-transparent shadow-xl ring-4 ring-black/5 dark:ring-white/10"
                                                                        : "bg-foreground/5 text-foreground/40 border-border hover:border-foreground/20"
                                                                )}
                                                            >
                                                                <div className={clsx(
                                                                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                                                                    newService.practitionerIds.includes(p.id) ? "bg-emerald-500 text-white" : "bg-foreground/10 text-foreground/40"
                                                                )}>
                                                                    {newService.practitionerIds.includes(p.id) ? "✓" : p.name.charAt(0)}
                                                                </div>
                                                                {p.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/10">
                                                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                                                            Inga medarbetare tillagda än. Gå till Inställningar → Utförare.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-foreground mb-2">{t('label_description')} <span className="text-foreground/50 font-normal">{t('label_optional')}</span></label>
                                                <textarea
                                                    rows={3}
                                                    placeholder={t('placeholder_description')}
                                                    value={newService.description}
                                                    onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                                                    className="w-full px-5 py-4 rounded-2xl border border-border bg-foreground/[0.02] text-foreground focus:border-champagne-500 outline-none transition-all resize-none font-medium"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Modal Footer - Sticky */}
                                    <div className="p-8 border-t border-border bg-[#FBFBFA] dark:bg-[#0A0A0A] shrink-0">
                                        <button
                                            type="submit"
                                            className="w-full bg-[#111] dark:bg-white text-white dark:text-[#111] py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-champagne-600 hover:text-white transition-all shadow-2xl active:scale-95"
                                        >
                                            {t('btn_save_service') || 'Spara tjänst'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}
