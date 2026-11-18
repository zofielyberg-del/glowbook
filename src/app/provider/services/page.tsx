'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Search, Clock, DollarSign, Edit, Trash2, Camera, Image as ImageIcon, X, Check, Save, RefreshCw, CheckCircle2, XCircle, Package } from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { PermissionGate } from "@/components/auth/PermissionGate";

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
    const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
    const [customCategoryName, setCustomCategoryName] = useState('');

    const searchParams = useSearchParams();
    const currentTab = searchParams ? searchParams.get('tab') : null;
    const isProductsTab = currentTab === 'products';

    // Retail Products State & Handlers
    const [products, setProducts] = useState<any[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const saved = localStorage.getItem('glowbook_salon') || sessionStorage.getItem('glowbook_salon');
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.products || [];
            }
        } catch {}
        return [];
    });
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [productForm, setProductForm] = useState({
        name: '',
        brand: '',
        price: '',
        stock: '10',
        category: 'Eftervård',
        description: '',
        image: '',
        recommendation: '',
        ingredients: '',
        productUrl: ''
    });

    // Sync products from server on mount
    useEffect(() => {
        const saved = localStorage.getItem('glowbook_salon') || sessionStorage.getItem('glowbook_salon');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed.products) && parsed.products.length > 0) {
                    setProducts(parsed.products);
                }
                if (parsed.id) {
                    fetch(`/api/salons/get?id=${parsed.id}`)
                        .then(r => r.json())
                        .then(d => {
                            if (d.success && d.salon && Array.isArray(d.salon.products)) {
                                setProducts(d.salon.products);
                                const next = { ...parsed, products: d.salon.products };
                                localStorage.setItem('glowbook_salon', JSON.stringify(next));
                                sessionStorage.setItem('glowbook_salon', JSON.stringify(next));
                            }
                        })
                        .catch(() => {});
                }
            } catch {}
        }
    }, []);

    const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setProductForm(prev => ({ ...prev, image: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleEditProduct = (prod: any) => {
        setEditingProductId(prod.id);
        setProductForm({
            name: prod.name || '',
            brand: prod.brand || '',
            price: (prod.price ?? '').toString(),
            stock: (prod.stock ?? 10).toString(),
            category: prod.category || 'Eftervård',
            description: prod.description || '',
            image: prod.image || '',
            recommendation: (prod.recommendation || '').replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim(),
            ingredients: prod.ingredients || '',
            productUrl: prod.productUrl || ''
        });
        setIsProductModalOpen(true);
    };

    const handleUpdateStock = async (prodId: string, delta: number) => {
        const updated = products.map(p => {
            if (p.id === prodId) {
                const cur = typeof p.stock === 'number' ? p.stock : (parseInt(p.stock, 10) || 0);
                return { ...p, stock: Math.max(0, cur + delta) };
            }
            return p;
        });
        setProducts(updated);

        const saved = localStorage.getItem('glowbook_salon') || sessionStorage.getItem('glowbook_salon');
        if (saved) {
            const parsed = JSON.parse(saved);
            const next = { ...parsed, products: updated };
            localStorage.setItem('glowbook_salon', JSON.stringify(next));
            sessionStorage.setItem('glowbook_salon', JSON.stringify(next));
            window.dispatchEvent(new Event('glowbook_update'));

            const salonId = parsed.id || parsed.salonId;
            if (salonId) {
                try {
                    await fetch('/api/salons/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: salonId, products: updated })
                    });
                } catch (err) {
                    console.error('Failed to sync stock to DB:', err);
                }
            }
        }
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productForm.name || !productForm.price) return;

        let updated: any[];
        if (editingProductId) {
            updated = products.map(p => {
                if (p.id === editingProductId) {
                    return {
                        ...p,
                        name: productForm.name.trim(),
                        brand: productForm.brand?.trim() || '',
                        price: Number(productForm.price),
                        stock: Math.max(0, Number(productForm.stock || 0)),
                        category: productForm.category?.trim() || 'Eftervård',
                        description: productForm.description?.trim() || '',
                        image: productForm.image || p.image || '',
                        recommendation: (productForm.recommendation || '').replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim(),
                        ingredients: productForm.ingredients?.trim() || '',
                        productUrl: productForm.productUrl?.trim() || ''
                    };
                }
                return p;
            });
        } else {
            const newProd = {
                id: Date.now().toString(),
                name: productForm.name.trim(),
                brand: productForm.brand?.trim() || '',
                price: Number(productForm.price),
                stock: Math.max(0, Number(productForm.stock || 1)),
                category: productForm.category?.trim() || 'Eftervård',
                description: productForm.description?.trim() || '',
                image: productForm.image || '',
                recommendation: (productForm.recommendation || '').replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim(),
                ingredients: productForm.ingredients?.trim() || '',
                productUrl: productForm.productUrl?.trim() || ''
            };
            updated = [...products, newProd];
        }

        setProducts(updated);

        const saved = localStorage.getItem('glowbook_salon') || sessionStorage.getItem('glowbook_salon');
        if (saved) {
            const parsed = JSON.parse(saved);
            const next = { ...parsed, products: updated };
            localStorage.setItem('glowbook_salon', JSON.stringify(next));
            sessionStorage.setItem('glowbook_salon', JSON.stringify(next));
            window.dispatchEvent(new Event('glowbook_update'));

            const salonId = parsed.id || parsed.salonId;
            if (salonId) {
                try {
                    await fetch('/api/salons/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: salonId, products: updated })
                    });
                } catch (err) {
                    console.error('Failed to sync products to DB:', err);
                }
            }
        }
        setEditingProductId(null);
        setProductForm({
            name: '',
            brand: '',
            price: '',
            stock: '10',
            category: 'Eftervård',
            description: '',
            image: '',
            recommendation: '',
            ingredients: '',
            productUrl: ''
        });
        setIsProductModalOpen(false);
    };

    const handleDeleteProduct = async (id: string) => {
        const updated = products.filter(p => p.id !== id);
        setProducts(updated);

        const saved = localStorage.getItem('glowbook_salon') || sessionStorage.getItem('glowbook_salon');
        if (saved) {
            const parsed = JSON.parse(saved);
            const next = { ...parsed, products: updated };
            localStorage.setItem('glowbook_salon', JSON.stringify(next));
            sessionStorage.setItem('glowbook_salon', JSON.stringify(next));
            window.dispatchEvent(new Event('glowbook_update'));

            const salonId = parsed.id || parsed.salonId;
            if (salonId) {
                try {
                    await fetch('/api/salons/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: salonId, products: updated })
                    });
                } catch (err) {
                    console.error('Failed to sync delete products to DB:', err);
                }
            }
        }
    };

    const getAvailableCategories = () => {
        const salonCategories = [
            ...(availableCategories || []),
            ...(category ? [category] : []),
        ].filter(Boolean);
        if (salonCategories.length > 0) {
            return Array.from(new Set(salonCategories));
        }
        const usedCategories = (services || []).map(s => s.category).filter(Boolean) as string[];
        return usedCategories.length > 0 ? Array.from(new Set(usedCategories)) : ['Övrigt'];
    };

    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Save salon profile changes
    const updateSalonData = (updates: any) => {
        const saved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
        const data = saved ? JSON.parse(saved) : {};
        const newData = { ...data, ...updates };
        localStorage.setItem('glowbook_salon', JSON.stringify(newData));
        sessionStorage.setItem('glowbook_salon', JSON.stringify(newData));
    };

    const autoSaveServices = async (updatedServices: any[]) => {
        setIsSaving(true);
        setSaveStatus('idle');
        try {
            const saved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
            const baseData = saved ? JSON.parse(saved) : {};

            if (!baseData.id || baseData.id === 'undefined') {
                setSaveStatus('error');
                setIsSaving(false);
                return;
            }

            const payload = {
                ...baseData,
                id: baseData.id,
                services: updatedServices,
                practitioners: practitioners
            };
            
            // Critical fix: Never send availability from the services tab to prevent overwriting with stale data
            delete payload.availability;

            // Update localStorage and sessionStorage instantly for fast UI
            localStorage.setItem('glowbook_salon', JSON.stringify(payload));
            sessionStorage.setItem('glowbook_salon', JSON.stringify(payload));

            const response = await fetch('/api/salons/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const resData = await response.json().catch(() => null);
                if (resData?.services && Array.isArray(resData.services)) {
                    const synced = resData.services.map((s: any) => ({
                        ...s,
                        duration: s.duration ?? s.duration_minutes ?? 30,
                        price: Number(s.price),
                        sale_price: s.sale_price !== null && s.sale_price !== undefined ? Number(s.sale_price) : null
                    }));
                    setServices(synced);
                    const nextStorage = { ...payload, services: synced };
                    localStorage.setItem('glowbook_salon', JSON.stringify(nextStorage));
                    sessionStorage.setItem('glowbook_salon', JSON.stringify(nextStorage));
                }
                setSaveStatus('success');
                // Trigger event to sync other pages
                window.dispatchEvent(new Event('glowbook_update'));
                setTimeout(() => setSaveStatus('idle'), 3000);
            } else {
                setSaveStatus('error');
            }
        } catch (error) {
            console.error('Failed to auto-save services:', error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    // Load data on mount
    useEffect(() => {
        const saved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
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

        const isLuxe = salonTier === 'luxe';
        const finalPractitioners = isLuxe && newService.practitionerIds.length > 0
            ? newService.practitionerIds
            : ['owner'];

        const serviceCategory = showCustomCategoryInput
            ? customCategoryName.trim()
            : (newService.category || category || 'Övrigt');

        const serviceData = {
            id: editingService ? editingService.id : Date.now().toString(),
            name: newService.name,
            price: Number(newService.price),
            sale_price: newService.salePrice ? Number(newService.salePrice) : null,
            sale_ends_at: newService.saleEndsAt || null,
            duration: Number(newService.duration),
            description: newService.description,
            category: serviceCategory,
            practitionerIds: finalPractitioners
        };

        let updatedServices;
        if (editingService) {
            updatedServices = services.map(s => s.id === editingService.id ? serviceData : s);
        } else {
            updatedServices = [...services, serviceData];
        }

        setServices(updatedServices);
        autoSaveServices(updatedServices);

        setIsModalOpen(false);
        setEditingService(null);
        setNewService({ name: '', price: '', salePrice: '', saleEndsAt: '', duration: '', description: '', category: category || availableCategories[0] || '', practitionerIds: [] });
        setDiscountValue('');
        setDiscountType('amount');
        setShowCustomCategoryInput(false);
        setCustomCategoryName('');
    };

    const handleEditClick = (s: any) => {
        const serviceCategory = s.category || category;
        const isCustom = serviceCategory ? !getAvailableCategories().includes(serviceCategory) : false;
        setEditingService({
            id: s.id,
            name: s.name,
            price: s.price.toString(),
            duration: s.duration.toString(),
            description: s.description || '',
            category: serviceCategory
        });
        setNewService({
            name: s.name,
            price: s.price.toString(),
            salePrice: s.sale_price ? s.sale_price.toString() : '',
            saleEndsAt: s.sale_ends_at || '',
            duration: s.duration.toString(),
            description: s.description || '',
            category: serviceCategory,
            practitionerIds: s.practitionerIds || []
        });
        if (isCustom) {
            setShowCustomCategoryInput(true);
            setCustomCategoryName(serviceCategory);
        } else {
            setShowCustomCategoryInput(false);
            setCustomCategoryName('');
        }
        setDiscountType('price');
        setDiscountValue(s.sale_price ? s.sale_price.toString() : '');
        setIsModalOpen(true);
    };

    const handleDeleteService = (id: string) => {
        const updatedServices = services.filter(s => s.id !== id);
        setServices(updatedServices);
        autoSaveServices(updatedServices);
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
        <PermissionGate allowedRoles={['salon_owner', 'practitioner', 'admin']}>
            <div className="p-5 sm:p-8 lg:p-10 max-w-7xl mx-auto space-y-8">
                
                {/* Header & Sub-Tabs */}
                <div className="space-y-4 pb-4 border-b border-white/[0.06]">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C2A26A]">
                                Utbud & Meny
                            </span>
                        </div>
                        <h1 
                            className="text-3xl sm:text-4xl font-normal text-white tracking-tight"
                            style={{ fontFamily: 'var(--font-cormorant), "Cormorant Garamond", Georgia, serif' }}
                        >
                            {isProductsTab ? 'Produkter & Eftervård' : 'Tjänster & Behandlingar'}
                        </h1>
                        <p className="text-xs text-neutral-400 mt-1">
                            {isProductsTab 
                                ? 'Hantera dina eftervårdsprodukter och produkter till försäljning i salongen.' 
                                : 'Skapa och redigera behandlingar, priser och tider som dina kunder kan boka.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <Link
                            href="/provider/services"
                            className={clsx(
                                "px-4 py-2 rounded-xl text-xs font-medium transition-all",
                                !isProductsTab
                                    ? "bg-white/[0.08] text-[#DFCA9B] border border-white/[0.1]"
                                    : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                            )}
                        >
                            Tjänster ({services.length})
                        </Link>
                        <Link
                            href="/provider/services?tab=products"
                            className={clsx(
                                "px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2",
                                isProductsTab
                                    ? "bg-white/[0.08] text-[#DFCA9B] border border-white/[0.1]"
                                    : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                            )}
                        >
                            <Package size={14} />
                            <span>Produkter & Eftervård ({products.length})</span>
                        </Link>
                    </div>
                </div>

                {/* Products View */}
                {isProductsTab ? (
                    <section className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-base font-medium text-white">Produktsortiment & Eftervård</h2>
                                <p className="text-xs text-neutral-400">Lägg till produkter som kunder kan köpa i samband med sitt besök.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingProductId(null);
                                    setProductForm({
                                        name: '',
                                        brand: '',
                                        price: '',
                                        stock: '10',
                                        category: category || 'Eftervård',
                                        description: '',
                                        image: '',
                                        recommendation: '',
                                        ingredients: '',
                                        productUrl: ''
                                    });
                                    setIsProductModalOpen(true);
                                }}
                                className="px-5 py-2.5 rounded-xl bg-[#C2A26A] hover:bg-[#DFCA9B] text-[#0B0B0C] text-xs font-semibold tracking-wide uppercase transition-all shadow-md active:scale-95 flex items-center gap-2"
                            >
                                <Plus size={16} /> Lägg till produkt
                            </button>
                        </div>

                        {products.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {products.map((prod) => (
                                    <div key={prod.id} className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-3 flex flex-col justify-between overflow-hidden">
                                        <div>
                                            {prod.image && (
                                                <div className="w-full h-36 rounded-xl overflow-hidden bg-black/40 mb-3 border border-white/[0.05]">
                                                    <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider bg-white/[0.05] text-[#DFCA9B] border border-white/[0.08]">
                                                        {prod.category || 'Eftervård'}
                                                    </span>
                                                    {prod.brand && (
                                                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-[#C2A26A]/15 text-[#DFCA9B] border border-[#C2A26A]/30">
                                                            {prod.brand}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleEditProduct(prod)}
                                                        className="p-1.5 text-neutral-400 hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]"
                                                        title="Redigera produkt"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteProduct(prod.id)}
                                                        className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors rounded-lg hover:bg-white/[0.05]"
                                                        title="Ta bort produkt"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <h3 className="text-sm font-medium text-white mt-2">{prod.name}</h3>
                                            {prod.recommendation && (
                                                <p className="text-[11px] text-[#C2A26A] mt-1 italic">
                                                    {prod.recommendation.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim()}
                                                </p>
                                            )}
                                            {prod.description && (
                                                <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{prod.description}</p>
                                            )}
                                            {prod.ingredients && (
                                                <div className="mt-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[10px] text-neutral-400">
                                                    <span className="text-[#DFCA9B] font-semibold uppercase tracking-wider text-[9px] block mb-0.5">Innehåll & INCI</span>
                                                    <p className="line-clamp-2">{prod.ingredients}</p>
                                                </div>
                                            )}
                                            {prod.productUrl && (
                                                <a
                                                    href={prod.productUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-[10px] text-[#C2A26A] hover:underline mt-2 font-medium"
                                                >
                                                    <span>Officiell produktinformation ↗</span>
                                                </a>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-white/[0.05] text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="text-neutral-400">Lager:</span>
                                                <div className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateStock(prod.id, -1)}
                                                        className="w-4 h-4 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.1] rounded transition-colors text-xs font-bold leading-none"
                                                        title="Minska lagersaldo med 1"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="font-semibold text-white min-w-[18px] text-center text-xs">
                                                        {prod.stock ?? 0}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateStock(prod.id, 1)}
                                                        className="w-4 h-4 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.1] rounded transition-colors text-xs font-bold leading-none"
                                                        title="Öka lagersaldo med 1"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <span className="text-neutral-500 text-[11px]">st</span>
                                            </div>
                                            <span className="font-semibold text-white">{prod.price} {currency}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 rounded-2xl bg-[#111114] border border-white/[0.08] text-center space-y-3">
                                <Package size={28} className="mx-auto text-neutral-500" strokeWidth={1.5} />
                                <div>
                                    <p className="text-sm font-medium text-white">Inga produkter tillagda än</p>
                                    <p className="text-xs text-neutral-400 mt-0.5">Klicka på &quot;Lägg till produkt&quot; för att skapa ditt eftervårdssortiment.</p>
                                </div>
                            </div>
                        )}
                    </section>
                ) : (
                    /* Existing Services Section */
                    <section>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-heading font-bold text-foreground">{t('dash_nav_services') || 'Tjänster'}</h1>
                                <AnimatePresence mode="wait">
                                    {isSaving ? (
                                        <motion.span
                                            key="saving"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-champagne-500/10 text-champagne-600 dark:text-champagne-400 rounded-full text-[10px] font-black uppercase tracking-wider"
                                        >
                                            <RefreshCw size={10} className="animate-spin" /> Sparar...
                                        </motion.span>
                                    ) : saveStatus === 'error' ? (
                                        <motion.span
                                            key="error"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full text-[10px] font-black uppercase tracking-wider"
                                        >
                                            <X size={10} strokeWidth={4} /> Kunde ej spara
                                        </motion.span>
                                    ) : (
                                        <motion.span
                                            key="saved"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-wider"
                                        >
                                            <Check size={10} strokeWidth={4} /> Sparat
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </div>
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
                )}

                {/* Create Product Modal */}
                <AnimatePresence>
                    {isProductModalOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
                                onClick={() => {
                                    setIsProductModalOpen(false);
                                    setEditingProductId(null);
                                }}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-full max-w-lg max-h-[92vh] bg-[#141417] rounded-3xl shadow-2xl z-[101] border border-white/[0.1] flex flex-col overflow-hidden"
                            >
                                <div className="p-6 border-b border-white/[0.08] flex items-center justify-between shrink-0">
                                    <div>
                                        <h3 className="text-lg font-medium text-white">
                                            {editingProductId ? 'Redigera produkt' : 'Lägg till produkt'}
                                        </h3>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                            {editingProductId ? 'Ändra information eller lagersaldo' : 'Eftervård eller produkt till försäljning i salongen'}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setIsProductModalOpen(false);
                                            setEditingProductId(null);
                                        }}
                                        className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.05]"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <form onSubmit={handleSaveProduct} className="p-6 space-y-4 overflow-y-auto max-h-[calc(92vh-90px)]">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                                                Produktnamn *
                                            </label>
                                            <input
                                                required
                                                type="text"
                                                value={productForm.name}
                                                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                                                placeholder="T.ex. Skäggolja, Fuktserum, Schampo..."
                                                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-neutral-600 focus:border-[#C2A26A] outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                                                Varumärke / Märke (valfritt)
                                            </label>
                                            <input
                                                type="text"
                                                value={productForm.brand}
                                                onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                                                placeholder="Fyll i märke själv, t.ex. Proraso, Olaplex..."
                                                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-neutral-600 focus:border-[#C2A26A] outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                                                Pris ({currency}) *
                                            </label>
                                            <input
                                                required
                                                type="number"
                                                value={productForm.price}
                                                onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                                                placeholder="299"
                                                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:border-[#C2A26A] outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                                                Lagersaldo (st)
                                            </label>
                                            <input
                                                type="number"
                                                value={productForm.stock}
                                                onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                                                placeholder="10"
                                                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:border-[#C2A26A] outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                                            Kategori / Typ (valfritt)
                                        </label>
                                        <input
                                            type="text"
                                            value={productForm.category}
                                            onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                                            placeholder="T.ex. Eftervård, Skäggvård, Hårvård, Styling..."
                                            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-neutral-600 focus:border-[#C2A26A] outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                                            Produktbild (valfritt)
                                        </label>
                                        <div className="flex items-center gap-3">
                                            {productForm.image ? (
                                                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/[0.1] shrink-0">
                                                    <img src={productForm.image} alt="Preview" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setProductForm(prev => ({ ...prev, image: '' }))}
                                                        className="absolute top-1 right-1 p-0.5 bg-black/80 rounded-full text-white hover:text-red-400"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="w-14 h-14 rounded-xl border border-dashed border-white/[0.15] hover:border-[#C2A26A] flex flex-col items-center justify-center cursor-pointer text-neutral-400 hover:text-white transition-colors shrink-0">
                                                    <Camera size={16} />
                                                    <span className="text-[8px] mt-1 font-medium">Ladda upp</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleProductImageUpload}
                                                        className="hidden"
                                                    />
                                                </label>
                                            )}
                                            <input
                                                type="text"
                                                value={productForm.image || ''}
                                                onChange={(e) => setProductForm(prev => ({ ...prev, image: e.target.value }))}
                                                placeholder="eller klistra in bild-URL..."
                                                className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-neutral-600 focus:border-[#C2A26A] outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                                            Säljpitch vid checkout (rekommendation till kund)
                                        </label>
                                        <input
                                            type="text"
                                            value={productForm.recommendation || ''}
                                            onChange={(e) => setProductForm(prev => ({ ...prev, recommendation: e.target.value }))}
                                            placeholder="T.ex. Köp till för bästa vårdande och hållbara resultat!"
                                            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-neutral-600 focus:border-[#C2A26A] outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                                            Kategori / Passar till (valfritt)
                                        </label>
                                        <input
                                            type="text"
                                            value={productForm.category}
                                            onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                                            placeholder="T.ex. Naglar, Eftervård, Hårvård..."
                                            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:border-[#C2A26A] outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                                            Beskrivning
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={productForm.description}
                                            onChange={(e) => setProductForm(prev => ({ ...productForm, description: e.target.value }))}
                                            placeholder="Kort beskrivning av produktens egenskaper..."
                                            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-neutral-600 focus:border-[#C2A26A] outline-none resize-none"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                                                Innehåll & Ingredienser (INCI / Allergiinformation)
                                            </label>
                                            <span className="text-[9px] text-[#DFCA9B]">Viktigt för kunder</span>
                                        </div>
                                        <textarea
                                            rows={3}
                                            value={productForm.ingredients}
                                            onChange={(e) => setProductForm(prev => ({ ...prev, ingredients: e.target.value }))}
                                            placeholder="T.ex. Prunus Amygdalus Dulcis (Almond) Oil, Simmondsia Chinensis Seed Oil, Tocopherol (Vitamin E)..."
                                            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-neutral-600 focus:border-[#C2A26A] outline-none resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                                            Länk till produktinformation / tillverkarens sida (valfritt)
                                        </label>
                                        <input
                                            type="url"
                                            value={productForm.productUrl}
                                            onChange={(e) => setProductForm(prev => ({ ...prev, productUrl: e.target.value }))}
                                            placeholder="https://pronails.com/... eller länk till produktsida"
                                            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-neutral-600 focus:border-[#C2A26A] outline-none"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full py-3.5 bg-[#C2A26A] hover:bg-[#DFCA9B] text-[#0B0B0C] font-semibold text-xs tracking-wider uppercase rounded-xl transition-all shadow-md active:scale-95"
                                    >
                                        {editingProductId ? 'Spara ändringar' : 'Spara produkt'}
                                    </button>
                                </form>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>



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
                                    setShowCustomCategoryInput(false);
                                    setCustomCategoryName('');
                                }}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-1.5rem)] sm:w-full max-w-lg bg-card rounded-3xl shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[90dvh]"
                            >
                                {/* Modal Header */}
                                <div className="p-5 sm:p-8 border-b border-border flex items-center justify-between bg-card shrink-0">
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
                                                setNewService({ name: '', price: '', salePrice: '', saleEndsAt: '', duration: '', description: '', category: category || availableCategories[0] || '', practitionerIds: [] });
                                                setDiscountValue('');
                                                setDiscountType('price');
                                                setShowCustomCategoryInput(false);
                                                setCustomCategoryName('');
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
                                                    value={showCustomCategoryInput ? 'NEW_CUSTOM_CATEGORY' : (newService.category || category)}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === 'NEW_CUSTOM_CATEGORY') {
                                                            setShowCustomCategoryInput(true);
                                                            setNewService({ ...newService, category: '' });
                                                        } else {
                                                            setShowCustomCategoryInput(false);
                                                            setNewService({ ...newService, category: val });
                                                        }
                                                    }}
                                                    className="w-full px-4 py-3 rounded-xl border border-border focus:border-champagne-500 outline-none transition-all text-foreground appearance-none cursor-pointer bg-background"
                                                >
                                                    {getAvailableCategories().map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                    <option value="NEW_CUSTOM_CATEGORY">+ Skapa egen kategori...</option>
                                                </select>
                                                
                                                {showCustomCategoryInput && (
                                                    <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <input
                                                            required
                                                            type="text"
                                                            placeholder="Skriv din egna kategori (t.ex. Damklippning)"
                                                            value={customCategoryName}
                                                            onChange={(e) => setCustomCategoryName(e.target.value)}
                                                            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:border-champagne-500 outline-none transition-all placeholder:text-foreground/20"
                                                        />
                                                    </div>
                                                )}
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

                                            {salonTier === 'luxe' && (
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
                                            )}

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
        </PermissionGate>
    );
}
