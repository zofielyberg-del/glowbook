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

    const normalizeProduct = (p: any) => {
        let img = p.image || '';
        const nameLower = (p.name || '').toLowerCase();
        if (nameLower.includes('vitamina') || nameLower.includes('cuticle oil')) {
            img = '/images/products/pronails-vitamina.jpg';
        } else if (nameLower.includes('anti-age') || nameLower.includes('hand cream') || nameLower.includes('rich hand')) {
            img = '/images/products/pronails-anti-age.jpg';
        } else if (img.includes('unsplash.com')) {
            img = '';
        }
        return { ...p, image: img };
    };

    // Sync products from server on mount
    useEffect(() => {
        const saved = localStorage.getItem('glowbook_salon') || sessionStorage.getItem('glowbook_salon');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed.products) && parsed.products.length > 0) {
                    const normalized = parsed.products.map(normalizeProduct);
                    setProducts(normalized);
                }
                if (parsed.id) {
                    fetch(`/api/salons/get?id=${parsed.id}`)
                        .then(r => r.json())
                        .then(d => {
                            if (d.success && d.salon && Array.isArray(d.salon.products)) {
                                const normalized = d.salon.products.map(normalizeProduct);
                                setProducts(normalized);
                                const next = { ...parsed, products: normalized };
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

    const handleImportProNailsKit = async () => {
        const proNailsItems = [
            {
                id: 'pronails-vitamina-' + Date.now(),
                name: 'ProNails Vitamina Cuticle Oil',
                brand: 'ProNails',
                price: 195,
                stock: 0,
                category: 'Nagelvård & Eftervård',
                description: 'Närande nagelbandsolja berikad med mandelolja och vitamin A, C och E för friska nagelband och maximal hållbarhet.',
                image: '/images/products/pronails-vitamina.jpg',
                recommendation: 'Köp till ProNails Vitamina för att hålla dina nagelband återfuktade och förlänga resultatet.',
                ingredients: 'Prunus Amygdalus Dulcis Oil, Triticum Vulgare Germ Oil, Macadamia Integrifolia Seed Oil, Retinyl Palmitate, Tocopherol, Ascorbyl Palmitate.',
                productUrl: 'https://pronails.se'
            },
            {
                id: 'pronails-anti-age-' + (Date.now() + 1),
                name: 'ProNails Anti-Age Rich Hand Cream',
                brand: 'ProNails',
                price: 249,
                stock: 0,
                category: 'Handvård & Eftervård',
                description: 'Djupt återfuktande handkräm med UV-filter och antioxidanter som skyddar händerna mot förtida åldrande och torrhet.',
                image: '/images/products/pronails-anti-age.jpg',
                recommendation: 'Perfekt eftervård för silkeslena händer efter din nagelbehandling.',
                ingredients: 'Aqua, Glycerin, Butyrospermum Parkii Butter, Cetearyl Alcohol, Dimethicone, Ethylhexyl Methoxycinnamate, Tocopheryl Acetate.',
                productUrl: 'https://pronails.se'
            }
        ];

        const existingNames = new Set(products.map(p => (p.name || '').toLowerCase()));
        const toAdd = proNailsItems.filter(item => !existingNames.has(item.name.toLowerCase()));

        if (toAdd.length === 0) {
            return;
        }

        const updated = [...products, ...toAdd];
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
                    console.error('Failed to sync ProNails kit to DB:', err);
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

    const isNailSalon = Boolean(
        (typeof category === 'string' && /naglar|nagel|nails/i.test(category)) ||
        (Array.isArray(availableCategories) && availableCategories.some(c => /naglar|nagel|nails/i.test(c))) ||
        (Array.isArray(services) && services.some(s => /naglar|nagel|gellack|akryl|manikyr/i.test(s.name) || (s.category && /naglar|nagel|nails/i.test(s.category))))
    );

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

                        {/* Exclusive ProNails Section - ONLY visible for Nail Salons */}
                        {isNailSalon && (
                            <div className="p-5 sm:p-6 rounded-2xl bg-[#141417] border border-[#C2A26A]/30 space-y-4 shadow-xl relative overflow-hidden">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-[#C2A26A]/15 text-[#DFCA9B] border border-[#C2A26A]/30">
                                                OFFICIELL PARTNER
                                            </span>
                                            <span className="text-[10px] text-neutral-400 font-medium">Endast för nagelsalonger</span>
                                        </div>
                                        <h3 className="text-sm sm:text-base font-semibold text-white">
                                            Erbjud professionell eftervård från ProNails
                                        </h3>
                                        <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
                                            Som ansluten nagelsalong på Glowbook kan du erbjuda professionell eftervård vid tidsbokning. Skapa eller logga in på ProNails för att beställa hem produkter till grossistpris, och importera produktmallarna till salongen med ett klick.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={handleImportProNailsKit}
                                            className="px-4 py-2 rounded-xl bg-[#C2A26A] hover:bg-[#DFCA9B] text-[#0B0B0C] text-xs font-bold tracking-wide uppercase transition-all shadow-md active:scale-95"
                                        >
                                            Importera ProNails-kit
                                        </button>
                                        <a
                                            href="https://pronails.se"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border border-white/[0.08] text-xs font-semibold tracking-wide uppercase transition-all flex items-center gap-1.5"
                                        >
                                            <span>Skapa/logga in på ProNails ↗</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}

                        {products.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {products.map((prod) => (
                                    <div key={prod.id} className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-3 flex flex-col justify-between overflow-hidden">
                                        <div>
                                            {prod.image && (
                                                <div className="w-full h-36 rounded-xl overflow-hidden bg-white/[0.02] mb-3 border border-white/[0.06] flex items-center justify-center p-2">
                                                    <img 
                                                        src={prod.image} 
                                                        alt={prod.name} 
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => {
                                                            (e.target as HTMLElement).style.display = 'none';
                                                        }}
                                                    />
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
                            <p className="text-xs text-neutral-400">{t('dash_nav_services_desc') || 'Skapa och hantera de tjänster du erbjuder.'}</p>
                        </div>
                        <button
                            onClick={() => {
                                setEditingService(null);
                                setNewService({ name: '', price: '', salePrice: '', saleEndsAt: '', duration: '', description: '', category: category || availableCategories[0] || '', practitionerIds: [] });
                                setIsModalOpen(true);
                            }}
                            className="px-5 py-2.5 rounded-xl bg-[#C2A26A] hover:bg-[#DFCA9B] text-[#0B0B0C] text-xs font-semibold tracking-wide uppercase transition-all shadow-md active:scale-95 flex items-center gap-2"
                        >
                            <Plus size={16} /> {t('action_create_service') || 'Skapa ny tjänst'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {services.map(service => (
                            <div key={service.id} className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] hover:border-white/[0.15] transition-all flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-2.5">
                                        <h3 className="font-semibold text-white text-base tracking-tight">{service.name}</h3>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleEditClick(service)}
                                                className="p-1.5 text-neutral-400 hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]"
                                                title="Redigera"
                                            >
                                                <Edit size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteService(service.id)}
                                                className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors rounded-lg hover:bg-white/[0.05]"
                                                title="Ta bort"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider bg-white/[0.05] text-[#DFCA9B] border border-white/[0.08]">
                                            {(service as any).category || category || 'Tjänst'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-4">
                                        {service.description || "Ingen beskrivning angiven."}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs font-medium">
                                    <div className="flex items-center gap-1.5 text-neutral-400">
                                        <Clock size={14} className="text-[#C2A26A]" />
                                        {service.duration} min
                                    </div>
                                    <div className="font-bold flex flex-col items-end">
                                        {service.sale_price && (!service.sale_ends_at || new Date(service.sale_ends_at) > new Date()) ? (
                                            <>
                                                <span className="text-[10px] text-red-400 line-through opacity-60">{service.price} {currency}</span>
                                                <span className="text-red-400 font-bold">{service.sale_price} {currency}</span>
                                            </>
                                        ) : (
                                            <span className="text-white font-bold">{service.price} {currency}</span>
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
                                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-1.5rem)] sm:w-full max-w-lg bg-[#111114] border border-white/[0.1] rounded-3xl shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[90dvh]"
                            >
                                {/* Modal Header */}
                                <div className="p-5 sm:p-6 border-b border-white/[0.08] flex items-center justify-between bg-[#111114] shrink-0">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">
                                            {editingService ? 'Redigera tjänst' : 'Lägg till tjänst'}
                                        </h3>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                            {editingService ? 'Uppdatera befintlig behandling' : 'Skapa en ny behandling för din salong'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
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
                                            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Modal Body */}
                                <form id="service-form" onSubmit={handleAddService} className="contents">
                                    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-320px)] custom-scrollbar">
                                        {/* Suggestions for new services */}
                                        {!editingService && (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
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
                                                            className="flex items-center justify-between p-3.5 bg-white/[0.02] hover:bg-white/[0.06] text-left rounded-xl transition-all border border-white/[0.06] hover:border-[#C2A26A]/40 group"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center text-neutral-400 group-hover:text-[#DFCA9B] transition-colors">
                                                                    <DollarSign size={15} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-semibold text-white">{s.name}</p>
                                                                    <p className="text-[10px] text-neutral-400">{s.duration} min • {s.price} {currency}</p>
                                                                </div>
                                                            </div>
                                                            <Plus size={14} className="text-neutral-500 group-hover:text-[#DFCA9B] transition-all" />
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="h-px bg-white/[0.06] my-2" />
                                            </div>
                                        )}

                                        <div className="space-y-5">
                                            <div>
                                                <label className="block text-xs font-medium text-neutral-300 mb-1.5">{t('label_service_name')} *</label>
                                                <input
                                                    required
                                                    type="text"
                                                    placeholder={currentPlaceholder}
                                                    value={newService.name}
                                                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs text-white placeholder:text-neutral-600 focus:border-[#C2A26A] outline-none transition-all"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Kategori *</label>
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
                                                    className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-[#111114] text-xs text-white focus:border-[#C2A26A] outline-none transition-all cursor-pointer"
                                                >
                                                    {getAvailableCategories().map(cat => (
                                                        <option key={cat} value={cat} className="bg-[#111114] text-white">{cat}</option>
                                                    ))}
                                                    <option value="NEW_CUSTOM_CATEGORY" className="bg-[#111114] text-[#DFCA9B]">+ Skapa egen kategori...</option>
                                                </select>
                                                
                                                {showCustomCategoryInput && (
                                                    <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <input
                                                            required
                                                            type="text"
                                                            placeholder="Skriv din egna kategori (t.ex. Damklippning)"
                                                            value={customCategoryName}
                                                            onChange={(e) => setCustomCategoryName(e.target.value)}
                                                            className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs text-white placeholder:text-neutral-600 focus:border-[#C2A26A] outline-none transition-all"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">{t('label_price')} ({currency}) *</label>
                                                    <div className="relative">
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-medium text-xs">{currency}</div>
                                                        <input
                                                            required
                                                            type="number"
                                                            placeholder="Pris"
                                                            value={newService.price}
                                                            onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs text-white placeholder:text-neutral-600 focus:border-[#C2A26A] outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">{t('label_time')} (minuter) *</label>
                                                    <div className="relative">
                                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={15} />
                                                        <input
                                                            required
                                                            type="number"
                                                            placeholder="Tid"
                                                            value={newService.duration}
                                                            onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs text-white placeholder:text-neutral-600 focus:border-[#C2A26A] outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="border-t border-white/[0.08] pt-5 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 bg-white/[0.05] rounded-lg flex items-center justify-center text-neutral-400"><DollarSign size={14} /></div>
                                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Rabatt & Kampanj</h4>
                                                    </div>
                                                    {(discountValue || newService.saleEndsAt) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setDiscountValue('');
                                                                setNewService(prev => ({ ...prev, salePrice: '', saleEndsAt: '' }));
                                                            }}
                                                            className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider"
                                                        >
                                                            Ta bort
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
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
                                                                "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                                                                discountType === t ? "bg-white/[0.1] text-[#DFCA9B] shadow-sm" : "text-neutral-400 hover:text-white"
                                                            )}
                                                        >
                                                            {t === 'amount' ? `SEK` : '% Rabatt'}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                                                            {discountType === 'amount' ? 'Kr Av' : 'Procent (%)'}
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                placeholder="0"
                                                                value={discountValue}
                                                                onChange={(e) => setDiscountValue(e.target.value)}
                                                                className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs text-white placeholder:text-neutral-600 focus:border-[#C2A26A] outline-none transition-all font-semibold"
                                                            />
                                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-xs uppercase pointer-events-none">
                                                                {discountType === 'percent' ? '%' : currency}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Gäller t.o.m</label>
                                                        <input
                                                            type="date"
                                                            value={newService.saleEndsAt}
                                                            onChange={(e) => setNewService({ ...newService, saleEndsAt: e.target.value })}
                                                            className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs text-white placeholder:text-neutral-600 focus:border-[#C2A26A] outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>

                                                {newService.salePrice && Number(newService.salePrice) < Number(newService.price) && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center justify-between"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400">
                                                                <Check size={18} strokeWidth={3} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Kundens pris</p>
                                                                <p className="text-base font-bold text-white">{Math.round(Number(newService.salePrice))} {currency}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] text-neutral-400 font-medium uppercase mb-0.5">Total Rabatt</p>
                                                            <div className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-full">
                                                                -{Math.round((1 - Number(newService.salePrice) / Number(newService.price)) * 100)}%
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>

                                            {salonTier === 'luxe' && (
                                                <div className="border-t border-white/[0.08] pt-5">
                                                    <label className="block text-xs font-medium text-neutral-300 mb-3">Vilka utför tjänsten? *</label>
                                                    {practitioners.length > 0 ? (
                                                        <div className="grid grid-cols-2 gap-2.5">
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
                                                                        "px-3 py-2.5 rounded-xl text-xs font-medium transition-all border flex items-center gap-2.5 text-left",
                                                                        newService.practitionerIds.includes(p.id)
                                                                            ? "bg-[#C2A26A] text-[#0B0B0C] border-[#C2A26A] shadow-md font-semibold"
                                                                            : "bg-white/[0.03] text-neutral-400 border-white/[0.08] hover:border-white/[0.15] hover:text-white"
                                                                    )}
                                                                >
                                                                    <div className={clsx(
                                                                        "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0",
                                                                        newService.practitionerIds.includes(p.id) ? "bg-[#0B0B0C] text-[#C2A26A]" : "bg-white/[0.1] text-neutral-400"
                                                                    )}>
                                                                        {newService.practitionerIds.includes(p.id) ? "✓" : p.name.charAt(0)}
                                                                    </div>
                                                                    <span className="truncate">{p.name}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08]">
                                                            <p className="text-[10px] text-neutral-400">
                                                                Inga medarbetare tillagda än. Gå till Inställningar → Utförare.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-xs font-medium text-neutral-300 mb-1.5">{t('label_description')} <span className="text-neutral-500 font-normal">({t('label_optional')})</span></label>
                                                <textarea
                                                    rows={3}
                                                    placeholder={t('placeholder_description')}
                                                    value={newService.description}
                                                    onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs text-white placeholder:text-neutral-600 focus:border-[#C2A26A] outline-none transition-all resize-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Modal Footer - Sticky */}
                                    <div className="p-5 sm:p-6 border-t border-white/[0.08] bg-[#0B0B0C] shrink-0">
                                        <button
                                            type="submit"
                                            className="w-full bg-[#C2A26A] hover:bg-[#DFCA9B] text-[#0B0B0C] py-3.5 rounded-xl font-bold text-xs uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95"
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
