
'use client';

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/layout/Header";
import { Clock, MapPin, Star, ChevronRight, CheckCircle2, X, Plus, Users, User, CreditCard, Wallet, AlertTriangle, ExternalLink, Coins, Check, ChevronLeft, ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Calendar from "@/components/dashboard/Calendar";
import clsx from "clsx";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { REWARD_TIERS } from "@/lib/loyalty";

function getServiceCategory(service: any, salonCategory: string) {
    if (service?.category) return service.category;
    const name = service?.name?.toLowerCase() || '';
    if (name.includes('klipp') && !name.includes('skägg')) return 'Frisör';
    if (name.includes('skägg') || name.includes('rakning') || name.includes('barber')) return 'Barberare';
    if (name.includes('frans') || name.includes('lash')) return 'Fransstylist';
    if (name.includes('bryn') || name.includes('brow')) return 'Brow stylist';
    if (name.includes('nagel') || name.includes('gel') || name.includes('manikyr')) return 'Nagelterapeut';
    if (name.includes('ansikt') || name.includes('hud') || name.includes('peeling')) return 'Hudterapeut';
    if (name.includes('massage')) return 'Massör';
    if (name.includes('tatuering') || name.includes('tattoo')) return 'Tatuerare';
    if (name.includes('laser')) return 'Lasertekniker';
    if (name.includes('fotvård') || name.includes('pedikyr')) return 'Fotvårdsterapeut';
    if (name.includes('makeup') || name.includes('smink')) return 'Makeup-artist';
    return salonCategory || null; // Fallback to salon category
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
    if (apt.startTime && apt.dayIndex !== undefined && apt.clientName) {
        return apt;
    }
    const sDate = apt.start_time ? new Date(apt.start_time) : null;
    if (!sDate) return apt;
    
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
        clientName: apt.customer_name || apt.customer_email || 'Kund',
        clientEmail: apt.customer_email || '',
        clientPhone: apt.customer_phone || '',
        service: apt.service_name || 'Tjänst',
        startTime: startTime,
        duration: duration,
        dayIndex: dayIndex,
        date: dateFormatted,
        status: apt.status || 'confirmed',
        practitionerId: apt.practitioner_id || 'owner',
        color: 'bg-pink-100/90 dark:bg-pink-950/30 border-pink-300 dark:border-pink-800/50 text-pink-800 dark:text-pink-300'
    };
}

