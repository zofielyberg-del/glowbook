
'use client';

import { useState, useEffect, useMemo, useRef } from "react";
import Header from "@/components/layout/Header";
import { Clock, MapPin, Star, ChevronRight, CheckCircle2, X, Plus, Users, User, CreditCard, Wallet, AlertTriangle, Lock, ExternalLink, Coins, Check, ChevronLeft, ImageIcon, MessageSquare, Shield, Award, Package, Info, ShoppingBag, Store, Minus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Calendar from "@/components/dashboard/Calendar";
import clsx from "clsx";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { REWARD_TIERS, normalizeRewardTiers } from "@/lib/loyalty";
import { useSearchParams, useRouter } from "next/navigation";
import { slugifySalonName } from "@/lib/slug";

function getServiceCategory(service: any, salonCategory: string) {
    const ignoredCategories = ['skönhet', 'skönhetssalong'];
    const legacyRoleMap: Record<string, string> = {
        'frisör': 'Hårvård',
        'nagelterapeut': 'Naglar',
        'fransstylist': 'Fransar & Bryn',
        'brow stylist': 'Fransar & Bryn',
        'hudterapeut': 'Hudvård',
        'lasertekinker': 'Hudvård',
        'lasertekniker': 'Hudvård',
        'massör': 'Massage',
        'tatuerare': 'Tatuering',
        'fotvårdsterapeut': 'Fotvård',
        'makeup-artist': 'Makeup',
    };
    let cat = service?.category;
    if (cat && ignoredCategories.includes(cat.toLowerCase())) {
        cat = null;
    }
    if (cat) {
        const mapped = legacyRoleMap[cat.trim().toLowerCase()];
        return mapped || cat;
    }

    const name = service?.name?.toLowerCase() || '';
    if (name.includes('klipp') && !name.includes('skägg')) return 'Hårvård';
    if (name.includes('skägg') || name.includes('rakning') || name.includes('barber')) return 'Barberare';
    if (name.includes('frans') || name.includes('lash') || name.includes('bryn') || name.includes('brow')) return 'Fransar & Bryn';
    if (name.includes('nagel') || name.includes('gel') || name.includes('manikyr') || name.includes('pedikyr')) return 'Naglar';
    if (name.includes('ansikt') || name.includes('hud') || name.includes('peeling') || name.includes('laser')) return 'Hudvård';
    if (name.includes('massage')) return 'Massage';
    if (name.includes('tatuering') || name.includes('tattoo')) return 'Tatuering';
    if (name.includes('fotvård')) return 'Fotvård';
    if (name.includes('makeup') || name.includes('smink')) return 'Makeup';
    if (name.includes('piercing')) return 'Piercing';
    if (name.includes('spa')) return 'Spa';
    
    // Fallback to salon category if not generic
    if (salonCategory && !ignoredCategories.includes(salonCategory.toLowerCase())) {
        const lowerSalonCat = salonCategory.toLowerCase();
        if (lowerSalonCat === 'naglar') return 'Naglar';
        if (lowerSalonCat === 'hårvård') return 'Hårvård';
        if (lowerSalonCat === 'massage') return 'Massage';
        if (lowerSalonCat === 'hudvård') return 'Hudvård';
        if (lowerSalonCat === 'fransar & bryn') return 'Fransar & Bryn';
        if (lowerSalonCat === 'estetisk injektion') return 'Estetisk Injektion';
        if (lowerSalonCat === 'tatuering') return 'Tatuering';
        if (lowerSalonCat === 'fotvård') return 'Fotvård';
        if (lowerSalonCat === 'spa') return 'Spa';
        if (lowerSalonCat === 'makeup') return 'Makeup';
        if (lowerSalonCat === 'barberare') return 'Barberare';
        if (lowerSalonCat === 'piercing') return 'Piercing';
        return salonCategory;
    }
    return 'Övrigt';
}

function timeToMins(t: string) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function minsToTime(m: number) {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function mapDbAppointment(apt: any) {
    if (!apt) return apt;
    
    const sDate = apt.start_time ? new Date(apt.start_time) : null;
    if (!sDate) {
        return {
            ...apt,
            color: 'bg-pink-100/95 dark:bg-pink-950/40 border-pink-300 dark:border-pink-800/60 text-pink-800 dark:text-pink-300 shadow-sm'
        };
    }
    
    const pad = (n: number) => String(n).padStart(2, '0');
    const startTime = `${pad(sDate.getHours())}:${pad(sDate.getMinutes())}`;
    
    let duration = 30;
    if (apt.end_time) {
        const eDate = new Date(apt.end_time);
        duration = Math.round((eDate.getTime() - sDate.getTime()) / 60000);
    } else if (apt.duration_minutes) {
        duration = apt.duration_minutes;
    }
    
    const day = sDate.getDay();
    const dayIndex = day === 0 ? 6 : day - 1;
    
    const dateFormatted = `${sDate.getFullYear()}-${pad(sDate.getMonth() + 1)}-${pad(sDate.getDate())}`;
    
    return {
        id: apt.id,
        clientName: apt.customer_name || apt.customer_email || apt.clientName || 'Kund',
        clientEmail: apt.customer_email || apt.clientEmail || '',
        clientPhone: apt.customer_phone || apt.clientPhone || '',
        service: apt.service_name || apt.service || 'Tjänst',
        startTime: startTime,
        duration: duration,
        dayIndex: dayIndex,
        date: dateFormatted,
        status: apt.status || 'confirmed',
        practitionerId: apt.practitioner_id || apt.practitionerId || 'owner',
        start_time: apt.start_time,
        end_time: apt.end_time,
        color: 'bg-pink-100/95 dark:bg-pink-950/40 border-pink-300 dark:border-pink-800/60 text-pink-800 dark:text-pink-300 shadow-sm'
    };
}

export default function SalonContent({ params }: { params?: { id: string } }) {
    const { t } = useLanguage();
    const [salon, setSalon] = useState<any>(null);
    const searchParams = useSearchParams();
    const router = useRouter();

    const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    const [reviewInfo, setReviewInfo] = useState<any>(null);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [reviewError, setReviewError] = useState('');
    const [reviewSuccess, setReviewSuccess] = useState(false);

    useEffect(() => {
        const bookingId = searchParams.get('review');
        if (bookingId) {
            setReviewBookingId(bookingId);
            setIsReviewModalOpen(true);
            
            fetch(`/api/bookings/get?id=${bookingId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.appointment) {
                        setReviewInfo(data.appointment);
                    }
                })
                .catch(e => console.error("Error fetching review booking details:", e));
        }
    }, [searchParams]);

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reviewBookingId) return;

        setIsSubmittingReview(true);
        setReviewError('');
        setReviewSuccess(false);

        try {
            const response = await fetch('/api/reviews/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointmentId: reviewBookingId,
                    rating: reviewRating,
                    text: reviewText
                })
            });

            const data = await response.json();
            if (!response.ok) {
                setReviewError(data.error || 'Något gick fel.');
            } else {
                setReviewSuccess(true);
                
                if (salon?.id) {
                    const res = await fetch(`/api/salons/get?id=${encodeURIComponent(salon.id)}`);
                    const freshData = await res.json();
                    if (freshData.success && freshData.salon) {
                        setSalon(freshData.salon);
                    }
                }
                
                const params = new URLSearchParams(window.location.search);
                params.delete('review');
                const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
                router.replace(newRelativePathQuery);

                setTimeout(() => {
                    setIsReviewModalOpen(false);
                    setReviewSuccess(false);
                    setReviewText('');
                    setReviewBookingId(null);
                    setReviewInfo(null);
                }, 3000);
            }
        } catch (err: any) {
            setReviewError(err.message || 'Nätverksfel.');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const reviews = useMemo(() => {
        const availability = Array.isArray(salon?.availability) ? salon.availability : [];
        const reviewsBlock = availability.find((a: any) => a && a.type === 'reviews');
        return reviewsBlock?.list || [];
    }, [salon?.availability]);

    const [productStockOverrides, setProductStockOverrides] = useState<Record<string, number>>({});

    const products = useMemo(() => {
        let list: any[] = [];
        if (Array.isArray(salon?.products) && salon.products.length > 0) {
            list = salon.products;
        } else {
            const availability = Array.isArray(salon?.availability) ? salon.availability : [];
            const prodBlock = availability.find((a: any) => a && (a.type === 'products' || a.type === 'addons'));
            list = prodBlock?.list || [];
        }
        return list.map((p: any) => {
            if (productStockOverrides[p.id] !== undefined) {
                return { ...p, stock: productStockOverrides[p.id] };
            }
            return p;
        });
    }, [salon?.products, salon?.availability, productStockOverrides]);

    const [selectedService, setSelectedService] = useState<any>(null);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [bookingStep, setBookingStep] = useState(1); // 1: Select Service, 2: Select Time, 3: Confirm
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
    const [selectedPractitioner, setSelectedPractitioner] = useState<any>(null);
    const [selectedTime, setSelectedTime] = useState<{ day: string; time: string; fullDate: string; dayIndex: number } | null>(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'onsite' | 'stripe' | 'giftcard'>('onsite');
    const [giftCardSecondaryMethod, setGiftCardSecondaryMethod] = useState<'onsite' | 'stripe'>('onsite');
    const [isBooked, setIsBooked] = useState(false);
    const [successAppointment, setSuccessAppointment] = useState<any>(null);
    const [isBooking, setIsBooking] = useState(false);
    const [galleryLightbox, setGalleryLightbox] = useState<number | null>(null);
    const [viewingProduct, setViewingProduct] = useState<any | null>(null);
    const modalScrollRef = useRef<HTMLDivElement>(null);

    // Ensure checkout modal always starts from the top on step changes
    useEffect(() => {
        if (isBookingModalOpen && modalScrollRef.current) {
            modalScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
        }
    }, [bookingStep, isBookingModalOpen]);

    // Cart & Click-and-collect state
    const [cart, setCart] = useState<Array<{ id: string; name: string; brand?: string; price: number; quantity: number; image?: string; category?: string }>>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckingOutOrder, setIsCheckingOutOrder] = useState(false);
    const [orderConfirmation, setOrderConfirmation] = useState<any | null>(null);

    const addToCart = (product: any) => {
        const stock = typeof product.stock === 'number' ? product.stock : (parseInt(product.stock, 10) ?? 999);
        if (product.stock !== undefined && product.stock !== null && stock <= 0) {
            return;
        }
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                if (product.stock !== undefined && product.stock !== null && existing.quantity >= stock) {
                    return prev;
                }
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, {
                id: product.id,
                name: product.name,
                brand: product.brand || '',
                price: Number(product.price) || 0,
                quantity: 1,
                image: product.image || '',
                category: product.category || 'Eftervård'
            }];
        });
        setIsCartOpen(true);
    };

    const updateCartQuantity = (productId: string, delta: number) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.id === productId) {
                    if (delta > 0) {
                        const matchingProd = products.find((p: any) => p.id === productId);
                        if (matchingProd && matchingProd.stock !== undefined && matchingProd.stock !== null) {
                            const stock = typeof matchingProd.stock === 'number' ? matchingProd.stock : (parseInt(matchingProd.stock, 10) || 0);
                            if (item.quantity + delta > stock) {
                                return item;
                            }
                        }
                    }
                    const newQty = item.quantity + delta;
                    return newQty > 0 ? { ...item, quantity: newQty } : null;
                }
                return item;
            }).filter(Boolean) as any[];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const cartTotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }, [cart]);

    const cartItemsCount = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    }, [cart]);

    const handlePlaceOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cart.length === 0 || !customerInfo.firstName || !customerInfo.email) return;

        setIsCheckingOutOrder(true);
        try {
            const res = await fetch('/api/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    salonId: salon.id || salon.slug,
                    items: cart,
                    customerInfo: {
                        firstName: customerInfo.firstName,
                        lastName: customerInfo.lastName,
                        email: customerInfo.email,
                        phone: customerInfo.phone
                    },
                    paymentMethod: selectedPaymentMethod === 'stripe' ? 'stripe' : 'onsite'
                })
            });

            const data = await res.json();
            if (data.success) {
                // Update product inventory locally
                if (Array.isArray(data.updatedProducts) && data.updatedProducts.length > 0) {
                    const overrides: Record<string, number> = {};
                    data.updatedProducts.forEach((p: any) => {
                        overrides[p.id] = typeof p.stock === 'number' ? p.stock : (parseInt(p.stock, 10) || 0);
                    });
                    setProductStockOverrides(prev => ({ ...prev, ...overrides }));
                } else {
                    setProductStockOverrides(prev => {
                        const next = { ...prev };
                        cart.forEach((c: any) => {
                            const matching = products.find((p: any) => p.id === c.id || p.name === c.name);
                            if (matching) {
                                const currentStock = next[matching.id] !== undefined ? next[matching.id] : (typeof matching.stock === 'number' ? matching.stock : (parseInt(matching.stock, 10) || 0));
                                next[matching.id] = Math.max(0, currentStock - (c.quantity || 1));
                            }
                        });
                        return next;
                    });
                }

                // If the provider is viewing their own salon in the same browser, immediately update local cache
                try {
                    const saved = localStorage.getItem('glowbook_salon') || sessionStorage.getItem('glowbook_salon');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        if (parsed.id === salon.id || parsed.slug === salon.slug) {
                            if (Array.isArray(data.updatedProducts) && data.updatedProducts.length > 0) {
                                parsed.products = data.updatedProducts;
                            } else if (Array.isArray(parsed.products)) {
                                parsed.products = parsed.products.map((prod: any) => {
                                    const bought = cart.find((c: any) => c.id === prod.id || c.name === prod.name);
                                    if (bought) {
                                        const cur = typeof prod.stock === 'number' ? prod.stock : (parseInt(prod.stock, 10) || 0);
                                        return { ...prod, stock: Math.max(0, cur - (bought.quantity || 1)) };
                                    }
                                    return prod;
                                });
                            }
                            const newOrderApt = {
                                id: data.orderId || `ord-${Date.now()}`,
                                clientName: `${customerInfo.firstName} ${customerInfo.lastName || ''}`.trim(),
                                customer_name: `${customerInfo.firstName} ${customerInfo.lastName || ''}`.trim(),
                                clientEmail: customerInfo.email,
                                customer_email: customerInfo.email,
                                clientPhone: customerInfo.phone || '-',
                                customer_phone: customerInfo.phone || '-',
                                service: `Produktorder (${cart.map((c: any) => `${c.quantity || 1}x ${c.name}`).join(', ')})`,
                                service_name: `Produktorder (${cart.map((c: any) => `${c.quantity || 1}x ${c.name}`).join(', ')})`,
                                price: data.totalPrice,
                                total_price: data.totalPrice,
                                duration: 0,
                                duration_minutes: 0,
                                startTime: new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' }),
                                start_time: new Date().toISOString(),
                                date: new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' }),
                                booking_date: new Date().toISOString(),
                                paymentMethod: selectedPaymentMethod === 'stripe' ? 'stripe' : 'onsite',
                                payment_method: selectedPaymentMethod === 'stripe' ? 'Kort/Klarna (Stripe Online)' : 'Betala vid upphämtning',
                                status: 'confirmed',
                                isProductOrder: true,
                                bankid_verified: false
                            };
                            parsed.appointments = [newOrderApt, ...(parsed.appointments || []).filter((a: any) => a.id !== newOrderApt.id)];
                            localStorage.setItem('glowbook_salon', JSON.stringify(parsed));
                            sessionStorage.setItem('glowbook_salon', JSON.stringify(parsed));
                            window.dispatchEvent(new Event('glowbook_update'));
                            window.dispatchEvent(new Event('storage'));
                        }
                    }
                } catch (e) {
                    console.error('Failed to update local cache with order:', e);
                }

                setOrderConfirmation(data);
                setCart([]);
                setIsCartOpen(false);
            } else {
                alert(data.error || 'Något gick fel vid beställningen.');
            }
        } catch (err: any) {
            alert(err.message || 'Kunde inte slutföra beställningen.');
        } finally {
            setIsCheckingOutOrder(false);
        }
    };

    const [giftCardCode, setGiftCardCode] = useState('');
    const [giftCardStatus, setGiftCardStatus] = useState<{ valid: boolean; balance: number; message: string } | null>(null);
    const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false);
    const [isProviderLoggedIn, setIsProviderLoggedIn] = useState(false);
    const [bookingType, setBookingType] = useState<'none' | 'login' | 'guest'>('none');
    const [customerInfo, setCustomerInfo] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        id: '' // Add ID for loyalty lookups
    });
    const [availableGlowpoints, setAvailableGlowpoints] = useState(0);
    const [useGlowpoints, setUseGlowpoints] = useState(false);
    const [selectedReward, setSelectedReward] = useState<any>(null);
    const [status, setStatus] = useState<'loading' | 'ready'>('loading');

    useEffect(() => {
        if (salon && salon.stripe_account_id) {
            setSelectedPaymentMethod('stripe');
        } else {
            setSelectedPaymentMethod('onsite');
        }
    }, [salon?.id, salon?.stripe_account_id]);

    const basePrice = useMemo(() => {
        return Number(
            (selectedService?.sale_price && (!selectedService?.sale_ends_at || new Date(selectedService.sale_ends_at) > new Date()))
                ? selectedService.sale_price
                : (selectedService?.price || 0)
        );
    }, [selectedService]);

    const addonsPrice = useMemo(() => {
        return selectedAddons.reduce((acc, id) => {
            const addon = [...(salon?.addons || []), ...products].find((a: any) => a.id === id);
            return acc + Number(addon?.price || 0);
        }, 0);
    }, [selectedAddons, salon?.addons, products]);

    const salonRewards = useMemo(() => normalizeRewardTiers(salon?.custom_rewards), [salon?.custom_rewards]);

    const originalTotal = useMemo(() => {
        let total = basePrice + addonsPrice;
        // Apply Glowpoints Reward Discount directly in SEK
        if (useGlowpoints && selectedReward) {
            const discount = Number(selectedReward.discountAmount) || 
                             (selectedReward.label ? parseInt(selectedReward.label.replace(/\D/g, ''), 10) : 0) || 
                             0;
            total = Math.max(0, total - discount);
        }
        return total;
    }, [basePrice, addonsPrice, useGlowpoints, selectedReward]);

    const giftCardDiscount = useMemo(() => {
        return selectedPaymentMethod === 'giftcard' && giftCardStatus?.valid
            ? Math.min(originalTotal, Number(giftCardStatus.balance))
            : 0;
    }, [selectedPaymentMethod, giftCardStatus, originalTotal]);

    const finalTotal = useMemo(() => {
        return originalTotal - giftCardDiscount;
    }, [originalTotal, giftCardDiscount]);

    useEffect(() => {
        const checkCustomerLogin = () => {
            const customer = sessionStorage.getItem('glowbook_customer') || localStorage.getItem('glowbook_customer');
            if (customer) {
                const data = JSON.parse(customer);
                setIsCustomerLoggedIn(true);
                setCustomerInfo({
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    id: data.id || ''
                });
                setBookingType('login');
            } else {
                setIsCustomerLoggedIn(false);
                setBookingType('none');
            }

            // Sync provider state to warn providers beforehand
            try {
                const provider = sessionStorage.getItem('glowbook_salon');
                setIsProviderLoggedIn(!!provider);
            } catch {
                setIsProviderLoggedIn(false);
            }

            // Check for success redirect from Stripe
            const params = new URLSearchParams(window.location.search);
            const bookingSuccess = params.get('booking_success') === 'true';
            const appointmentId = params.get('appointment_id');
            if (bookingSuccess) {
                setIsBooked(true);
                setIsBookingModalOpen(true);
                if (appointmentId) {
                    const fetchAppointmentDetails = async () => {
                        try {
                            const res = await fetch(`/api/bookings/get?id=${appointmentId}`);
                            const data = await res.json();
                            if (data.success && data.appointment) {
                                setSuccessAppointment(data.appointment);
                            }
                        } catch (e) {
                            console.error('Error fetching success appointment details:', e);
                        }
                    };
                    fetchAppointmentDetails();
                }
            }

            // Check for canceled payment from Stripe
            const bookingCanceled = params.get('booking_canceled') === 'true';
            const canceledAppointmentId = params.get('appointment_id');
            if (bookingCanceled && canceledAppointmentId) {
                fetch('/api/bookings/cancel-pending', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ appointmentId: canceledAppointmentId })
                })
                .then(res => res.json())
                .then(data => {
                    console.log('Pending payment booking cleaned up successfully:', data);
                    alert('Betalningen avbröts. Din tid har frigjorts.');
                    
                    // Clear the query parameters
                    const newParams = new URLSearchParams(window.location.search);
                    newParams.delete('booking_canceled');
                    newParams.delete('appointment_id');
                    const newQuery = newParams.toString();
                    router.replace(window.location.pathname + (newQuery ? '?' + newQuery : ''));
                })
                .catch(err => console.error('Failed to clean up pending booking:', err));
            }
        };
        checkCustomerLogin();
        window.addEventListener('glowbook_update', checkCustomerLogin);
        return () => window.removeEventListener('glowbook_update', checkCustomerLogin);
    }, []);

    // NEW: Fetch available Glowpoints for this salon
    useEffect(() => {
        if (isCustomerLoggedIn && salon?.id && salon.acceptsGlowpoints && customerInfo.id) {
            const fetchPoints = async () => {
                try {
                    const response = await fetch('/api/profile/loyalty', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: customerInfo.id })
                    });
                    const data = await response.json();
                    if (data.success) {
                        const balance = data.balances.find((b: any) => b.providerId === salon.id);
                        setAvailableGlowpoints(balance?.currentPoints || 0);
                    }
                } catch (e) {
                    console.error('Error fetching loyalty points:', e);
                }
            };
            fetchPoints();
        }
    }, [isCustomerLoggedIn, salon?.id, salon?.acceptsGlowpoints, customerInfo.id]);

    const validateEmail = (email: string) => {
        return String(email)
            .toLowerCase()
            .match(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            );
    };

    const validatePhone = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 8;
    };

    const isBasicInfoValid = customerInfo.firstName.trim().length > 1 &&
        customerInfo.lastName.trim().length > 1 &&
        validateEmail(customerInfo.email) &&
        validatePhone(customerInfo.phone);

    const isFormValid = isBasicInfoValid && agreedToTerms;



    // BULLSEYE: Gift Card Validator
    const validateGiftCard = async (code: string) => {
        const cleanCode = code.trim().toUpperCase();
        if (!cleanCode) {
            setGiftCardStatus(null);
            return;
        }
        try {
            const response = await fetch('/api/giftcards/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: cleanCode }),
            });
            const data = await response.json();

            if (data.success) {
                setGiftCardStatus({
                    valid: true,
                    balance: data.card.remainingBalance,
                    message: `Saldo: ${data.card.remainingBalance} SEK`
                });
            } else {
                setGiftCardStatus({
                    valid: false,
                    balance: 0,
                    message: data.error || 'Ogiltigt presentkort'
                });
            }
        } catch (error) {
            console.error('Gift card validation error:', error);
            setGiftCardStatus({ valid: false, balance: 0, message: 'Kunde inte kontrollera presentkortet' });
        }
    };

    const handleConfirmBooking = async () => {
        if (!selectedService || !selectedTime) return;
        if (isBooking) return;
        setIsBooking(true);

        // Prevent providers from booking
        try {
            const isProvider = !!sessionStorage.getItem('glowbook_salon');
            if (isProvider) {
                alert('Som utförare kan du inte boka tjänster hos andra utförare.');
                setIsBooking(false);
                return;
            }
        } catch { }

        try {
            const appliedGiftCardCode = selectedPaymentMethod === 'giftcard' && giftCardStatus?.valid
                ? giftCardCode.trim().toUpperCase()
                : null;
            const appliedGiftCardDiscount = appliedGiftCardCode ? giftCardDiscount : 0;

            const actualPaymentMethod = finalTotal <= 0
                ? (appliedGiftCardCode ? 'giftcard' : 'glowpoints')
                : (selectedPaymentMethod === 'giftcard' ? giftCardSecondaryMethod : selectedPaymentMethod);

            const isStripePayment = actualPaymentMethod === 'stripe' && finalTotal > 0;

            const localStart = new Date(`${selectedTime.fullDate}T${selectedTime.time}:00`);
            const start_time = localStart.toISOString();
            const end_time = new Date(localStart.getTime() + (selectedService.duration || 30) * 60000).toISOString();

            // 1. Create Appointment (atomically handles non-Stripe gift card & Glowpoints deduction)
            const addedProductItems = selectedAddons
                .map(id => [...(salon?.addons || []), ...products].find((p: any) => p.id === id))
                .filter(Boolean);
            const addedProductNames = addedProductItems.map((p: any) => p.name).join(', ');
            const finalServiceName = addedProductNames 
                ? `${selectedService.name} (+ ${addedProductNames})`
                : selectedService.name;

            const bookingResponse = await fetch('/api/bookings/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    salonId: salon.id,
                    serviceId: selectedService.id,
                    serviceName: finalServiceName,
                    practitionerId: selectedPractitioner?.id || 'owner',
                    startTime: selectedTime.time,
                    date: selectedTime.fullDate,
                    dayIndex: selectedTime.dayIndex,
                    duration: selectedService.duration || 30,
                    price: finalTotal,
                    customerInfo: {
                        ...customerInfo,
                        isLoggedIn: isCustomerLoggedIn
                    },
                    paymentMethod: actualPaymentMethod,
                    rewardInfo: useGlowpoints ? selectedReward : null,
                    giftCardCode: appliedGiftCardCode,
                    giftCardDiscount: appliedGiftCardDiscount,
                    status: isStripePayment ? 'pending_payment' : 'confirmed',
                    start_time,
                    end_time,
                    addedProducts: addedProductItems.map((p: any) => ({ id: p.id, name: p.name, quantity: 1 }))
                }),
            });

            const bookingData = await bookingResponse.json();
            if (!bookingData.success) {
                alert('Bokningen misslyckades: ' + bookingData.error);
                return;
            }

            // Decrement stock locally for added products
            if (addedProductItems.length > 0) {
                setProductStockOverrides(prev => {
                    const next = { ...prev };
                    addedProductItems.forEach((p: any) => {
                        const matching = products.find((prod: any) => prod.id === p.id);
                        if (matching) {
                            const currentStock = next[matching.id] !== undefined ? next[matching.id] : (typeof matching.stock === 'number' ? matching.stock : (parseInt(matching.stock, 10) || 0));
                            next[matching.id] = Math.max(0, currentStock - 1);
                        }
                    });
                    return next;
                });
            }

            // 2. Handle Payment Redirect if needed (gift card & Glowpoints are deducted in Stripe webhook on payment completion)
            if (isStripePayment) {
                try {
                    const checkoutResponse = await fetch('/api/bookings/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            appointmentId: bookingData.appointmentId,
                            salonId: salon.id,
                            serviceName: selectedService.name,
                            price: finalTotal,
                            customerEmail: customerInfo.email,
                            customerId: customerInfo.id || undefined,
                            giftCardCode: appliedGiftCardCode || undefined,
                            giftCardDiscount: appliedGiftCardDiscount || undefined,
                            rewardInfo: useGlowpoints ? selectedReward : null
                        }),
                    });
                    const checkoutData = await checkoutResponse.json();
                    if (!checkoutResponse.ok || checkoutData.error) {
                        throw new Error(checkoutData.error || 'Betalningsanslutningen misslyckades.');
                    }
                    if (checkoutData.url) {
                        window.location.href = checkoutData.url;
                        return;
                    } else {
                        throw new Error('Ingen betalningslänk returnerades från Stripe.');
                    }
                } catch (checkoutErr: any) {
                    if (bookingData.appointmentId) {
                        await fetch('/api/bookings/cancel-pending', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ appointmentId: bookingData.appointmentId })
                        }).catch(() => {});
                    }
                    alert('Kunde inte genomföra betalning: ' + checkoutErr.message);
                    return;
                }
            }

            // 4. Success state for non-redirect payments
            if (bookingData.appointment) {
                setSuccessAppointment(bookingData.appointment);
            }
            setIsBooked(true);

            // Add the new appointment to the local salon.appointments state for immediate local update

            const mappedApt = {
                id: bookingData.appointmentId || Date.now().toString(),
                clientName: `${customerInfo.firstName} ${customerInfo.lastName}`,
                clientEmail: customerInfo.email,
                clientPhone: customerInfo.phone,
                service: selectedService.name,
                startTime: selectedTime.time,
                duration: selectedService.duration || 30,
                dayIndex: selectedTime.dayIndex,
                price: finalTotal,
                status: 'confirmed',
                practitionerId: selectedPractitioner?.id || 'owner',
                start_time,
                end_time,
                color: 'bg-pink-100/95 dark:bg-pink-950/40 border-pink-300 dark:border-pink-800/60 text-pink-800 dark:text-pink-300 shadow-sm'
            };
            setSalon((prev: any) => {
                if (!prev || prev === 'not_found') return prev;
                return {
                    ...prev,
                    appointments: [...(prev.appointments || []), mappedApt]
                };
            });

            // 5. Local sync for immediate visibility (Demo & Testing)
            try {
                // Sync to localStorage (Used by provider calendar & dashboard)
                const localSalon = localStorage.getItem('glowbook_salon');
                if (localSalon) {
                    const data = JSON.parse(localSalon);
                    if (data.id === salon.id) {
                        const newApt = {
                            id: bookingData.appointmentId || Date.now().toString(),
                            clientName: `${customerInfo.firstName} ${customerInfo.lastName}`,
                            clientEmail: customerInfo.email,
                            clientPhone: customerInfo.phone,
                            service: selectedService.name,
                            startTime: selectedTime.time,
                            duration: selectedService.duration || 30,
                            dayIndex: selectedTime.dayIndex,
                            price: finalTotal,
                            status: 'confirmed',
                            practitionerId: selectedPractitioner?.id || 'owner',
                            start_time,
                            end_time,
                            color: 'bg-pink-100/95 dark:bg-pink-950/40 border-pink-300 dark:border-pink-800/60 text-pink-800 dark:text-pink-300 shadow-sm'
                        };
                        data.appointments = [...(data.appointments || []), newApt];
                        localStorage.setItem('glowbook_salon', JSON.stringify(data));
                    }
                }

                // Sync to sessionStorage
                const legacySalon = sessionStorage.getItem('glowbook_salon');
                if (legacySalon) {
                    const data = JSON.parse(legacySalon);
                    if (data.id === salon.id) {
                        const newApt = {
                            id: bookingData.appointmentId || Date.now().toString(),
                            clientName: `${customerInfo.firstName} ${customerInfo.lastName}`,
                            clientEmail: customerInfo.email,
                            clientPhone: customerInfo.phone,
                            service: selectedService.name,
                            startTime: selectedTime.time,
                            duration: selectedService.duration || 30,
                            dayIndex: selectedTime.dayIndex,
                            price: finalTotal,
                            status: 'confirmed',
                            practitionerId: selectedPractitioner?.id || 'owner',
                            start_time,
                            end_time,
                            color: 'bg-pink-100/95 dark:bg-pink-950/40 border-pink-300 dark:border-pink-800/60 text-pink-800 dark:text-pink-300 shadow-sm'
                        };
                        data.appointments = [...(data.appointments || []), newApt];
                        sessionStorage.setItem('glowbook_salon', JSON.stringify(data));
                    }
                }
            } catch (e) { console.error('Local sync failed:', e); }

            window.dispatchEvent(new Event('glowbook_update'));

        } catch (error) {
            console.error('Booking error:', error);
            alert('Ett oväntat fel uppstod vid bokningen.');
        } finally {
            setIsBooking(false);
        }
    };

    useEffect(() => {
        const loadSalon = async () => {
            let salonId = params?.id || searchParams.get('id') || '';
            if (!salonId) {
                setSalon('not_found');
                setStatus('ready');
                return;
            }

            // Helper to hydrate a salon object from an API result
            const hydrateSalon = (s: any, loyaltyActive = false) => ({
                ...s,
                appointments: (s.appointments || []).map(mapDbAppointment),
                profileImage: s.logo_url || s.profileImage,
                backgroundImage: s.banner_url || s.backgroundImage,
                tier: (s.membership_tier || s.tier || 'bas').toLowerCase(),
                acceptsGlowpoints: s.is_rewards_enabled !== undefined ? Boolean(s.is_rewards_enabled) : loyaltyActive,
                custom_rewards: s.custom_rewards || s.customRewards || null,
                isVerified: s.is_verified !== undefined ? s.is_verified : (s.isVerified || false),
                is_verified: s.is_verified !== undefined ? s.is_verified : (s.isVerified || false),
                verifiedCategories: s.verified_categories || s.verifiedCategories || []
            });

            // Helper to do a full GET by ID (includes appointments)
            const fetchById = async (id: string) => {
                try {
                    const res = await fetch(`/api/salons/get?id=${encodeURIComponent(id)}`);
                    const data = await res.json();
                    if (data.success && data.salon) return data.salon;
                } catch { }
                return null;
            };

            // Helper to do a GET by slug
            const fetchBySlug = async (slug: string) => {
                try {
                    const res = await fetch(`/api/salons/get?slug=${encodeURIComponent(slug)}`);
                    const data = await res.json();
                    if (data.success && data.salon) return data.salon;
                } catch { }
                return null;
            };

            // Normalize using shared slug transliteration (å/ä/ö safe)
            const normalized = slugifySalonName(salonId) || salonId.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const isUuid = salonId.length > 30;

            try {
                let found: any = null;

                // 1. Try by ID if it looks like a UUID, else try by slug
                if (isUuid) {
                    found = await fetchById(salonId);
                } else {
                    found = await fetchBySlug(normalized);
                    if (!found && salonId !== normalized) {
                        found = await fetchBySlug(salonId);
                    }
                }

                // 2. If slug failed, also try by ID (handles cases where URL is a short UUID)
                if (!found && !isUuid) {
                    found = await fetchById(normalized);
                }

                // 3. If still not found, search by name and do a follow-up GET for full data
                if (!found) {
                    const searchRes = await fetch(`/api/salons/list?q=${encodeURIComponent(normalized)}`);
                    const searchData = await searchRes.json();
                    if (searchData.success && searchData.salons?.length > 0) {
                        found = await fetchById(searchData.salons[0].id);
                    }
                }

                if (found) {
                    const validStatuses = ['active', 'trialing', 'canceling'];
                    if (found.subscription_status && !validStatuses.includes(found.subscription_status)) {
                        setSalon('inactive');
                        setStatus('ready');
                        return;
                    }
                    let loyaltyActive = found.is_rewards_enabled ?? false;
                    try {
                        const loyaltyRaw = localStorage.getItem(`glowbook_loyalty_config_${found.id}`);
                        if (loyaltyRaw) loyaltyActive = JSON.parse(loyaltyRaw).enabled === true;
                    } catch { }
                    setSalon(hydrateSalon(found, loyaltyActive));
                    setStatus('ready');
                    return;
                }
            } catch (error) {
                console.error('Failed to load salon from DB:', error);
            }

            // 4. Last resort: local storage (for providers testing on their own device)
            const saved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
            if (saved) {
                try {
                    const localData = JSON.parse(saved);
                    const localSlug = localData.name
                        ? slugifySalonName(localData.name)
                        : '';
                    if (
                        localData.id === salonId ||
                        localData.slug === salonId ||
                        localSlug === normalized ||
                        localData.id === normalized
                    ) {
                        const validStatuses = ['active', 'trialing', 'canceling'];
                        if (localData.subscription_status && !validStatuses.includes(localData.subscription_status)) {
                            setSalon('inactive');
                            setStatus('ready');
                            return;
                        }
                        setSalon(hydrateSalon(localData));
                        setStatus('ready');
                        return;
                    }
                } catch { }
            }
            
            setSalon('not_found');
            setStatus('ready');
        };

        loadSalon();
    }, [params?.id]);

    const handleServiceSelect = (service: any) => {
        setSelectedService(service);
        setSelectedPractitioner(null);

        // Try to find practitioners with active schedules and assigned to this service
        const allowedIds = service.practitionerIds || [];
        const serviceCat = getServiceCategory(service, salon?.category);
        const allPractitioners = salon?.practitioners || [];

        // A practitioner qualifies if: 
        // 1. Matches service.practitionerIds IF defined
        // 2. OR matches service category IF no specific IDs defined
        const qualified = allPractitioners.filter((p: any) => {
            const schedule = p.schedule || {};
            const hasSchedule = Object.values(schedule).some((day: any) => day && day.active === true);
            if (!hasSchedule) return false;

            if (allowedIds.length > 0) {
                return allowedIds.includes(p.id);
            }

            const pCats = p.categories || [];
            if (!serviceCat) return true;
            if (pCats.length === 0) return true;
            return pCats.includes(serviceCat);
        });

        if (qualified.length >= 1) {
            setSelectedPractitioner(qualified[0]);
        } else if (allPractitioners.length > 0) {
            // Fallback: use first practitioner allowed for this service even if no schedule data yet
            if (allowedIds.length > 0) {
                const firstAllowed = allPractitioners.find((p: any) => allowedIds.includes(p.id));
                if (firstAllowed) setSelectedPractitioner(firstAllowed);
            } else {
                setSelectedPractitioner(allPractitioners[0]);
            }
        }

        setBookingStep(2);
        setIsBookingModalOpen(true);
    };

    const [computedAvailability, setComputedAvailability] = useState<any[]>([]);

    useEffect(() => {
        if (!salon || !selectedService) {
            setComputedAvailability([]);
            return;
        }
        
        let isMounted = true;
        let eventSource: EventSource | null = null;
        let retryTimeout: NodeJS.Timeout | null = null;
        
        async function fetchAvailability() {
            try {
                const targetP = selectedPractitioner ? selectedPractitioner.id : 'any';
                const url = `/api/availability?salonId=${salon.id}&serviceId=${selectedService.id}&practitionerId=${targetP}&_t=${Date.now()}`;
                const res = await fetch(url);
                const data = await res.json();
                
                if (isMounted && data.success) {
                    setComputedAvailability(data.availability);
                }
            } catch (err) {
                console.error("Failed to fetch availability", err);
            }
        }
        
        fetchAvailability();

        // Connect to Server-Sent Events for real-time synchronization
        function connectSSE() {
            if (!salon || !salon.id) return;
            try {
                eventSource = new EventSource(`/api/realtime/availability/stream?salonId=${salon.id}`);

                eventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'availability_update') {
                            console.log('[SSE] Real-time availability update received. Refreshing...');
                            fetchAvailability();
                        }
                    } catch (e) {
                        // ignore heartbeat keepalive
                    }
                };

                eventSource.onerror = (err) => {
                    if (isMounted) {
                        console.warn('[SSE] EventSource closed or errored. Retrying in 5 seconds...', err);
                        if (eventSource) {
                            eventSource.close();
                            eventSource = null;
                        }
                        retryTimeout = setTimeout(connectSSE, 5000);
                    }
                };
            } catch (err) {
                console.error('[SSE] EventSource connection setup failed:', err);
                if (isMounted) {
                    retryTimeout = setTimeout(connectSSE, 5000);
                }
            }
        }

        connectSSE();

        // Polling fallback: ensures slots that just got booked by other customers disappear
        // in real-time even on Vercel serverless where SSE EventEmitter is per-instance and
        // won't fire cross-instance. 5s polling is imperceptible to users and reliable.
        const pollInterval = setInterval(() => {
            if (isMounted) fetchAvailability();
        }, 5000);
        
        return () => {
            isMounted = false;
            if (eventSource) {
                eventSource.close();
            }
            if (retryTimeout) {
                clearTimeout(retryTimeout);
            }
            clearInterval(pollInterval);
        };
    }, [salon, selectedService, selectedPractitioner]);
    const matchingPractitioners = useMemo(() => {
        if (!selectedService || !salon) return [];
        const allowedIds = selectedService.practitionerIds || [];
        const serviceCat = getServiceCategory(selectedService, salon.category);
        const allP = salon?.practitioners || [];

        const withSchedule = allP.filter((p: any) => {
            const schedule = p.schedule || {};
            return Object.values(schedule).some((day: any) => day && day.active === true);
        });

        // If nobody has a schedule, return all practitioners
        const pool = withSchedule.length > 0 ? withSchedule : allP;

        return pool.filter((p: any) => {
            if (allowedIds.length > 0) return allowedIds.includes(p.id);

            const pCats = p.categories || [];
            if (!serviceCat) return true;
            if (pCats.length === 0) return true;
            return pCats.includes(serviceCat);
        });
    }, [selectedService, salon]);

    if (salon === 'inactive') {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-6">
                <Header />
                <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500"><Lock size={32} /></div>
                <div className="text-center space-y-2 px-6">
                    <h2 className="text-2xl font-bold text-foreground">Salongen är tillfälligt stängd</h2>
                    <p className="text-foreground/60 text-sm max-w-md">
                        Den här salongen är inte tillgänglig för bokningar just nu.
                    </p>
                </div>
                <Link href="/explore" className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-sm">Utforska andra salonger</Link>
            </div>
        );
    }

    if (salon === 'not_found') {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-6">
                <Header />
                <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500"><AlertTriangle size={32} /></div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-foreground">Salongen hittades inte</h2>
                    <p className="text-foreground/40 text-sm">Vi kunde inte ladda salongen du letade efter.</p>
                </div>
                <Link href="/explore" className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-sm">Utforska salonger</Link>
            </div>
        );
    }

    if (!salon) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Header />
                <div className="w-12 h-12 border-4 border-champagne-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // Check if salon is "NY" (joined within last 21 days)
    const isNew = (() => {
        if (salon.rating) return false;
        const joinedDate = salon.joined || salon.created_at;
        if (!joinedDate) return false;
        const daysSinceJoined = (new Date().getTime() - new Date(joinedDate).getTime()) / (1000 * 3600 * 24);
        return daysSinceJoined <= 21;
    })();

    const onSelectSlot = (date: string, time: string, practitionerId?: string) => {
        const days = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
        const dateObj = new Date(`${date}T12:00:00`);
        const dayName = days[dateObj.getDay()];
        // Mon=0, Tue=1, ..., Sun=6
        const dayIndex = (dateObj.getDay() + 6) % 7;

        setSelectedTime({ day: dayName, time, fullDate: date, dayIndex });

        // Try to assign the specific practitioner from the slot
        if (practitionerId && practitionerId !== 'owner') {
            const specificP = (salon?.practitioners || []).find((p: any) => p.id === practitionerId);
            if (specificP) {
                setSelectedPractitioner(specificP);
            }
        } else if (!selectedPractitioner && matchingPractitioners.length > 0) {
            // No practitioner was selected — auto-pick the first matching one
            setSelectedPractitioner(matchingPractitioners[0]);
        }

        setBookingStep(3);
    };

    return (
        <div className="min-h-screen bg-background">
            <Header />

            {/* Hero Section */}
            <div className="relative h-[250px] md:h-[400px] w-full mt-16 overflow-hidden">
                {salon.backgroundImage ? (
                    <img src={salon.backgroundImage} className="w-full h-full object-cover" alt="Banner" />
                ) : (
                    <div className="w-full h-full bg-champagne-100 flex items-center justify-center">
                        <span className="text-champagne-300 font-heading text-6xl opacity-50 font-bold uppercase tracking-tighter">Glowbook</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-black/20"></div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 -mt-16 md:-mt-24 relative z-10 space-y-8 md:space-y-12 pb-24">
                <div className="bg-card rounded-[32px] md:rounded-[40px] p-6 md:p-10 shadow-2xl border border-border flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start text-center md:text-left transition-colors">
                    <div className="w-32 h-32 md:w-48 md:h-48 rounded-[24px] md:rounded-[32px] overflow-hidden border-4 md:border-8 border-card shadow-xl flex-shrink-0">
                        {salon.profileImage ? (
                            <img src={salon.profileImage} className="w-full h-full object-cover" alt="Profile" />
                        ) : (
                            <div className="w-full h-full bg-premium-black flex items-center justify-center text-white text-4xl font-bold">
                                {salon.name?.charAt(0)}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                            {(() => {
                                const ignoredRoleKeywords = [
                                    'skönhet', 
                                    'skönhetssalong', 
                                    'nagelterapeut', 
                                    'hudterapeut', 
                                    'spaterapeut',
                                    'massör',
                                    'frisör',
                                    'barberare',
                                    'terapeut',
                                    'behandlare',
                                    'utförare'
                                ];
                                const allBadges = [
                                    ...(salon.category ? [salon.category] : []),
                                    ...(salon.categories || []),
                                ]
                                    .map(c => typeof c === 'string' ? c.trim() : '')
                                    .filter(c => c && !ignoredRoleKeywords.some(ign => c.toLowerCase().includes(ign)));

                                const uniqueBadges = allBadges.filter((v, i, a) => 
                                    a.findIndex(x => x.toLowerCase() === v.toLowerCase()) === i
                                );

                                const finalBadges = uniqueBadges.length > 0 ? uniqueBadges : [salon.category || 'Naglar'];

                                return finalBadges.map(cat => (
                                    <span key={cat} className="bg-champagne-100 text-champagne-700 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">{cat}</span>
                                ));
                            })()}
                            {salon.acceptsGlowpoints && (
                                <span className="flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">
                                    <Coins size={13} />
                                    Glowpoints
                                </span>
                            )}
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-champagne-500/10 rounded-lg text-sm font-black text-champagne-600">
                                <Star size={14} className={salon.rating ? "fill-current" : ""} />
                                <span>{salon.rating ? salon.rating : (isNew ? 'NY' : '-')}</span>
                                {(salon.reviewCount ?? salon.review_count) > 0 && <span className="text-foreground/40 font-normal">({salon.reviewCount ?? salon.review_count})</span>}
                            </div>
                        </div>
                        <div className="flex items-center justify-center md:justify-start gap-4">
                            <h1 className="text-3xl md:text-5xl font-heading font-bold text-foreground">{salon.name}</h1>
                            {salon.isVerified && (
                                <div className="p-1.5 bg-blue-500 text-white rounded-full shadow-lg shadow-blue-500/20" title="Verifierad Utförare">
                                    <Check size={20} strokeWidth={4} />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 text-foreground/50">
                            <div className="flex items-center gap-2">
                                <MapPin size={18} className="text-champagne-500" />
                                <span>{salon.municipality}, Sverige</span>
                            </div>
                            {(() => {
                                const availability = Array.isArray(salon.availability) ? salon.availability : [];
                                const settings = availability.find((a: any) => a && a.type === 'settings');
                                const hoursType = settings?.openingHoursType || 'dynamic';
                                const customHours = settings?.customOpeningHours || '';

                                return (
                                    <div className="flex items-center gap-2">
                                        <Clock size={18} className="text-champagne-500" />
                                        <span className="text-sm md:text-base">
                                            {hoursType === 'fixed' && customHours 
                                                ? `${t('salon_hours_open') || 'Öppet'} · ${customHours}` 
                                                : (t('salon_open_by_appointment') || 'Öppet enligt tidsbokning')}
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>


                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Services List */}
                    <div className="lg:col-span-2 space-y-12">
                        <h2 className="text-3xl font-heading font-bold text-foreground">{t('salon_services')}</h2>

                        {Object.entries(
                            (salon.services || []).reduce((acc: any, service: any) => {
                                const cat = getServiceCategory(service, salon.category) || 'Övrigt';
                                if (!acc[cat]) acc[cat] = [];
                                acc[cat].push(service);
                                return acc;
                            }, {})
                        ).map(([category, services]: [string, any]) => (
                            <div key={category} className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-px flex-1 bg-border/50"></div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/30 whitespace-nowrap">{category}</h3>
                                    <div className="h-px flex-1 bg-border/50"></div>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {services.map((service: any) => {
                                        const isOnSale = service.sale_price && (!service.sale_ends_at || new Date(service.sale_ends_at) > new Date());
                                        const displayPrice = isOnSale ? service.sale_price : service.price;

                                        return (
                                            <div
                                                key={service.id}
                                                onClick={() => handleServiceSelect(service)}
                                                className="p-5 md:p-8 rounded-[24px] md:rounded-3xl border border-border bg-card hover:border-champagne-500 hover:bg-champagne-500/5 transition-all group cursor-pointer flex justify-between items-center relative overflow-hidden"
                                            >
                                                {isOnSale && (
                                                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black uppercase tracking-tighter px-3 py-1 rounded-bl-xl shadow-lg animate-pulse">
                                                        REA
                                                    </div>
                                                )}
                                                <div className="space-y-2">
                                                    <h4 className="text-xl font-bold text-foreground">{service.name}</h4>
                                                    <p className="text-foreground/50 text-sm max-w-lg">{service.description}</p>
                                                    <div className="flex items-center gap-4 pt-2">
                                                        <span className="text-sm font-bold text-foreground/30">{service.duration} min</span>
                                                        <span className="text-xs text-foreground/20">•</span>
                                                        <div className="flex items-center gap-2">
                                                            {isOnSale && (
                                                                <span className="text-xs text-foreground/30 line-through font-medium">{service.price} {salon.currency || 'kr'}</span>
                                                            )}
                                                            <span className={clsx("text-lg font-bold", isOnSale ? "text-red-500" : "text-foreground")}>
                                                                {displayPrice} {salon.currency || 'kr'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-colors">
                                                    <ChevronRight size={24} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Products & Aftercare Section on Salon Page */}
                        {products.length > 0 && (
                            <div className="space-y-6 pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-px flex-1 bg-border/50"></div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#C2A26A] whitespace-nowrap">
                                        PRODUKTER & EFTERVÅRD
                                    </h3>
                                    <div className="h-px flex-1 bg-border/50"></div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {products.map((prod: any) => {
                                        const isSelected = selectedAddons.includes(prod.id);
                                        const stock = typeof prod.stock === 'number' ? prod.stock : (parseInt(prod.stock, 10) ?? 999);
                                        const isOutOfStock = prod.stock !== undefined && prod.stock !== null && stock <= 0;

                                        return (
                                            <div
                                                key={prod.id}
                                                className="p-5 md:p-6 rounded-3xl border border-border bg-card hover:border-[#C2A26A]/40 transition-all flex flex-col justify-between overflow-hidden group shadow-sm"
                                            >
                                                <div>
                                                    {prod.image && (
                                                        <div className="w-full h-44 rounded-2xl overflow-hidden bg-black/30 mb-3 border border-border/50">
                                                            <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                        </div>
                                                    )}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-foreground/5 text-foreground/60 border border-border/50">
                                                                {prod.category || 'Eftervård'}
                                                            </span>
                                                            {prod.brand && (
                                                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#C2A26A]/10 text-[#C2A26A] border border-[#C2A26A]/30">
                                                                    {prod.brand}
                                                                </span>
                                                            )}
                                                            {isOutOfStock && (
                                                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                                                                    Slut i lager
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-sm font-bold text-foreground">
                                                            {prod.price} {salon.currency || 'kr'}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-base font-bold text-foreground mt-2">{prod.name}</h4>
                                                    {prod.description && (
                                                        <p className="text-xs text-foreground/50 mt-1 line-clamp-2">{prod.description}</p>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingProduct(prod)}
                                                        className="mt-3 text-[11px] font-semibold text-[#C2A26A] hover:text-[#DFCA9B] flex items-center gap-1.5 transition-colors group/btn w-fit"
                                                    >
                                                        <Info size={13} className="shrink-0" />
                                                        <span className="underline-offset-4 group-hover/btn:underline">Produktinformation & innehåll</span>
                                                    </button>
                                                </div>

                                                <div className="pt-4 mt-3 border-t border-border/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                                                    <button
                                                        type="button"
                                                        disabled={isOutOfStock}
                                                        onClick={() => !isOutOfStock && addToCart(prod)}
                                                        className={clsx(
                                                            "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm",
                                                            isOutOfStock
                                                                ? "bg-foreground/5 text-foreground/40 cursor-not-allowed border border-border/50"
                                                                : "bg-[#C2A26A] hover:bg-[#DFCA9B] text-[#0B0B0C] active:scale-95"
                                                        )}
                                                    >
                                                        <ShoppingBag size={14} />
                                                        <span>{isOutOfStock ? 'Slut i lager' : 'Köp & hämta i salong'}</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={isOutOfStock && !isSelected}
                                                        onClick={() => {
                                                            if (isOutOfStock && !isSelected) return;
                                                            if (selectedAddons.includes(prod.id)) {
                                                                setSelectedAddons(prev => prev.filter(id => id !== prod.id));
                                                            } else {
                                                                setSelectedAddons(prev => [...prev, prod.id]);
                                                                if (!selectedService && salon?.services && salon.services.length > 0) {
                                                                    handleServiceSelect(salon.services[0]);
                                                                }
                                                            }
                                                        }}
                                                        className={clsx(
                                                            "px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                                                            isOutOfStock && !isSelected
                                                                ? "bg-foreground/5 text-foreground/30 border border-border/40 cursor-not-allowed"
                                                                : isSelected
                                                                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 active:scale-95"
                                                                    : "bg-foreground/5 hover:bg-foreground/10 text-foreground/80 border border-border/60 active:scale-95"
                                                        )}
                                                    >
                                                        {isSelected ? (
                                                            <>
                                                                <Check size={14} /> Vald med bokning
                                                            </>
                                                        ) : isOutOfStock ? (
                                                            <span>Slut i lager</span>
                                                        ) : (
                                                            <>
                                                                <Plus size={14} /> Välj med bokning
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* About Section */}
                    <div className="space-y-8">
                        <div className="bg-card rounded-[40px] p-10 space-y-6 border border-border">
                            {salon.description && (
                                <>
                                    <h2 className="text-2xl font-heading font-bold text-foreground">{t('salon_about')}</h2>
                                    <p className="text-foreground/60 leading-relaxed whitespace-pre-wrap">
                                        {salon.description}
                                    </p>
                                </>
                            )}
                        </div>

                        {salon.isVerified && (
                            <div className="bg-card rounded-[40px] p-10 space-y-4 border border-blue-500/20 bg-gradient-to-br from-blue-500/[0.02] to-transparent shadow-lg shadow-blue-500/[0.01]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                        <Shield size={20} className="fill-blue-500/20 text-blue-500 shrink-0" />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground">Glowbook-verifierad utförare</h3>
                                </div>
                                <p className="text-xs text-foreground/55 leading-relaxed">
                                    Denna salong är trygghetstestad och manuellt godkänd av Glowbooks administratörer. De har uppvisat giltiga diplom och yrkesbevis för följande specialistkategorier:
                                </p>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {(salon.verifiedCategories && salon.verifiedCategories.length > 0 ? salon.verifiedCategories : ['Yrkesverksam']).map((cat: string) => (
                                        <div key={cat} className="flex items-center gap-1.5 px-4 py-2 bg-blue-500/10 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                                            <CheckCircle2 size={12} className="text-blue-500 shrink-0" />
                                            {cat}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}



                        {/* Reviews Preview */}
                        <div className="bg-card rounded-[32px] p-6 sm:p-8 space-y-6 border border-border">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/40">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-serif font-normal text-foreground">{t('salon_reviews')}</h2>
                                    {reviews.length > 0 && (
                                        <p className="text-[11px] text-foreground/45 mt-0.5">
                                            Baserat på {reviews.length} {reviews.length === 1 ? 'kundrecension' : 'kundrecensioner'}
                                        </p>
                                    )}
                                </div>
                                {reviews.length > 0 && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-foreground/[0.03] border border-border/40 w-fit">
                                        <div className="flex text-[#C2A26A] gap-0.5">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Star
                                                    key={i}
                                                    size={14}
                                                    fill={i < Math.round(salon.rating || 0) ? "currentColor" : "none"}
                                                    className={i < Math.round(salon.rating || 0) ? "text-[#C2A26A]" : "text-foreground/20"}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xs font-bold text-foreground">{salon.rating} / 5</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-6">
                                {reviews.length === 0 ? (
                                    <div className="py-8 text-center space-y-3">
                                        <div className="w-12 h-12 bg-foreground/5 rounded-full flex items-center justify-center mx-auto text-foreground/20">
                                            <Star size={20} />
                                        </div>
                                        <p className="text-xs text-foreground/40 italic">Inga recensioner än för {salon.name}.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-6 divide-y divide-border/30">
                                        {reviews.map((rev: any, index: number) => {
                                            const sName = (rev.serviceName || '').trim();
                                            const isProd = sName.toLowerCase().startsWith('produktorder') || sName.toLowerCase().includes('produktorder');
                                            let displayService = sName;
                                            if (isProd) {
                                                const match = sName.match(/produktorder\s*\(([^)]+)\)/i);
                                                displayService = match ? match[1] : sName.replace(/produktorder\s*:?/i, '').trim();
                                            }

                                            return (
                                                <div key={rev.id || index} className={clsx("space-y-3", index > 0 && "pt-6 border-t border-border/30")}>
                                                    <div className="flex justify-between items-start gap-3">
                                                        <div>
                                                            <span className="font-bold text-foreground flex items-center gap-2 text-sm md:text-base">
                                                                {rev.customerName}
                                                                <span className="text-[9px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-bold border border-green-500/20 inline-flex items-center gap-1">
                                                                    ✓ Verifierad kund
                                                                </span>
                                                            </span>
                                                            <span className="text-[11px] text-foreground/40 block mt-0.5">
                                                                {isProd ? `Köpte ${displayService}` : `Bokade ${displayService}`}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] text-foreground/35 shrink-0">
                                                            {new Date(rev.date).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <div className="flex text-[#C2A26A] gap-0.5">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                size={13}
                                                                fill={i < rev.rating ? "currentColor" : "none"}
                                                                className={i < rev.rating ? "text-[#C2A26A]" : "text-foreground/20"}
                                                            />
                                                        ))}
                                                    </div>
                                                    {rev.text && (
                                                        <p className="text-xs md:text-sm text-foreground/70 leading-relaxed bg-foreground/[0.01] p-4 rounded-2xl border border-border/20 italic">
                                                            &quot;{rev.text}&quot;
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Image Gallery */}
                {(salon.galleryImages || []).length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-px flex-1 bg-border/30"></div>
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/25 flex items-center gap-2">
                                <ImageIcon size={12} /> Vårt arbete
                            </h2>
                            <div className="h-px flex-1 bg-border/30"></div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {(salon.galleryImages as string[]).map((img: string, idx: number) => {
                                // First image is larger
                                const isFeature = idx === 0;
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => setGalleryLightbox(idx)}
                                        className={`relative overflow-hidden rounded-2xl cursor-pointer group border border-border/50 hover:border-champagne-500/50 transition-all duration-500 hover:shadow-xl hover:shadow-champagne-500/10 ${isFeature ? 'md:col-span-2 md:row-span-2' : ''
                                            }`}
                                    >
                                        <div className={`${isFeature ? 'aspect-square' : 'aspect-[4/3]'} w-full`}>
                                            <img
                                                src={img}
                                                alt={`${salon.name} - bild ${idx + 1}`}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                            />
                                        </div>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-black/70 backdrop-blur-sm text-foreground text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                                            Visa
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Gallery Lightbox */}
                <AnimatePresence>
                    {galleryLightbox !== null && salon.galleryImages && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
                            onClick={() => setGalleryLightbox(null)}
                        >
                            {/* Close */}
                            <button
                                onClick={() => setGalleryLightbox(null)}
                                className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all z-10"
                            >
                                <X size={24} />
                            </button>

                            {/* Prev */}
                            {galleryLightbox > 0 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setGalleryLightbox(galleryLightbox - 1); }}
                                    className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all z-10"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                            )}

                            {/* Next */}
                            {galleryLightbox < (salon.galleryImages as string[]).length - 1 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setGalleryLightbox(galleryLightbox + 1); }}
                                    className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all z-10"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            )}

                            {/* Image */}
                            <motion.img
                                key={galleryLightbox}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                src={(salon.galleryImages as string[])[galleryLightbox]}
                                alt={`Bild ${galleryLightbox + 1}`}
                                className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            />

                            {/* Counter */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm text-white text-xs font-bold px-4 py-2 rounded-full">
                                {galleryLightbox + 1} / {(salon.galleryImages as string[]).length}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="bg-card rounded-3xl p-1.5 border border-border overflow-hidden group">
                    <div className="relative h-[320px] rounded-[20px] overflow-hidden bg-foreground/[0.03] shadow-inner">
                        <iframe
                            title={`Karta - ${salon.name || 'Salong'}`}
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            style={{ border: 0 }}
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(`${salon.address || ''}, ${salon.municipality || ''}`)}&output=embed`}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            className="w-full h-full border-0 saturate-[1.1] contrast-110 opacity-90 group-hover:opacity-100 transition-all duration-700"
                        ></iframe>

                        {/* Compact Overlay */}
                        <div className="absolute inset-x-4 bottom-4 flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-background/50 backdrop-blur-2xl rounded-2xl border border-white/15 shadow-xl transition-all duration-500 group-hover:bg-background/70">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-foreground text-background rounded-xl flex items-center justify-center shadow-lg shrink-0">
                                    <MapPin size={18} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/40 leading-none mb-0.5">Hitta till oss</p>
                                    <h3 className="text-base font-bold text-foreground tracking-tight">{salon.address}</h3>
                                    <p className="text-xs font-medium text-foreground/50">{salon.municipality}, Sverige</p>
                                </div>
                            </div>

                            <Link
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${salon.address}, ${salon.municipality}`)}`}
                                target="_blank"
                                className="h-10 px-6 bg-foreground text-background text-[10px] font-black uppercase tracking-[0.15em] rounded-xl hover:bg-champagne-600 hover:text-white transition-all flex items-center gap-2 shadow-lg group/btn whitespace-nowrap"
                            >
                                <ExternalLink size={14} className="group-hover/btn:rotate-12 transition-transform" />
                                {t('salon_directions')}
                            </Link>
                        </div>

                        {!salon.address && (
                            <div className="absolute inset-0 bg-background/85 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-foreground/5 border border-border flex items-center justify-center text-foreground/60 mb-3">
                                    <MapPin size={22} />
                                </div>
                                <h3 className="text-base font-bold text-foreground tracking-tight">Exakt adress ej angiven</h3>
                                <p className="text-foreground/50 mt-1 text-xs font-medium">
                                    {salon.municipality ? `Område: ${salon.municipality}, Sverige` : 'Kontakta salongen för exakt vägbeskrivning.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Booking Modal */}
            <AnimatePresence>
                {isBookingModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-6 bg-background/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 100 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 100 }}
                            className="bg-card rounded-t-[32px] md:rounded-[40px] w-full max-w-5xl h-[95vh] md:h-[90vh] shadow-2xl flex flex-col relative overflow-hidden border border-border"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-champagne-300 via-pink-200 to-champagne-300"></div>

                            <div className="p-5 md:p-8 border-b border-border flex justify-between items-center bg-foreground/[0.02]">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-foreground text-background rounded-xl md:rounded-2xl flex items-center justify-center font-bold text-sm md:text-base">
                                        {bookingStep}
                                    </div>
                                    <div>
                                        <h3 className="text-lg md:text-2xl font-bold text-foreground">{bookingStep === 2 ? t('salon_choose_time') : t('salon_confirm_booking')}</h3>
                                        <span className="text-foreground/40 text-[10px] md:text-sm">
                                            {selectedService?.name} • {
                                                (selectedService?.sale_price && (!selectedService?.sale_ends_at || new Date(selectedService.sale_ends_at) > new Date()))
                                                    ? <span className="text-red-500 font-bold">{selectedService.sale_price} {salon.currency || 'kr'}</span>
                                                    : <span>{selectedService?.price} {salon.currency || 'kr'}</span>
                                            }
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => setIsBookingModalOpen(false)} className="p-2 md:p-3 hover:bg-foreground/5 rounded-full transition-colors text-foreground/40">
                                    <X size={20} />
                                </button>
                            </div>

                            <div ref={modalScrollRef} className="flex-1 overflow-auto p-5 md:p-8 bg-card no-scrollbar">
                                {bookingStep === 2 ? (
                                    <div className="space-y-8">
                                        <div className="bg-champagne-50/70 dark:bg-champagne-950/30 p-5 rounded-3xl border border-champagne-200 dark:border-champagne-900/40 flex items-center gap-3.5 text-neutral-950 dark:text-neutral-50 shadow-sm">
                                             <span className="w-8 h-8 rounded-full bg-champagne-500/10 text-champagne-600 dark:text-champagne-400 flex items-center justify-center text-base shrink-0 font-bold">📅</span>
                                             <p className="text-xs sm:text-sm font-semibold tracking-wide leading-relaxed">Bokningsbar tid visas i kalendern nedan. Klicka på en ledig tid för att välja.</p>
                                         </div>

                                        {/* Practitioner Selection — shown when multiple practitioners match */}
                                        {matchingPractitioners.length > 1 && (
                                            <div className="space-y-4">
                                                <h4 className="text-sm font-bold text-foreground/40 uppercase tracking-widest pl-1">{t('salon_choose_provider')}</h4>
                                                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                                                    {matchingPractitioners.map((p: any) => (
                                                        <div
                                                            key={p.id}
                                                            onClick={() => setSelectedPractitioner(p)}
                                                            className={clsx(
                                                                "shrink-0 p-4 rounded-3xl border transition-all cursor-pointer flex flex-col items-center gap-3 w-40",
                                                                selectedPractitioner?.id === p.id
                                                                    ? "border-champagne-500 bg-champagne-500/5 ring-1 ring-champagne-500"
                                                                    : "border-border bg-card hover:border-foreground/10"
                                                            )}
                                                        >
                                                            {p.image ? (
                                                                 <img src={p.image} alt={p.name} className="w-16 h-16 rounded-full object-cover shadow-md" />
                                                             ) : (
                                                                 <div className="w-16 h-16 rounded-full bg-foreground/5 text-foreground/40 flex items-center justify-center font-bold text-xl">
                                                                     {p.name.charAt(0)}
                                                                 </div>
                                                             )}
                                                            <div className="text-center">
                                                                <h5 className="text-sm font-bold text-foreground">{p.name}</h5>
                                                                <p className="text-[10px] text-foreground/40 font-medium uppercase tracking-wider">{p.role}</p>
                                                                <div className="flex flex-wrap gap-1 justify-center mt-2">
                                                                    {(p.categories || []).slice(0, 2).map((cat: string) => (
                                                                        <span key={cat} className="px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[7px] font-bold rounded-md uppercase tracking-tighter">
                                                                            {cat}
                                                                        </span>
                                                                    ))}
                                                                    {(p.categories || []).length > 2 && (
                                                                        <span className="text-[7px] text-foreground/30 font-bold">+{p.categories.length - 2}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {matchingPractitioners.length > 0 && (
                                                        <div
                                                            onClick={() => setSelectedPractitioner({ id: 'any', name: 'Vem som helst', role: 'Snabbast tid' })}
                                                            className={clsx(
                                                                "shrink-0 p-4 rounded-3xl border transition-all cursor-pointer flex flex-col items-center gap-3 w-40",
                                                                selectedPractitioner?.id === 'any'
                                                                    ? "border-champagne-500 bg-champagne-500/5 ring-1 ring-champagne-500"
                                                                    : "border-border bg-card hover:border-foreground/10"
                                                            )}
                                                        >
                                                            <div className="w-16 h-16 rounded-full bg-foreground/5 text-foreground/40 flex items-center justify-center font-bold">
                                                                <Users size={24} />
                                                            </div>
                                                            <div className="text-center">
                                                                <h5 className="text-sm font-bold text-foreground">Vem som helst</h5>
                                                                <p className="text-[10px] text-foreground/40 font-medium uppercase tracking-wider">Snabbast tid</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {matchingPractitioners.length === 0 && (
                                                        <div className="flex-1 p-6 bg-red-500/5 border border-red-500/20 rounded-3xl text-red-500 text-sm font-medium">
                                                            Ingen utförare hittades som utför denna tjänst.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        <Calendar
                                            availability={computedAvailability}
                                            appointments={salon?.appointments}
                                            onSelectSlot={onSelectSlot}
                                            hideAppointments={true}
                                            initialScrollHour={10}
                                        />
                                    </div>
                                ) : (
                                    <div className="max-w-4xl mx-auto py-8 space-y-10">
                                        <div className="text-center space-y-4">
                                            <h2 className="text-3xl font-heading font-bold text-foreground">{t('booking_your_info')}</h2>
                                            <p className="text-foreground/40 text-sm">{t('booking_fill_info_desc')}</p>
                                        </div>

                                        {/* Elegant Provider Warning Banner */}
                                        {isProviderLoggedIn && (
                                            <div className="max-w-2xl mx-auto bg-amber-500/5 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-3xl p-5 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                                <span className="text-xl">⚠️</span>
                                                <div className="space-y-1 text-left">
                                                    <h4 className="text-sm font-bold">{t('booking_provider_warning_title')}</h4>
                                                    <p className="text-xs opacity-90 leading-relaxed">
                                                        {t('booking_provider_warning_desc')}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Elegant Customer Login Banner if not logged in */}
                                        {!isCustomerLoggedIn && (
                                            <div className="max-w-2xl mx-auto bg-champagne-500/5 border border-champagne-500/15 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="space-y-1">
                                                    <h4 className="text-sm font-bold text-foreground">{t('booking_customer_login_prompt')}</h4>
                                                    <p className="text-xs text-foreground/50 leading-relaxed">{t('booking_customer_login_sub')}</p>
                                                </div>
                                                <Link
                                                    href="/auth/login"
                                                    className="bg-foreground text-background px-5 py-2.5 rounded-2xl text-xs font-bold hover:bg-champagne-600 hover:text-white transition-all shadow-md shrink-0"
                                                >
                                                    Logga in
                                                </Link>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                {/* Customer Form */}
                                                <div className="lg:col-span-3 space-y-6">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30 pl-1">{t('booking_first_name')}</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Erik"
                                                                value={customerInfo.firstName}
                                                                onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })}
                                                                className={clsx(
                                                                    "w-full bg-foreground/[0.03] border rounded-2xl px-5 py-4 focus:border-champagne-500 outline-none transition-all",
                                                                    customerInfo.firstName && customerInfo.firstName.trim().length < 2 ? "border-red-500/50" : "border-border"
                                                                )}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30 pl-1">{t('booking_last_name')}</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Andersson"
                                                                value={customerInfo.lastName}
                                                                onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
                                                                className={clsx(
                                                                    "w-full bg-foreground/[0.03] border rounded-2xl px-5 py-4 focus:border-champagne-500 outline-none transition-all",
                                                                    customerInfo.lastName && customerInfo.lastName.trim().length < 2 ? "border-red-500/50" : "border-border"
                                                                )}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30 pl-1">{t('booking_email')}</label>
                                                        <input
                                                            type="email"
                                                            placeholder="erik.a@example.com"
                                                            value={customerInfo.email}
                                                            onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                                                            className={clsx(
                                                                "w-full bg-foreground/[0.03] border rounded-2xl px-5 py-4 focus:border-champagne-500 outline-none transition-all",
                                                                customerInfo.email && !validateEmail(customerInfo.email) ? "border-red-500/50" : "border-border"
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30 pl-1">{t('booking_phone')}</label>
                                                        <input
                                                            type="tel"
                                                            placeholder="070-000 00 00"
                                                            value={customerInfo.phone}
                                                            onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                                            className={clsx(
                                                                "w-full bg-foreground/[0.03] border rounded-2xl px-5 py-4 focus:border-champagne-500 outline-none transition-all",
                                                                customerInfo.phone && !validatePhone(customerInfo.phone) ? "border-red-500/50" : "border-border"
                                                            )}
                                                        />
                                                    </div>

                                                    {/* Smart Aftercare / Product Recommendation in Checkout */}
                                                    {products.length > 0 && (
                                                        <div className="space-y-3 pt-6 border-t border-border">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#C2A26A] flex items-center gap-1.5">
                                                                    <Package size={14} /> Rekommenderad eftervård & tillval
                                                                </h4>
                                                                <span className="text-[10px] text-foreground/40 font-medium">Fås direkt på salongen</span>
                                                            </div>

                                                            <div className="grid grid-cols-1 gap-2.5">
                                                                {products.map((prod: any) => {
                                                                    const isSelected = selectedAddons.includes(prod.id);
                                                                    const stock = typeof prod.stock === 'number' ? prod.stock : (parseInt(prod.stock, 10) ?? 999);
                                                                    const isOutOfStock = prod.stock !== undefined && prod.stock !== null && stock <= 0;

                                                                    return (
                                                                        <div
                                                                            key={prod.id}
                                                                            className={clsx(
                                                                                "p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3",
                                                                                isSelected 
                                                                                    ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30"
                                                                                    : "bg-foreground/[0.02] border-border hover:border-[#C2A26A]/40"
                                                                            )}
                                                                        >
                                                                            <div className="flex items-center gap-3 min-w-0">
                                                                                {prod.image ? (
                                                                                    <img src={prod.image} alt={prod.name} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-border" />
                                                                                ) : (
                                                                                    <div className="w-12 h-12 rounded-xl bg-foreground/5 flex items-center justify-center text-foreground/40 shrink-0">
                                                                                        <Package size={20} />
                                                                                    </div>
                                                                                )}
                                                                                <div className="min-w-0">
                                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                                        {prod.brand && (
                                                                                            <span className="text-[9px] uppercase font-bold tracking-wider text-[#C2A26A] bg-[#C2A26A]/10 px-1.5 py-0.5 rounded border border-[#C2A26A]/20">
                                                                                                {prod.brand}
                                                                                            </span>
                                                                                        )}
                                                                                        {isOutOfStock && (
                                                                                            <span className="text-[9px] uppercase font-bold tracking-wider text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                                                                                                Slut i lager
                                                                                            </span>
                                                                                        )}
                                                                                        <p className="text-xs font-bold text-foreground truncate">{prod.name}</p>
                                                                                    </div>
                                                                                    <p className="text-[11px] text-[#C2A26A] line-clamp-1 italic font-medium">
                                                                                        {(prod.recommendation || `Bästa hållbarhet för din behandling`).replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim()}
                                                                                    </p>
                                                                                    <div className="flex items-center gap-2.5 mt-0.5">
                                                                                        <p className="text-xs font-semibold text-foreground/70">
                                                                                            +{prod.price} {salon.currency || 'kr'}
                                                                                        </p>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => setViewingProduct(prod)}
                                                                                            className="text-[10px] text-foreground/50 hover:text-[#C2A26A] underline flex items-center gap-1 transition-colors"
                                                                                        >
                                                                                            <Info size={11} /> Se innehåll & info
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <button
                                                                                type="button"
                                                                                disabled={isOutOfStock && !isSelected}
                                                                                onClick={() => {
                                                                                    if (isOutOfStock && !isSelected) return;
                                                                                    if (isSelected) {
                                                                                        setSelectedAddons(prev => prev.filter(id => id !== prod.id));
                                                                                    } else {
                                                                                        setSelectedAddons(prev => [...prev, prod.id]);
                                                                                    }
                                                                                }}
                                                                                className={clsx(
                                                                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1",
                                                                                    isOutOfStock && !isSelected
                                                                                        ? "bg-foreground/5 text-foreground/30 border border-border/40 cursor-not-allowed"
                                                                                        : isSelected
                                                                                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 active:scale-95"
                                                                                            : "bg-foreground/5 hover:bg-[#C2A26A] hover:text-[#0B0B0C] text-foreground border border-border/50 active:scale-95"
                                                                                )}
                                                                            >
                                                                                {isSelected ? <Check size={14} /> : isOutOfStock ? null : <Plus size={14} />}
                                                                                <span>{isSelected ? 'Tillagd' : isOutOfStock ? 'Slut i lager' : 'Köp till'}</span>
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="space-y-4 pt-4">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/30 pl-1">{t('booking_payment_method')}</h4>
                                                        <div className="grid grid-cols-1 gap-3">
                                                            <div
                                                                onClick={() => setSelectedPaymentMethod('onsite')}
                                                                className={clsx(
                                                                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4",
                                                                    selectedPaymentMethod === 'onsite'
                                                                        ? "border-champagne-500 bg-champagne-500/5 ring-1 ring-champagne-500"
                                                                        : "border-border bg-card hover:border-foreground/10"
                                                                )}
                                                            >
                                                                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", selectedPaymentMethod === 'onsite' ? "bg-champagne-500 text-white" : "bg-foreground/5 text-foreground/40")}>
                                                                    <Wallet size={20} />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <h5 className="font-bold text-sm">Betala på plats</h5>
                                                                    <p className="text-[10px] text-foreground/40 font-medium">Kort, Swish eller kontant</p>
                                                                </div>
                                                            </div>

                                                            {salon.stripe_account_id && (
                                                                <div
                                                                    onClick={() => setSelectedPaymentMethod('stripe')}
                                                                    className={clsx(
                                                                        "p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4",
                                                                        selectedPaymentMethod === 'stripe'
                                                                            ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500"
                                                                            : "border-border bg-card hover:border-blue-500/10"
                                                                    )}
                                                                >
                                                                    <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", selectedPaymentMethod === 'stripe' ? "bg-blue-500 text-white" : "bg-foreground/5 text-foreground/40")}>
                                                                        <CreditCard size={20} />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <h5 className="font-bold text-sm">{t('booking_pay_stripe')}</h5>
                                                                            <span className="inline-flex items-center gap-1 text-[8px] bg-[#FFB3C7] text-black px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                                                <svg viewBox="0 0 24 24" width="8" height="8" fill="currentColor" className="inline-block">
                                                                                    <path d="M21.5 17a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM4.592 2v20H0V2h4.592zm11.46 0c0 4.194-1.583 8.105-4.415 11.068l-.278.283L17.702 22h-5.668l-6.893-9.4 1.779-1.332c2.858-2.14 4.535-5.378 4.637-8.924L11.562 2h4.49z" />
                                                                                </svg>
                                                                                Klarna
                                                                            </span>
                                                                            <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-widest">{t('booking_secure_payment')}</span>
                                                                        </div>
                                                                        <p className="text-[10px] text-foreground/40 font-medium">{t('booking_pay_stripe_desc')}</p>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div
                                                                onClick={() => setSelectedPaymentMethod('giftcard')}
                                                                className={clsx(
                                                                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4",
                                                                    selectedPaymentMethod === 'giftcard'
                                                                        ? "border-champagne-500 bg-champagne-500/5 ring-1 ring-champagne-500"
                                                                        : "border-border bg-card hover:border-foreground/10"
                                                                )}
                                                            >
                                                                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", selectedPaymentMethod === 'giftcard' ? "bg-champagne-500 text-white" : "bg-foreground/5 text-foreground/40")}>
                                                                    <Coins size={20} />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <h5 className="font-bold text-sm">{t('booking_giftcard')}</h5>
                                                                    <p className="text-[10px] text-foreground/40 font-medium">{t('booking_giftcard_desc')}</p>
                                                                </div>
                                                            </div>

                                                            {selectedPaymentMethod === 'giftcard' && (
                                                                <div className="p-4 rounded-2xl border border-champagne-500/20 bg-champagne-500/5 space-y-3">
                                                                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30">{t('booking_enter_giftcard_code')}</label>
                                                                    <div className="flex gap-2">
                                                                        <input
                                                                            type="text"
                                                                            value={giftCardCode}
                                                                            onChange={e => setGiftCardCode(e.target.value.toUpperCase())}
                                                                            placeholder="GLOW-XXXX-XXXX"
                                                                            className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm font-mono tracking-widest outline-none focus:border-champagne-500 transition-all placeholder:text-foreground/15"
                                                                        />
                                                                        <button
                                                                            onClick={() => validateGiftCard(giftCardCode)}
                                                                            className="px-4 py-3 bg-foreground text-background rounded-xl text-xs font-bold hover:bg-champagne-600 hover:text-white transition-all whitespace-nowrap"
                                                                        >
                                                                            Validera
                                                                        </button>
                                                                    </div>
                                                                    {giftCardStatus && (
                                                                        <div className={clsx(
                                                                            "flex items-center gap-2 text-xs font-bold p-3 rounded-xl",
                                                                            giftCardStatus.valid
                                                                                ? "bg-green-500/10 text-green-600 border border-green-500/20"
                                                                                : "bg-red-500/10 text-red-500 border border-red-500/20"
                                                                        )}>
                                                                            {giftCardStatus.valid ? <Check size={12} /> : <AlertTriangle size={12} />}
                                                                            {giftCardStatus.message}
                                                                        </div>
                                                                    )}

                                                                    {giftCardStatus?.valid && finalTotal > 0 && (
                                                                        <div className="mt-4 pt-4 border-t border-champagne-500/10 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">{t('booking_payment_method')}: {finalTotal} {salon.currency || 'kr'}</p>
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                                <div
                                                                                    onClick={() => setGiftCardSecondaryMethod('onsite')}
                                                                                    className={clsx(
                                                                                        "p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3",
                                                                                        giftCardSecondaryMethod === 'onsite'
                                                                                            ? "border-champagne-500 bg-champagne-500/10 text-champagne-700 ring-1 ring-champagne-500 font-bold"
                                                                                            : "border-border/60 bg-card hover:border-foreground/10 text-foreground/60"
                                                                                    )}
                                                                                >
                                                                                    <Wallet size={16} />
                                                                                    <div className="text-left">
                                                                                        <h6 className="font-bold text-xs">{t('booking_pay_onsite')}</h6>
                                                                                    </div>
                                                                                </div>
                                                                                {salon.stripe_account_id && (
                                                                                    <div
                                                                                        onClick={() => setGiftCardSecondaryMethod('stripe')}
                                                                                        className={clsx(
                                                                                            "p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3",
                                                                                            giftCardSecondaryMethod === 'stripe'
                                                                                                ? "border-blue-500 bg-blue-500/10 text-blue-700 ring-1 ring-blue-500 font-bold"
                                                                                                : "border-border/60 bg-card hover:border-blue-500/10 text-foreground/60"
                                                                                        )}
                                                                                    >
                                                                                        <CreditCard size={16} />
                                                                                        <div className="text-left flex items-center gap-2 flex-wrap">
                                                                                            <h6 className="font-bold text-xs">{t('booking_pay_stripe')}</h6>
                                                                                            <span className="inline-flex items-center gap-1 text-[8px] bg-[#FFB3C7] text-black px-1.5 py-0.5 rounded font-bold uppercase tracking-wider scale-90 origin-left">
                                                                                                <svg viewBox="0 0 24 24" width="8" height="8" fill="currentColor" className="inline-block">
                                                                                                    <path d="M21.5 17a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM4.592 2v20H0V2h4.592zm11.46 0c0 4.194-1.583 8.105-4.415 11.068l-.278.283L17.702 22h-5.668l-6.893-9.4 1.779-1.332c2.858-2.14 4.535-5.378 4.637-8.924L11.562 2h4.49z" />
                                                                                                </svg>
                                                                                                Klarna
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Glowpoints Payment / Discount Section */}
                                                        {salon?.acceptsGlowpoints && (
                                                            <div className="space-y-4 pt-6 border-t border-border mt-6">
                                                                <div className="flex items-center justify-between">
                                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                                                        <Coins size={14} /> {t('booking_pay_glowpoints')}
                                                                    </h4>
                                                                    {isCustomerLoggedIn && (
                                                                        <span className="text-[10px] font-bold text-foreground/50">{availableGlowpoints} {t('booking_points_available')}</span>
                                                                    )}
                                                                </div>

                                                                {isCustomerLoggedIn ? (
                                                                    salonRewards.filter(tier => availableGlowpoints >= tier.pointsCost).length > 0 ? (
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                            {salonRewards.filter(tier => availableGlowpoints >= tier.pointsCost).map(tier => {
                                                                                const isSelected = selectedReward?.pointsCost === tier.pointsCost;
                                                                                return (
                                                                                    <div
                                                                                        key={tier.pointsCost}
                                                                                        onClick={() => {
                                                                                            if (isSelected) {
                                                                                                setSelectedReward(null);
                                                                                                setUseGlowpoints(false);
                                                                                            } else {
                                                                                                setSelectedReward(tier);
                                                                                                setUseGlowpoints(true);
                                                                                            }
                                                                                        }}
                                                                                        className={clsx(
                                                                                            "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                                                                                            isSelected
                                                                                                ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500 shadow-md"
                                                                                                : "border-border bg-card hover:border-emerald-500/30"
                                                                                        )}
                                                                                    >
                                                                                        <div className="space-y-0.5">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <h5 className="font-bold text-xs text-foreground">{tier.discountAmount} {salon.currency || 'kr'} {t('booking_discount_label')}</h5>
                                                                                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">{tier.pointsCost}p</span>
                                                                                            </div>
                                                                                            <p className="text-[10px] text-foreground/40">{t('booking_deducted_total')}</p>
                                                                                        </div>
                                                                                        <div className={clsx(
                                                                                            "w-5 h-5 rounded-full border flex items-center justify-center text-xs transition-all",
                                                                                            isSelected
                                                                                                ? "border-emerald-600 bg-emerald-600 text-white"
                                                                                                : "border-foreground/20 text-transparent"
                                                                                        )}>
                                                                                            ✓
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="p-4 bg-emerald-500/[0.04] border border-emerald-500/20 rounded-2xl text-xs text-foreground/60 leading-relaxed">
                                                                            {t('booking_glowpoints_have')} <strong>{availableGlowpoints} {t('points_label') || 'poäng'}</strong> {t('booking_glowpoints_points_at')} {salon.name}. {t('booking_glowpoints_reach')} <strong>{salonRewards[0]?.pointsCost || 200} {t('points_label') || 'poäng'}</strong> {t('booking_glowpoints_unlock')} <strong>{salonRewards[0]?.discountAmount || 50} {salon.currency || 'kr'} {t('booking_discount_label')}</strong>!
                                                                        </div>
                                                                    )
                                                                ) : (
                                                                    <div className="p-4 bg-foreground/[0.03] border border-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                                        <p className="text-xs text-foreground/60 leading-relaxed">
                                                                            {t('booking_glowpoints_login_req')}
                                                                        </p>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                sessionStorage.setItem('glowbook_redirect_after_login', window.location.pathname);
                                                                                window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`;
                                                                            }}
                                                                            className="px-4 py-2 bg-foreground text-background text-xs font-bold rounded-xl whitespace-nowrap hover:bg-[#C2A26A] transition-all"
                                                                        >
                                                                            {t('nav_login') || 'Logga in'}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Summary Sidebar */}
                                                <div className="lg:col-span-2 space-y-6">
                                                    <div className="bg-foreground/[0.03] rounded-3xl p-6 border border-border sticky top-4 space-y-4">
                                                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground/30 border-b border-border pb-4">{t('booking_summary')}</h3>

                                                        <div className="space-y-4">
                                                            <div>
                                                                <p className="text-[10px] font-bold text-foreground/30 uppercase">{t('booking_service')}</p>
                                                                <p className="text-sm font-bold">{selectedService?.name}</p>
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-foreground/40">{selectedService?.duration} min</span>
                                                                <span className="font-bold">
                                                                    {basePrice} {salon.currency || 'kr'}
                                                                </span>
                                                            </div>

                                                            {selectedAddons.length > 0 && (
                                                                <div className="pt-2 border-t border-border/50 space-y-2">
                                                                    {selectedAddons.map(id => {
                                                                        const addon = [...(salon.addons || []), ...products].find((a: any) => a.id === id);
                                                                        return (
                                                                            <div key={id} className="flex justify-between items-center text-[10px]">
                                                                                <span className="text-foreground/40">+ {addon?.name}</span>
                                                                                <span className="font-bold text-foreground/60">{addon?.price} {salon.currency || 'kr'}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}

                                                            <div className="pt-4 border-t border-border space-y-1">
                                                                <p className="text-[10px] font-bold text-foreground/30 uppercase">{t('salon_date_time').replace(' & ', ' & Utförare')} </p>
                                                                <p className="text-sm font-bold capitalize">{selectedTime?.day}, {selectedTime?.time}</p>
                                                                <p className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest">{selectedPractitioner?.name || 'Utförare'}</p>
                                                            </div>
                                                        </div>

                                                        {useGlowpoints && selectedReward && (
                                                            <div className="pt-4 border-t border-border/50 flex justify-between items-center text-xs text-emerald-600 font-bold">
                                                                <span>{t('booking_glowpoints_discount')} ({selectedReward.pointsCost}p)</span>
                                                                <span>-{Number(selectedReward.discountAmount) || 50} {salon.currency || 'kr'}</span>
                                                            </div>
                                                        )}

                                                        {giftCardDiscount > 0 && (
                                                            <div className="pt-4 border-t border-border/50 flex justify-between items-center text-xs text-green-600 font-bold">
                                                                <span>{t('booking_giftcard')} ({giftCardCode})</span>
                                                                <span>-{giftCardDiscount} {salon.currency || 'kr'}</span>
                                                            </div>
                                                        )}

                                                        <div className="pt-4 border-t border-border flex justify-between items-end">
                                                            <span className="text-[10px] font-bold text-foreground/30 uppercase">{t('booking_total_to_pay')}</span>
                                                            <span className="text-xl font-bold">
                                                                {finalTotal} {salon.currency || 'kr'}
                                                            </span>
                                                        </div>

                                                        {/* Obligatorisk avtals- och avbokningskryssruta */}
                                                        <div className="pt-4 border-t border-border/60 space-y-2.5">
                                                            <label className="flex items-start gap-2.5 cursor-pointer group select-none">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={agreedToTerms}
                                                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                                                    className="mt-0.5 w-4 h-4 rounded border-border text-champagne-600 focus:ring-champagne-500 cursor-pointer accent-champagne-600 shrink-0"
                                                                />
                                                                <span className="text-[11px] leading-tight text-foreground/80 font-medium">
                                                                    Jag godkänner Glowbooks{' '}
                                                                    <Link href="/policies" target="_blank" className="text-champagne-600 underline font-semibold hover:text-champagne-700">
                                                                        användarvillkor
                                                                    </Link>{' '}
                                                                    och salongens{' '}
                                                                    <Link href="/policies#avbokning-och-no-show" target="_blank" className="text-champagne-600 underline font-semibold hover:text-champagne-700">
                                                                        avbokningspolicy
                                                                    </Link>
                                                                    .
                                                                </span>
                                                            </label>
                                                            <div className="p-3 rounded-2xl bg-foreground/[0.03] border border-border/40 text-[10px] text-foreground/60 leading-relaxed">
                                                                <strong className="text-foreground/80 font-semibold block mb-0.5">Avbokningspolicy:</strong>
                                                                Fri avbokning senast 24 timmar innan bokad tid. Vid sen avbokning eller uteblivet besök (no-show) har salongen laglig rätt att debitera behandlingsbeloppet i enlighet med gällande distansavtalslagstiftning.
                                                            </div>
                                                        </div>

                                                        <button
                                                            disabled={!isFormValid || (selectedPaymentMethod === 'giftcard' && !giftCardStatus?.valid) || isBooking}
                                                            onClick={handleConfirmBooking}
                                                            className={clsx(
                                                                "w-full py-5 rounded-2xl font-bold text-sm transition-all shadow-xl active:scale-95",
                                                                isFormValid && (selectedPaymentMethod !== 'giftcard' || giftCardStatus?.valid) && !isBooking
                                                                    ? "bg-foreground text-background hover:bg-champagne-600 hover:text-white shadow-black/10 cursor-pointer"
                                                                    : "bg-foreground/5 text-foreground/20 cursor-not-allowed shadow-none"
                                                            )}
                                                        >
                                                            {isBooking
                                                                ? t('booking_btn_booking')
                                                                : !isBasicInfoValid
                                                                    ? t('booking_btn_fill_info')
                                                                    : !agreedToTerms
                                                                        ? 'Godkänn villkoren för att boka'
                                                                        : selectedPaymentMethod === 'giftcard' && !giftCardStatus?.valid
                                                                            ? t('booking_btn_validate_gc')
                                                                            : `✓ ${t('salon_book_now')}`}
                                                        </button>
                                                        {!isFormValid && (
                                                            <p className="text-[10px] text-center font-medium">
                                                                {!isBasicInfoValid ? (
                                                                    <span className="text-red-500/60">{t('booking_validation_error')}</span>
                                                                ) : (
                                                                    <span className="text-amber-600">Vänligen kryssa i rutan ovan för att godkänna villkoren och slutföra bokningen.</span>
                                                                )}
                                                            </p>
                                                        )}

                                                        {!isCustomerLoggedIn && bookingType === 'guest' && (
                                                            <div className="text-center pt-2 border-t border-border/20">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setBookingType('none')}
                                                                    className="text-[10px] font-bold text-foreground/40 hover:text-champagne-600 transition-colors underline"
                                                                >
                                                                    {t('booking_login_instead')}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                        <p className="text-center text-[10px] text-foreground/20 max-w-sm mx-auto">
                                            {t('booking_terms_note')}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Booking Confirmation Overlay — covers entire modal */}
                            {isBooked && (
                                <div className="absolute inset-0 bg-background z-[50] flex flex-col items-center justify-center p-12 text-center space-y-8 animate-in fade-in duration-500 rounded-[40px]">
                                    <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-green-500/20 animate-bounce">
                                        <CheckCircle2 size={48} />
                                    </div>
                                    <div className="space-y-4">
                                        <h2 className="text-4xl font-heading font-bold text-foreground">{t('salon_booking_confirmed')}</h2>
                                        <p className="text-foreground/40 leading-relaxed max-w-sm mx-auto">
                                            Tack för din bokning, <strong>{customerInfo.firstName || (successAppointment?.customer_name ? successAppointment.customer_name.split(' ')[0] : '')}</strong>! En bekräftelse har skickats till <strong>{customerInfo.email || successAppointment?.customer_email}</strong>.
                                        </p>
                                    </div>
                                    <div className="p-6 bg-foreground/[0.03] rounded-3xl border border-border w-full max-w-md text-left space-y-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-foreground/40">Tjänst</span>
                                            <span className="font-bold">{selectedService?.name || successAppointment?.service_name}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-foreground/40">Utförare</span>
                                            <span className="font-bold">
                                                {(() => {
                                                    if (successAppointment?.practitioner_id === 'any' || selectedPractitioner?.id === 'any') {
                                                        return 'Vem som helst';
                                                    }
                                                    if (successAppointment?.practitioner_id === 'owner') {
                                                        return salon?.firstName || salon?.name || 'Salongen';
                                                    }
                                                    const candidate = selectedPractitioner?.name || 
                                                                      successAppointment?.practitioner?.name || 
                                                                      (salon?.practitioners?.[0]?.name) || 
                                                                      salon?.firstName;
                                                    if (candidate) {
                                                        return candidate.split(' ')[0];
                                                    }
                                                    return salon?.name || 'Salongen';
                                                })()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-foreground/40">{t('salon_date_time')}</span>
                                            <span className="font-bold">
                                                {(selectedTime?.day && selectedTime?.time) 
                                                    ? `${selectedTime.day}, ${selectedTime.time}` 
                                                    : successAppointment?.start_time 
                                                        ? `${new Date(successAppointment.start_time).toLocaleDateString('sv-SE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Stockholm' }).replace(/^\w/, c => c.toUpperCase())}, ${new Date(successAppointment.start_time).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' })}`
                                                        : ''}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-foreground/40">Betalsätt</span>
                                            <span className="font-bold">
                                                {successAppointment?.payment_method ? (
                                                     (successAppointment.payment_method === 'stripe' || successAppointment.payment_method === 'paid') ? 'Betald online (Kort/Klarna)' :
                                                     successAppointment.payment_method === 'klarna' ? 'Betald online (Klarna)' :
                                                     successAppointment.payment_method === 'card' ? 'Betald online (Kort)' :
                                                     successAppointment.payment_method === 'giftcard' ? t('booking_giftcard') :
                                                     'Betalas på plats'
                                                 ) : (
                                                     selectedPaymentMethod === 'stripe' ? 'Betald online (Kort/Klarna)' :
                                                     selectedPaymentMethod === 'giftcard' ? t('booking_giftcard') :
                                                     'Betalas på plats'
                                                 )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm border-t border-border pt-4">
                                            <span className="text-foreground/40">Totalt</span>
                                            <span className="font-bold text-lg">
                                                {successAppointment?.total_price ?? finalTotal ?? selectedService?.price ?? 0} {salon?.currency || 'kr'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-foreground/30">
                                        <Check size={12} className="text-green-500" />
                                        Bekräftelse skickad via noreply@glowbook.se
                                    </div>
                                    <button
                                        onClick={() => {
                                            window.location.href = window.location.pathname;
                                        }}
                                        className="w-full max-w-md py-5 bg-foreground text-background rounded-2xl font-bold hover:scale-[1.02] transition-transform"
                                    >
                                        {t('booking_close')}
                                    </button>
                                </div>
                            )}

                            {/* Stripe payment overlay will be added here in the future */}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Review Modal */}
            <AnimatePresence>
                {isReviewModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card rounded-[40px] w-full max-w-lg shadow-2xl p-8 relative overflow-hidden border border-border flex flex-col gap-6"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-champagne-300 via-pink-200 to-champagne-300"></div>

                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-champagne-500/10 text-champagne-500 rounded-2xl">
                                        <MessageSquare size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-foreground">Lämna recension</h3>
                                        <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">{salon?.name}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        setIsReviewModalOpen(false);
                                        const params = new URLSearchParams(window.location.search);
                                        params.delete('review');
                                        router.replace(window.location.pathname + (params.toString() ? '?' + params.toString() : ''));
                                    }} 
                                    className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-foreground/40"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {reviewSuccess ? (
                                <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in duration-300">
                                    <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-500/20">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-bold text-foreground">Tack för din feedback!</h4>
                                        <p className="text-sm text-foreground/50">Din recension har sparats och visas nu på salongens sida.</p>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleReviewSubmit} className="space-y-6">
                                    {reviewError && (
                                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-bold flex items-center gap-2">
                                            <AlertTriangle size={16} /> {reviewError}
                                        </div>
                                    )}

                                    {reviewInfo && (
                                        <div className="p-4 bg-foreground/[0.02] border border-border/50 rounded-2xl space-y-2 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-foreground/40">Kund:</span>
                                                <span className="font-bold text-foreground">{reviewInfo.customer_name} (Verifierad)</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-foreground/40">{t('success_treatment') || 'Behandling'}:</span>
                                                <span className="font-bold text-foreground">{reviewInfo.service_name}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3 text-center">
                                        <label className="text-sm font-bold text-foreground block">Hur nöjd var du med ditt besök?</label>
                                        <div className="flex justify-center gap-2">
                                            {Array.from({ length: 5 }).map((_, i) => {
                                                const starVal = i + 1;
                                                return (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => setReviewRating(starVal)}
                                                        className="p-1 hover:scale-110 transition-transform text-champagne-500"
                                                    >
                                                        <Star
                                                            size={36}
                                                            fill={starVal <= reviewRating ? "currentColor" : "none"}
                                                            className={starVal <= reviewRating ? "text-champagne-500" : "text-foreground/20"}
                                                        />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-foreground/30 block">Dina kommentarer (valfritt)</label>
                                        <textarea
                                            value={reviewText}
                                            onChange={(e) => setReviewText(e.target.value)}
                                            placeholder="Skriv några ord om din upplevelse..."
                                            maxLength={500}
                                            className="w-full px-4 py-3 rounded-2xl border border-border bg-card text-foreground focus:border-champagne-500 outline-none transition-all min-h-[100px] resize-none text-sm placeholder:text-foreground/30"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmittingReview}
                                        className="w-full py-4 bg-foreground text-background rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-sm"
                                    >
                                        {isSubmittingReview ? 'Skickar...' : 'Skicka recension'}
                                    </button>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Product Details & Ingredients Modal */}
            <AnimatePresence>
                {viewingProduct && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setViewingProduct(null)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg max-h-[90vh] bg-card rounded-[32px] border border-border shadow-2xl flex flex-col overflow-hidden z-10"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-border flex items-center justify-between shrink-0 bg-foreground/[0.02]">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#C2A26A]">
                                            PRODUKTINFORMATION
                                        </span>
                                        {viewingProduct.brand && (
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#C2A26A]/10 text-[#C2A26A] border border-[#C2A26A]/30">
                                                {viewingProduct.brand}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground">
                                        {viewingProduct.name}
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setViewingProduct(null)}
                                    className="w-9 h-9 rounded-full bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center text-foreground/60 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-160px)]">
                                {viewingProduct.image && (
                                    <div className="w-full h-56 rounded-2xl overflow-hidden bg-black/30 border border-border/50">
                                        <img src={viewingProduct.image} alt={viewingProduct.name} className="w-full h-full object-cover" />
                                    </div>
                                )}

                                <div className="flex items-center justify-between p-4 rounded-2xl bg-foreground/[0.03] border border-border/60">
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-foreground/40 block">Pris i salongen</span>
                                        <span className="text-xl font-bold text-foreground">{viewingProduct.price} {salon.currency || 'kr'}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] uppercase font-bold text-foreground/40 block">Kategori</span>
                                        <span className="text-xs font-semibold text-foreground/80">{viewingProduct.category || 'Eftervård'}</span>
                                    </div>
                                </div>

                                {viewingProduct.description && (
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C2A26A]">Beskrivning</h4>
                                        <p className="text-sm text-foreground/80 leading-relaxed font-sans whitespace-pre-wrap">{viewingProduct.description}</p>
                                    </div>
                                )}

                                {/* Ingredients & Product information section */}
                                <div className="space-y-2.5 pt-3 border-t border-border/80">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C2A26A] flex items-center gap-1.5">
                                            <Shield size={13} className="text-[#C2A26A]" /> Innehåll & Ingredienser (INCI)
                                        </h4>
                                        {viewingProduct.brand && (
                                            <span className="text-xs font-semibold text-foreground/60">{viewingProduct.brand}</span>
                                        )}
                                    </div>
                                    <div className="p-5 rounded-2xl bg-foreground/[0.02] border border-border/70 shadow-sm">
                                        {viewingProduct.ingredients ? (
                                            <p className="text-sm text-foreground/90 leading-relaxed font-sans break-words whitespace-pre-wrap">
                                                {viewingProduct.ingredients}
                                            </p>
                                        ) : (
                                            <p className="text-xs text-foreground/50 italic leading-relaxed">
                                                Kontakta salongen för fullständig ingrediensförteckning eller vid frågor om allergier.
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-foreground/45 leading-normal pl-1">
                                        Viktigt för dig med allergier eller särskilda ingredienspreferenser.
                                    </p>
                                </div>

                                {viewingProduct.productUrl && (
                                    <div className="pt-2">
                                        <a
                                            href={viewingProduct.productUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-xs font-bold text-[#C2A26A] hover:text-[#DFCA9B] transition-colors p-3 rounded-xl bg-foreground/[0.03] border border-border w-full justify-center"
                                        >
                                            <span>Officiellt produktdatablad & information</span>
                                            <ExternalLink size={14} />
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-5 border-t border-border bg-foreground/[0.02] shrink-0 flex flex-col sm:flex-row gap-3">
                                {(() => {
                                    const vpStock = typeof viewingProduct.stock === 'number' ? viewingProduct.stock : (parseInt(viewingProduct.stock, 10) ?? 999);
                                    const isVpOutOfStock = viewingProduct.stock !== undefined && viewingProduct.stock !== null && vpStock <= 0;
                                    const isSelected = selectedAddons.includes(viewingProduct.id);

                                    return (
                                        <>
                                            <button
                                                type="button"
                                                disabled={isVpOutOfStock}
                                                onClick={() => {
                                                    if (isVpOutOfStock) return;
                                                    addToCart(viewingProduct);
                                                    setViewingProduct(null);
                                                }}
                                                className={clsx(
                                                    "flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg",
                                                    isVpOutOfStock
                                                        ? "bg-foreground/5 text-foreground/30 cursor-not-allowed border border-border/50"
                                                        : "bg-[#C2A26A] text-[#0B0B0C] hover:bg-[#DFCA9B] active:scale-95"
                                                )}
                                            >
                                                <ShoppingBag size={16} />
                                                {isVpOutOfStock ? 'Slut i lager' : `Köp & hämta på salong (${viewingProduct.price} ${salon.currency || 'kr'})`}
                                            </button>

                                            <button
                                                type="button"
                                                disabled={isVpOutOfStock && !isSelected}
                                                onClick={() => {
                                                    if (isVpOutOfStock && !isSelected) return;
                                                    if (isSelected) {
                                                        setSelectedAddons(prev => prev.filter(id => id !== viewingProduct.id));
                                                    } else {
                                                        setSelectedAddons(prev => [...prev, viewingProduct.id]);
                                                        if (!selectedService && salon?.services && salon.services.length > 0) {
                                                            handleServiceSelect(salon.services[0]);
                                                        }
                                                    }
                                                    setViewingProduct(null);
                                                }}
                                                className={clsx(
                                                    "py-3.5 px-5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                                                    isVpOutOfStock && !isSelected
                                                        ? "bg-foreground/5 text-foreground/30 border border-border/40 cursor-not-allowed"
                                                        : isSelected
                                                            ? "bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 active:scale-95"
                                                            : "bg-foreground/5 hover:bg-foreground/10 text-foreground/80 border border-border active:scale-95"
                                                )}
                                            >
                                                {isSelected ? (
                                                    <>
                                                        <X size={15} /> Ta bort från bokning
                                                    </>
                                                ) : isVpOutOfStock ? (
                                                    <span>Slut i lager</span>
                                                ) : (
                                                    <>
                                                        <Plus size={15} /> Välj med bokning
                                                    </>
                                                )}
                                            </button>
                                        </>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Floating Cart Button (when items in cart) */}
            {cartItemsCount > 0 && !isCartOpen && (
                <div className="fixed bottom-6 right-6 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <button
                        type="button"
                        onClick={() => setIsCartOpen(true)}
                        className="px-6 py-3.5 rounded-full bg-[#111114] text-white border border-[#C2A26A]/50 hover:border-[#C2A26A] shadow-2xl flex items-center gap-3 group active:scale-95 transition-all"
                    >
                        <div className="w-8 h-8 rounded-full bg-[#C2A26A] text-[#0B0B0C] font-bold text-xs flex items-center justify-center">
                            {cartItemsCount}
                        </div>
                        <div className="text-left">
                            <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider leading-none mb-0.5">Varukorg · Hämta på plats</span>
                            <span className="text-xs font-bold text-white group-hover:text-[#DFCA9B]">{cartTotal} {salon.currency || 'kr'}</span>
                        </div>
                        <ChevronRight size={16} className="text-[#C2A26A] group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            )}

            {/* Cart & Click-and-collect Modal */}
            <AnimatePresence>
                {isCartOpen && (
                    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCartOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-xl max-h-[92vh] bg-card rounded-[32px] border border-border shadow-2xl flex flex-col overflow-hidden z-10"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-border flex items-center justify-between shrink-0 bg-foreground/[0.02]">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#C2A26A] flex items-center gap-1.5">
                                        <ShoppingBag size={14} /> VARUKORG · HÄMTA PÅ SALONG
                                    </span>
                                    <h3 className="text-lg font-bold text-foreground">
                                        {salon.name}
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsCartOpen(false)}
                                    className="w-9 h-9 rounded-full bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center text-foreground/60 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Form / Content */}
                            <form onSubmit={handlePlaceOrder} className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[calc(92vh-150px)]">
                                {/* Pickup notice banner */}
                                <div className="p-4 rounded-2xl bg-foreground/[0.03] border border-border flex items-start gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-[#C2A26A]/10 text-[#C2A26A] flex items-center justify-center shrink-0">
                                        <Store size={20} />
                                    </div>
                                    <div className="text-xs space-y-1">
                                        <p className="font-bold text-foreground">Hämtas på plats hos {salon.name}</p>
                                        <p className="text-foreground/60 leading-relaxed">
                                            {salon.address}{salon.municipality || salon.city ? `, ${salon.municipality || salon.city}` : ''}
                                        </p>
                                        <p className="text-[11px] text-[#C2A26A] font-semibold">
                                            Redo att hämtas under salongens ordinarie öppettider
                                        </p>
                                    </div>
                                </div>

                                {/* Cart Items */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/40">
                                            Produkter ({cartItemsCount})
                                        </h4>
                                        {cart.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setCart([])}
                                                className="text-[10px] font-bold text-foreground/40 hover:text-red-500 uppercase tracking-wider transition-colors"
                                            >
                                                Töm varukorg
                                            </button>
                                        )}
                                    </div>

                                    {cart.length === 0 ? (
                                        <div className="p-8 text-center text-foreground/40 rounded-2xl border border-dashed border-border space-y-2">
                                            <ShoppingBag size={28} className="mx-auto opacity-40" />
                                            <p className="text-xs font-medium">Din varukorg är tom</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {cart.map(item => (
                                                <div
                                                    key={item.id}
                                                    className="p-3.5 rounded-2xl bg-foreground/[0.02] border border-border flex items-center justify-between gap-3"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {item.image ? (
                                                            <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-border shrink-0" />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-xl bg-foreground/5 flex items-center justify-center text-foreground/40 shrink-0">
                                                                <Package size={20} />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            {item.brand && (
                                                                <span className="text-[9px] font-bold uppercase tracking-wider text-[#C2A26A] block">
                                                                    {item.brand}
                                                                </span>
                                                            )}
                                                            <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                                                            <p className="text-xs font-semibold text-foreground/70 mt-0.5">
                                                                {item.price} {salon.currency || 'kr'} / st
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="flex items-center gap-2 bg-foreground/5 rounded-xl p-1 border border-border/50">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateCartQuantity(item.id, -1)}
                                                                className="w-6 h-6 rounded-lg bg-background hover:bg-foreground/10 flex items-center justify-center text-foreground transition-colors"
                                                            >
                                                                <Minus size={12} />
                                                            </button>
                                                            <span className="text-xs font-bold text-foreground min-w-[16px] text-center">
                                                                {item.quantity}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateCartQuantity(item.id, 1)}
                                                                className="w-6 h-6 rounded-lg bg-background hover:bg-foreground/10 flex items-center justify-center text-foreground transition-colors"
                                                            >
                                                                <Plus size={12} />
                                                            </button>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFromCart(item.id)}
                                                            className="p-1.5 text-foreground/40 hover:text-red-500 transition-colors"
                                                            title="Ta bort"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Customer Information */}
                                {cart.length > 0 && (
                                    <div className="space-y-3 pt-3 border-t border-border">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/40">
                                            Dina uppgifter för upphämtning
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-foreground/40 uppercase">Förnamn *</label>
                                                <input
                                                    required
                                                    type="text"
                                                    placeholder="Anna"
                                                    value={customerInfo.firstName}
                                                    onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })}
                                                    className="w-full bg-foreground/[0.03] border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:border-[#C2A26A] outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-foreground/40 uppercase">Efternamn</label>
                                                <input
                                                    type="text"
                                                    placeholder="Svensson"
                                                    value={customerInfo.lastName}
                                                    onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
                                                    className="w-full bg-foreground/[0.03] border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:border-[#C2A26A] outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-foreground/40 uppercase">E-postadress *</label>
                                                <input
                                                    required
                                                    type="email"
                                                    placeholder="anna@example.com"
                                                    value={customerInfo.email}
                                                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                                                    className="w-full bg-foreground/[0.03] border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:border-[#C2A26A] outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-foreground/40 uppercase">Telefonnummer</label>
                                                <input
                                                    type="tel"
                                                    placeholder="070-123 45 67"
                                                    value={customerInfo.phone}
                                                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                                    className="w-full bg-foreground/[0.03] border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:border-[#C2A26A] outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Payment Method */}
                                {cart.length > 0 && (
                                    <div className="space-y-3 pt-3 border-t border-border">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/40">
                                            Betalsätt
                                        </h4>
                                        <div className="grid grid-cols-1 gap-2.5">
                                            <div
                                                onClick={() => setSelectedPaymentMethod('onsite')}
                                                className={clsx(
                                                    "p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3",
                                                    selectedPaymentMethod === 'onsite'
                                                        ? "border-[#C2A26A] bg-[#C2A26A]/5 ring-1 ring-[#C2A26A]"
                                                        : "border-border bg-foreground/[0.01] hover:border-foreground/20"
                                                )}
                                            >
                                                <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center text-xs", selectedPaymentMethod === 'onsite' ? "bg-[#C2A26A] text-[#0B0B0C]" : "bg-foreground/5 text-foreground/50")}>
                                                    <Wallet size={16} />
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <p className="text-xs font-bold text-foreground">Betala vid upphämtning</p>
                                                    <p className="text-[10px] text-foreground/40">Kort, Swish eller kontant i salongen</p>
                                                </div>
                                            </div>

                                            {salon.stripe_account_id && (
                                                <div
                                                    onClick={() => setSelectedPaymentMethod('stripe')}
                                                    className={clsx(
                                                        "p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3",
                                                        selectedPaymentMethod === 'stripe'
                                                            ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500"
                                                            : "border-border bg-foreground/[0.01] hover:border-foreground/20"
                                                    )}
                                                >
                                                    <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center text-xs", selectedPaymentMethod === 'stripe' ? "bg-blue-500 text-white" : "bg-foreground/5 text-foreground/50")}>
                                                        <CreditCard size={16} />
                                                    </div>
                                                    <div className="flex-1 text-left">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xs font-bold text-foreground">Betala online direkt</p>
                                                            <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Klarna & Kort</span>
                                                        </div>
                                                        <p className="text-[10px] text-foreground/40">Säker betalning direkt via Stripe</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Footer / Total & Submit */}
                                {cart.length > 0 && (
                                    <div className="pt-4 border-t border-border space-y-3">
                                        <div className="flex justify-between items-center text-sm font-bold text-foreground">
                                            <span>Totalt att betala</span>
                                            <span className="text-xl text-[#C2A26A]">{cartTotal} {salon.currency || 'kr'}</span>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isCheckingOutOrder || !customerInfo.firstName || !customerInfo.email}
                                            className="w-full py-4 rounded-2xl bg-[#C2A26A] hover:bg-[#DFCA9B] text-[#0B0B0C] font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                                        >
                                            {isCheckingOutOrder ? (
                                                <span>Skapar beställning...</span>
                                            ) : (
                                                <>
                                                    <ShoppingBag size={16} />
                                                    <span>Slutför beställning · {cartTotal} {salon.currency || 'kr'}</span>
                                                </>
                                            )}
                                        </button>
                                        <p className="text-[10px] text-center text-foreground/40">
                                            Orderbekräftelse skickas till {customerInfo.email || 'din e-post'}.
                                        </p>
                                    </div>
                                )}
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Order Confirmation Screen */}
            <AnimatePresence>
                {orderConfirmation && (
                    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setOrderConfirmation(null)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg bg-card rounded-[36px] border border-border shadow-2xl p-6 sm:p-8 flex flex-col text-center space-y-6 z-10 overflow-hidden"
                        >
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mx-auto flex items-center justify-center shadow-lg">
                                <Check size={32} strokeWidth={2.5} />
                            </div>

                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#C2A26A]">
                                    ORDERBEKRÄFTELSE
                                </span>
                                <h3 className="text-2xl font-heading font-bold text-foreground">
                                    Tack för din beställning!
                                </h3>
                                <p className="text-xs text-foreground/50">
                                    Ordernummer: <strong className="text-foreground font-mono font-bold tracking-wider">#{orderConfirmation.orderNumber}</strong>
                                </p>
                            </div>

                            {/* Pickup details box */}
                            <div className="p-5 rounded-2xl bg-foreground/[0.03] border border-border/80 text-left space-y-2.5">
                                <div className="flex items-center gap-2 text-[#C2A26A] text-xs font-bold uppercase tracking-wider">
                                    <Store size={16} />
                                    <span>Hämtas på plats hos</span>
                                </div>
                                <div>
                                    <p className="text-base font-bold text-foreground">{orderConfirmation.salonName}</p>
                                    <p className="text-xs text-foreground/60">{orderConfirmation.salonAddress}{orderConfirmation.salonCity ? `, ${orderConfirmation.salonCity}` : ''}</p>
                                </div>
                                <p className="text-[11px] text-foreground/50 pt-2 border-t border-border/50">
                                    Visa upp detta ordernummer eller ditt namn när du hämtar dina varor i salongen.
                                </p>
                            </div>

                            {/* Items summary */}
                            <div className="space-y-2 text-left">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/40 block">
                                    Beställda produkter
                                </span>
                                <div className="p-4 rounded-2xl bg-foreground/[0.02] border border-border space-y-2 text-xs">
                                    {orderConfirmation.items?.map((it: any) => (
                                        <div key={it.id} className="flex justify-between items-center">
                                            <span className="text-foreground font-medium">{it.quantity}x {it.name}</span>
                                            <span className="font-bold text-foreground">{it.price * it.quantity} kr</span>
                                        </div>
                                    ))}
                                    <div className="pt-2 border-t border-border flex justify-between items-center font-bold text-sm text-foreground">
                                        <span>Totalt</span>
                                        <span className="text-[#C2A26A]">{orderConfirmation.totalPrice} kr</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-foreground/60 leading-relaxed">
                                En bekräftelse har skickats till <strong className="text-foreground">{orderConfirmation.customerInfo?.email}</strong>.
                            </p>

                            <button
                                type="button"
                                onClick={() => setOrderConfirmation(null)}
                                className="w-full py-4 rounded-2xl bg-[#C2A26A] hover:bg-[#DFCA9B] text-[#0B0B0C] font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95"
                            >
                                Klart
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