export default function SalonContent({ params }: { params?: { id: string } }) {
    const { t } = useLanguage();
    const [salon, setSalon] = useState<any>(null);
    const [selectedService, setSelectedService] = useState<any>(null);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [bookingStep, setBookingStep] = useState(1); // 1: Select Service, 2: Select Time, 3: Confirm
    const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
    const [selectedPractitioner, setSelectedPractitioner] = useState<any>(null);
    const [selectedTime, setSelectedTime] = useState<{ day: string; time: string; fullDate: string; dayIndex: number } | null>(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'onsite' | 'stripe' | 'giftcard'>('onsite');
    const [giftCardSecondaryMethod, setGiftCardSecondaryMethod] = useState<'onsite' | 'stripe'>('onsite');
    const [isBooked, setIsBooked] = useState(false);
    const [galleryLightbox, setGalleryLightbox] = useState<number | null>(null);
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

    const basePrice = useMemo(() => {
        return Number(
            (selectedService?.sale_price && (!selectedService?.sale_ends_at || new Date(selectedService.sale_ends_at) > new Date()))
                ? selectedService.sale_price
                : (selectedService?.price || 0)
        );
    }, [selectedService]);

    const addonsPrice = useMemo(() => {
        return selectedAddons.reduce((acc, id) => {
            const addon = (salon?.addons || []).find((a: any) => a.id === id);
            return acc + Number(addon?.price || 0);
        }, 0);
    }, [selectedAddons, salon?.addons]);

    const originalTotal = useMemo(() => {
        let total = basePrice + addonsPrice;
        // Apply Glowpoints Reward Discount
        if (useGlowpoints && selectedReward) {
            if (selectedReward.id.includes('50 kr')) total = Math.max(0, total - 50);
            if (selectedReward.id.includes('100 kr')) total = Math.max(0, total - 100);
            if (selectedReward.label.includes('20%')) total = Math.floor(total * 0.8);
            if (selectedReward.label.includes('30%')) total = Math.floor(total * 0.7);
            if (selectedReward.label.includes('50%')) total = Math.floor(total * 0.5);
            if (selectedReward.label.includes('Gratis tillägg')) {
                const addonPrices = selectedAddons.map(id => (salon?.addons || []).find((a: any) => a.id === id)?.price || 0);
                if (addonPrices.length > 0) total -= Math.max(...addonPrices);
            }
        }
        return total;
    }, [basePrice, addonsPrice, useGlowpoints, selectedReward, selectedAddons, salon?.addons]);

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
            const customer = sessionStorage.getItem('glowbook_customer');
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
            if (params.get('booking_success') === 'true') {
                setIsBooked(true);
                setIsBookingModalOpen(true);
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

    const isFormValid = customerInfo.firstName.trim().length > 1 &&
        customerInfo.lastName.trim().length > 1 &&
        validateEmail(customerInfo.email) &&
        validatePhone(customerInfo.phone);



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

        // Prevent providers from booking
        try {
            const isProvider = !!sessionStorage.getItem('glowbook_salon');
            if (isProvider) {
                alert('Som utförare kan du inte boka tjänster hos andra utförare.');
                return;
            }
        } catch { }

        try {
            // 1. Redeeming Gift Card if selected
            if (selectedPaymentMethod === 'giftcard' && giftCardStatus?.valid) {
                const amountToRedeem = giftCardDiscount;
                const redeemResponse = await fetch('/api/giftcards/redeem', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code: giftCardCode.trim().toUpperCase(),
                        amount: amountToRedeem,
                        salonName: salon.name
                    }),
                });
                const redeemData = await redeemResponse.json();
                if (!redeemData.success) {
                    alert('Gick inte att lösa in presentkortet: ' + redeemData.error);
                    return;
                }
            }

            // 1b. Spend Glowpoints if selected
            if (useGlowpoints && selectedReward && isCustomerLoggedIn) {
                const spendResponse = await fetch('/api/loyalty/spend', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: customerInfo.id,
                        salonId: salon.id,
                        amount: selectedReward.pointsCost,
                        description: `Inlösen: ${selectedReward.label} för ${selectedService.name}`
                    }),
                });
                const spendData = await spendResponse.json();
                if (!spendData.success) {
                    alert('Kunde inte lösa in poäng: ' + spendData.error);
                    return;
                }
            }

            const actualPaymentMethod = selectedPaymentMethod === 'giftcard' && finalTotal > 0
                ? giftCardSecondaryMethod
                : selectedPaymentMethod;

            const isStripePayment = actualPaymentMethod === 'stripe';

            // 2. Create Appointment
            const bookingResponse = await fetch('/api/bookings/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    salonId: salon.id,
                    serviceName: selectedService.name,
                    practitionerId: selectedPractitioner?.id || 'owner',
                    startTime: selectedTime.time,
                    date: selectedTime.fullDate,
                    dayIndex: selectedTime.dayIndex,
                    duration: selectedService.duration || 30,
                    price: finalTotal,
                    customerInfo,
                    paymentMethod: actualPaymentMethod,
                    rewardInfo: useGlowpoints ? selectedReward : null,
                    status: isStripePayment ? 'pending_payment' : 'confirmed'
                }),
            });

            const bookingData = await bookingResponse.json();
            if (!bookingData.success) {
                alert('Bokningen misslyckades: ' + bookingData.error);
                return;
            }

            // 3. Handle Payment Redirect if needed
            if (isStripePayment) {
                const checkoutResponse = await fetch('/api/bookings/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        appointmentId: bookingData.appointmentId,
                        salonId: salon.id,
                        serviceName: selectedService.name,
                        price: finalTotal,
                        customerEmail: customerInfo.email
                    }),
                });
                const checkoutData = await checkoutResponse.json();
                if (checkoutData.url) {
                    window.location.href = checkoutData.url;
                    return;
                }
            }

            // 4. Success state for non-redirect payments
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
                color: 'bg-pink-100/90 dark:bg-pink-950/30 border-pink-300 dark:border-pink-800/50 text-pink-800 dark:text-pink-300'
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
                            color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
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
                            color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
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
        }
    };

    useEffect(() => {
        const loadSalon = async () => {
            let salonId = params?.id;
            if (!salonId) {
                setSalon('not_found');
                setStatus('ready');
                return;
            }

            // Normalize slug if it's not a UUID
            if (salonId.length < 30) {
                salonId = salonId.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            }

            // 1. Try Database lookup
            try {
                const query = salonId.length > 20 ? `id=${salonId}` : `slug=${salonId}`;
                const response = await fetch(`/api/salons/get?${query}`);
                const data = await response.json();

                if (data.success && data.salon) {
                    const s = data.salon;
                    let loyaltyActive = false;
                    try {
                        const loyaltyRaw = localStorage.getItem(`glowbook_loyalty_config_${s.id}`);
                        if (loyaltyRaw) {
                            loyaltyActive = JSON.parse(loyaltyRaw).enabled === true;
                        }
                    } catch { }

                    const mappedApts = (s.appointments || []).map(mapDbAppointment);
                    setSalon({
                        ...s,
                        appointments: mappedApts,
                        profileImage: s.logo_url || s.profileImage,
                        backgroundImage: s.banner_url || s.backgroundImage,
                        tier: (s.membership_tier || s.tier || 'bas').toLowerCase(),
                        acceptsGlowpoints: loyaltyActive
                    });
                    setStatus('ready');
                    return;
                } else {
                    console.warn('Salon API returned non-success:', data);
                }
                
                // 2. Extra fallback: Search by name if slug/id fails
                if (salonId.length < 30) {
                   const searchRes = await fetch(`/api/salons/list?q=${salonId}`);
                   const searchData = await searchRes.json();
                   if (searchData.success && searchData.salons?.length > 0) {
                       const s = searchData.salons[0];
                       const mappedApts = (s.appointments || []).map(mapDbAppointment);
                       setSalon({
                           ...s,
                           appointments: mappedApts,
                           profileImage: s.logo_url || s.profileImage,
                           backgroundImage: s.banner_url || s.backgroundImage,
                           tier: (s.membership_tier || s.tier || 'bas').toLowerCase()
                       });
                       setStatus('ready');
                       return;
                   }
                }
            } catch (error) {
                console.error('Failed to load salon from DB:', error);
            }

            // Fallback to local
            const saved = sessionStorage.getItem('glowbook_salon') || localStorage.getItem('glowbook_salon');
            if (saved) {
                const localData = JSON.parse(saved);
                if (localData.id === salonId || localData.slug === salonId) {
                    const mappedApts = (localData.appointments || []).map(mapDbAppointment);
                    setSalon({
                        ...localData,
                        appointments: mappedApts,
                        tier: (localData.tier || 'bas').toLowerCase(),
                    });
                    setStatus('ready');
                    return;
                }
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

    // Compute availability: tries practitioner schedules first, falls back to salon.availability
    const computedAvailability = useMemo(() => {
        if (!salon || !selectedService) return [];

        const serviceDuration = selectedService?.duration || 30;
        const step = serviceDuration; // slots step by the service duration — a 90-min service shows 90-min slots
        const appointments = salon?.appointments || [];
        const allFrames: any[] = [];

        const now = new Date();
        const currentDayIdx = (now.getDay() + 6) % 7;
        const currentMins = now.getHours() * 60 + now.getMinutes();

        const targetPractitioner = selectedPractitioner || { id: 'any' };
        const tier = (salon?.tier || 'bas').toLowerCase();
        const isLuxe = tier === 'luxe';

        let salonAvailability: any[] = salon?.availability || [];
        if (salonAvailability.length === 0) {
            // Provide a default 10:00 - 19:00 schedule for all 7 days as a fallback
            // since the new database schema relies on practitioners but the calendar 
            // intersects with salon.availability for bounds.
            salonAvailability = [0, 1, 2, 3, 4, 5, 6].map(dayIndex => ({
                id: `fallback-${dayIndex}`,
                dayIndex,
                startTime: '10:00',
                duration: 540 // 9 hours (10:00 to 19:00)
            }));
        }

        if (isLuxe) {
            // Luxe availability logic: Shared calendar frames INTERSECTED with qualified practitioner schedules
            const allowedIds = selectedService.practitionerIds || [];
            const serviceCat = getServiceCategory(selectedService, salon.category);
            const allPractitioners = salon?.practitioners || [];

            // 1. Filter out who is qualified to perform this service
            let qualifiedPractitioners = allPractitioners.filter((p: any) => {
                if (allowedIds.length > 0 && !allowedIds.includes(p.id)) return false;
                if (allowedIds.length === 0) {
                    const pCats = p.categories || [];
                    if (serviceCat && pCats.length > 0 && !pCats.includes(serviceCat)) return false;
                }
                return true;
            });

            if (targetPractitioner.id !== 'any') {
                qualifiedPractitioners = qualifiedPractitioners.filter((p: any) => p.id === targetPractitioner.id);
            }

            if (qualifiedPractitioners.length === 0) return [];

            salonAvailability.forEach((frame: any) => {
                const frameStart = timeToMins(frame.startTime);
                const frameEnd = frameStart + frame.duration;

                for (let time = frameStart; time <= frameEnd - serviceDuration; time += step) {
                    const startTimeStr = minsToTime(time);
                    const startMins = time;
                    const endMins = time + serviceDuration;

                    // Filter out past times for today
                    if (frame.dayIndex === currentDayIdx && startMins < currentMins + 15) continue;

                    // 2. Find all qualified practitioners who are scheduled to work during this time
                    const availablePractitionerIds: string[] = [];

                    for (const p of qualifiedPractitioners) {
                        const schedule = p.schedule || {};
                        const dayData = schedule[frame.dayIndex];
                        if (!dayData || dayData.active !== true) continue;

                        const slots = dayData.slots || [];
                        if (slots.length === 0 && dayData.start && dayData.end) {
                            slots.push({ start: dayData.start, end: dayData.end });
                        }

                        // Check if time is within practitioner's work slots
                        const isWithinPractitionerSlot = slots.some((slot: any) => {
                            const pStart = timeToMins(slot.start);
                            const pEnd = timeToMins(slot.end);
                            return (startMins >= pStart && endMins <= pEnd);
                        });
                        if (!isWithinPractitionerSlot) continue;

                        // Check if time overlaps with practitioner's breaks
                        const breaks = dayData.breaks || [];
                        const hasBreakOverlap = breaks.some((brk: any) => {
                            const brkStart = timeToMins(brk.start);
                            const brkEnd = brkStart + brk.duration;
                            return (startMins < brkEnd && endMins > brkStart);
                        });
                        if (hasBreakOverlap) continue;

                        // Check if time overlaps with practitioner's bookings
                        const hasBookingOverlap = appointments.some((apt: any) => {
                            const aptPid = apt.practitionerId || apt.practitioner_id || 'owner';
                            if (aptPid !== p.id) return false;
                            if (apt.dayIndex !== frame.dayIndex) return false;
                            if (apt.status === 'cancelled') return false;
                            
                            const aptStart = timeToMins(apt.startTime);
                            const aptEnd = aptStart + (apt.duration || 30);
                            return (startMins < aptEnd && endMins > aptStart);
                        });
                        if (hasBookingOverlap) continue;

                        availablePractitionerIds.push(p.id);
                    }

                    if (availablePractitionerIds.length > 0) {
                        allFrames.push({
                            id: `luxe-${frame.id}-${startTimeStr}`,
                            startTime: startTimeStr,
                            duration: serviceDuration,
                            dayIndex: frame.dayIndex,
                            practitionerId: targetPractitioner.id === 'any' ? availablePractitionerIds[0] : targetPractitioner.id,
                            practitionerIds: availablePractitionerIds,
                            week: frame.week
                        });
                    }
                }
            });

            return allFrames;
        }

        // Standard/fallback availability logic (BAS & PRO): Salon-wide shared calendar
        salonAvailability.forEach((frame: any) => {
            const frameStart = timeToMins(frame.startTime);
            const frameEnd = frameStart + frame.duration;

            for (let time = frameStart; time <= frameEnd - serviceDuration; time += step) {
                const startTimeStr = minsToTime(time);
                const startMins = time;
                const endMins = time + serviceDuration;

                const hasAptOverlap = appointments.some((apt: any) => {
                    if (apt.dayIndex !== frame.dayIndex) return false;
                    if (apt.status === 'cancelled') return false;
                    const aptStart = timeToMins(apt.startTime);
                    const aptEnd = aptStart + (apt.duration || 30);
                    return (startMins < aptEnd && endMins > aptStart);
                });
                if (hasAptOverlap) continue;

                // Filter out slots that are in the past for today
                if (frame.dayIndex === currentDayIdx && startMins < currentMins + 15) continue;

                allFrames.push({
                    id: `avail-${frame.id}-${startTimeStr}`,
                    startTime: startTimeStr,
                    duration: serviceDuration,
                    dayIndex: frame.dayIndex,
                    practitionerId: 'owner',
                    week: frame.week
                });
            }
        });

        return allFrames;
    }, [selectedPractitioner, selectedService, salon]);
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
        const dateObj = new Date(date);
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
                            {[
                                ...(salon.category ? [salon.category] : []),
                                ...(salon.categories || []),
                                ...(salon.practitioners?.flatMap((p: any) => p.categories || []) || [])
                            ].filter((v, i, a) => a.indexOf(v) === i).map(cat => (
                                <span key={cat} className="bg-champagne-100 text-champagne-700 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">{cat}</span>
                            ))}
                            {salon.acceptsGlowpoints && (
                                <span className="flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">
                                    <Coins size={13} />
                                    Glowpoints
                                </span>
                            )}
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-champagne-500/10 rounded-lg text-sm font-black text-champagne-600">
                                <Star size={14} className={salon.rating ? "fill-current" : ""} />
                                <span>{salon.rating ? salon.rating : (isNew ? 'NY' : '-')}</span>
                                {salon.reviewCount > 0 && <span className="text-foreground/40 font-normal">({salon.reviewCount})</span>}
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
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-foreground/50">
                            <div className="flex items-center gap-2">
                                <MapPin size={18} className="text-champagne-500" />
                                <span>{salon.municipality}, Sverige</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock size={18} className="text-champagne-500" />
                                <span className="text-sm md:text-base">Öppet · Stänger 18:00</span>
                            </div>
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
                    </div>

                    {/* About Section */}
                    <div className="space-y-8">
                        <div className="bg-card rounded-[40px] p-10 space-y-6 border border-border">
                            {salon.description && (
                                <>
                                    <h2 className="text-2xl font-heading font-bold text-foreground">{t('salon_about')}</h2>
                                    <p className="text-foreground/60 leading-relaxed whitespace-pre-wrap">
                                        "{salon.description}"
                                    </p>
                                </>
                            )}

                        </div>



                        {/* Reviews Preview */}
                        <div className="bg-card rounded-[40px] p-10 space-y-6 border border-border">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-heading font-bold text-foreground">{t('salon_reviews')}</h2>
                            </div>
                            <div className="space-y-6">
                                <div className="py-8 text-center space-y-3">
                                    <div className="w-12 h-12 bg-foreground/5 rounded-full flex items-center justify-center mx-auto text-foreground/20">
                                        <Star size={20} />
                                    </div>
                                    <p className="text-xs text-foreground/40 italic">Inga recensioner än för {salon.name}.</p>
                                </div>
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
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            style={{ border: 0 }}
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(`${salon.address}, ${salon.municipality}`)}&output=embed`}
                            allowFullScreen
                            className="saturate-[1.1] contrast-110 opacity-90 group-hover:opacity-100 transition-all duration-700"
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
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
                                <AlertTriangle className="text-amber-500 mb-4" size={40} />
                                <h3 className="text-lg font-bold text-foreground tracking-tight">Vi saknar din adress</h3>
                                <p className="text-foreground/40 mt-1 text-sm font-medium">Lägg till en adress i dina inställningar för att visa kartan.</p>
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

                            <div className="flex-1 overflow-auto p-5 md:p-8 bg-card no-scrollbar">
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
                                        />
                                    </div>
                                ) : (
                                    <div className="max-w-4xl mx-auto py-8 space-y-10">
                                        <div className="text-center space-y-4">
                                            <h2 className="text-3xl font-heading font-bold text-foreground">Dina uppgifter</h2>
                                            <p className="text-foreground/40 text-sm">Fyll i dina uppgifter för att slutföra bokningen hos {salon.name}.</p>
                                        </div>

                                        {/* Elegant Provider Warning Banner */}
                                        {isProviderLoggedIn && (
                                            <div className="max-w-2xl mx-auto bg-amber-500/5 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-3xl p-5 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                                <span className="text-xl">⚠️</span>
                                                <div className="space-y-1 text-left">
                                                    <h4 className="text-sm font-bold">Du är inloggad som salong/utförare</h4>
                                                    <p className="text-xs opacity-90 leading-relaxed">
                                                        Salongskonton kan inte boka tider hos andra salonger. För att testa bokningsflödet hela vägen, vänligen <strong>logga ut</strong> från din salongspanel först eller öppna den här sidan i ett <strong>inkognitofönster</strong>.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Elegant Customer Login Banner if not logged in */}
                                        {!isCustomerLoggedIn && (
                                            <div className="max-w-2xl mx-auto bg-champagne-500/5 border border-champagne-500/15 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="space-y-1">
                                                    <h4 className="text-sm font-bold text-foreground">Redan kund hos oss eller vill tjäna poäng?</h4>
                                                    <p className="text-xs text-foreground/50 leading-relaxed">Logga in på ditt konto för att spara dina uppgifter och samla lojalitetspoäng.</p>
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
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30 pl-1">Förnamn</label>
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
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30 pl-1">Efternamn</label>
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
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30 pl-1">E-post</label>
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
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30 pl-1">Mobilnummer</label>
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

                                                    <div className="space-y-4 pt-4">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/30 pl-1">Betalsätt</h4>
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
                                                                        <div className="flex items-center gap-2">
                                                                            <h5 className="font-bold text-sm">Betala online</h5>
                                                                            <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-widest">Säker betalning</span>
                                                                        </div>
                                                                        <p className="text-[10px] text-foreground/40 font-medium">Kort, Apple Pay & Google Pay</p>
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
                                                                    <h5 className="font-bold text-sm">Presentkort</h5>
                                                                    <p className="text-[10px] text-foreground/40 font-medium">Betala med Glowbook-presentkort</p>
                                                                </div>
                                                            </div>

                                                            {selectedPaymentMethod === 'giftcard' && (
                                                                <div className="p-4 rounded-2xl border border-champagne-500/20 bg-champagne-500/5 space-y-3">
                                                                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30">Ange presentkortskod</label>
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
                                                                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Välj betalsätt för resterande {finalTotal} {salon.currency || 'kr'}</p>
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
                                                                                        <h6 className="font-bold text-xs">Betala på plats</h6>
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
                                                                                        <div className="text-left">
                                                                                            <h6 className="font-bold text-xs">Betala online</h6>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Glowpoints Section */}
                                                        {isCustomerLoggedIn && salon.acceptsGlowpoints && availableGlowpoints > 0 && (
                                                            <div className="space-y-4 pt-6 border-t border-border mt-6">
                                                                <div className="flex items-center justify-between">
                                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                                                        <Coins size={14} /> Använd dina Glowpoints
                                                                    </h4>
                                                                    <span className="text-[10px] font-bold text-foreground/40">{availableGlowpoints} poäng tillgängliga</span>
                                                                </div>

                                                                <div className="grid grid-cols-1 gap-3">
                                                                    {REWARD_TIERS.filter(tier => availableGlowpoints >= tier.pointsCost).map(tier => (
                                                                        <div key={tier.pointsCost} className="space-y-2">
                                                                            {tier.options.map(option => (
                                                                                <div
                                                                                    key={option.id}
                                                                                    onClick={() => {
                                                                                        if (selectedReward?.id === option.id) {
                                                                                            setSelectedReward(null);
                                                                                            setUseGlowpoints(false);
                                                                                        } else {
                                                                                            setSelectedReward({ ...option, pointsCost: tier.pointsCost });
                                                                                            setUseGlowpoints(true);
                                                                                        }
                                                                                    }}
                                                                                    className={clsx(
                                                                                        "p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3",
                                                                                        selectedReward?.id === option.id
                                                                                            ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500"
                                                                                            : "border-border bg-card hover:border-emerald-500/20"
                                                                                    )}
                                                                                >
                                                                                    <div className={clsx(
                                                                                        "w-8 h-8 rounded-lg flex items-center justify-center text-sm",
                                                                                        selectedReward?.id === option.id ? "bg-emerald-500 text-white" : "bg-emerald-500/10 text-emerald-600"
                                                                                    )}>
                                                                                        <Star size={14} />
                                                                                    </div>
                                                                                    <div className="flex-1">
                                                                                        <div className="flex justify-between items-center">
                                                                                            <h5 className="font-bold text-xs">{option.label}</h5>
                                                                                            <span className="text-[9px] font-black text-emerald-600">{tier.pointsCost}p</span>
                                                                                        </div>
                                                                                        <p className="text-[9px] text-foreground/40">{option.description}</p>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Summary Sidebar */}
                                                <div className="lg:col-span-2 space-y-6">
                                                    <div className="bg-foreground/[0.03] rounded-3xl p-6 border border-border sticky top-4 space-y-4">
                                                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground/30 border-b border-border pb-4">Sammanfattning</h3>

                                                        <div className="space-y-4">
                                                            <div>
                                                                <p className="text-[10px] font-bold text-foreground/30 uppercase">Tjänst</p>
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
                                                                        const addon = (salon.addons || []).find((a: any) => a.id === id);
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

                                                        {giftCardDiscount > 0 && (
                                                            <div className="pt-4 border-t border-border/50 flex justify-between items-center text-xs text-green-600 font-bold">
                                                                <span>Presentkort ({giftCardCode})</span>
                                                                <span>-{giftCardDiscount} {salon.currency || 'kr'}</span>
                                                            </div>
                                                        )}

                                                        <div className="pt-4 border-t border-border flex justify-between items-end">
                                                            <span className="text-[10px] font-bold text-foreground/30 uppercase">Totalt</span>
                                                            <span className="text-xl font-bold">
                                                                {finalTotal} {salon.currency || 'kr'}
                                                            </span>
                                                        </div>

                                                        <button
                                                            disabled={!isFormValid || (selectedPaymentMethod === 'giftcard' && !giftCardStatus?.valid)}
                                                            onClick={handleConfirmBooking}
                                                            className={clsx(
                                                                "w-full py-5 rounded-2xl font-bold text-sm transition-all shadow-xl active:scale-95",
                                                                isFormValid && (selectedPaymentMethod !== 'giftcard' || giftCardStatus?.valid)
                                                                    ? "bg-foreground text-background hover:bg-champagne-600 hover:text-white shadow-black/10"
                                                                    : "bg-foreground/5 text-foreground/20 cursor-not-allowed shadow-none"
                                                            )}
                                                        >
                                                            {!isFormValid
                                                                ? 'Fyll i dina uppgifter'
                                                                : selectedPaymentMethod === 'giftcard' && !giftCardStatus?.valid
                                                                    ? 'Validera presentkort först'
                                                                    : `✓ ${t('salon_book_now')}`}
                                                        </button>
                                                        {!isFormValid && (
                                                            <p className="text-[10px] text-center text-red-500/60 font-medium">
                                                                Vänligen fyll i alla fält för att boka
                                                            </p>
                                                        )}

                                                        {!isCustomerLoggedIn && bookingType === 'guest' && (
                                                            <div className="text-center pt-2 border-t border-border/20">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setBookingType('none')}
                                                                    className="text-[10px] font-bold text-foreground/40 hover:text-champagne-600 transition-colors underline"
                                                                >
                                                                    Logga in istället
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                        <p className="text-center text-[10px] text-foreground/20 max-w-sm mx-auto">
                                            Genom att boka godkänner du våra användarvillkor. Vi sparar dina uppgifter för att kunna hantera din bokning.
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
                                            Tack för din bokning, <strong>{customerInfo.firstName}</strong>! En bekräftelse har skickats till <strong>{customerInfo.email}</strong>.
                                        </p>
                                    </div>
                                    <div className="p-6 bg-foreground/[0.03] rounded-3xl border border-border w-full max-w-md text-left space-y-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-foreground/40">Tjänst</span>
                                            <span className="font-bold">{selectedService?.name}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-foreground/40">Utförare</span>
                                            <span className="font-bold">{selectedPractitioner?.name || (salon?.practitioners?.[0]?.name) || [salon?.firstName, salon?.lastName].filter(Boolean).join(' ') || salon?.name || 'Salongen'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-foreground/40">{t('salon_date_time')}</span>
                                            <span className="font-bold">{selectedTime?.day}, {selectedTime?.time}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-foreground/40">Betalsätt</span>
                                            <span className="font-bold">
                                                {selectedPaymentMethod === 'giftcard' ? 'Presentkort' : 
                                                 selectedPaymentMethod === 'stripe' ? 'Betalat Online' : 'Betalas på plats'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm border-t border-border pt-4">
                                            <span className="text-foreground/40">Totalt</span>
                                            <span className="font-bold text-lg">{selectedService?.price || 0} {salon?.currency || 'kr'}</span>
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
                                        Stäng fönstret
                                    </button>
                                </div>
                            )}

                            {/* Stripe payment overlay will be added here in the future */}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
