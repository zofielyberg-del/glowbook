import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendProductOrderConfirmationEmail } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            salonId,
            items,
            customerInfo,
            paymentMethod = 'onsite' // 'onsite' | 'stripe'
        } = body;

        if (!salonId || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Varukorgen är tom eller salong saknas.' }, { status: 400 });
        }

        if (!customerInfo?.firstName || !customerInfo?.email) {
            return NextResponse.json({ error: 'Namn och e-postadress krävs.' }, { status: 400 });
        }

        // Fetch salon
        const salon = await prisma.salon.findFirst({
            where: {
                OR: [
                    { id: salonId },
                    { slug: salonId }
                ]
            },
            select: {
                id: true,
                name: true,
                slug: true,
                address: true,
                city: true,
                municipality: true,
                country: true,
                stripe_account_id: true,
                availability: true,
                owner: {
                    select: {
                        phone: true
                    }
                }
            }
        });

        if (!salon) {
            return NextResponse.json({ error: 'Salongen hittades inte.' }, { status: 404 });
        }

        // Calculate total
        const calculatedTotal = items.reduce((sum: number, it: any) => {
            const price = Number(it.price) || 0;
            const qty = Math.max(1, Number(it.quantity) || 1);
            return sum + (price * qty);
        }, 0);

        const orderCode = `ORD-${Date.now().toString().slice(-6)}`;
        const customerFullName = `${customerInfo.firstName} ${customerInfo.lastName || ''}`.trim();
        const itemsSummary = items.map((it: any) => `${it.quantity || 1}x ${it.name}`).join(', ');
        const serviceName = `Produktorder (${itemsSummary})`;

        // Save into Appointment table as confirmed pickup order
        const orderRecord = await prisma.appointment.create({
            data: {
                salon_id: salon.id,
                service_name: serviceName,
                customer_name: customerFullName,
                customer_email: customerInfo.email,
                customer_phone: customerInfo.phone || null,
                start_time: new Date(),
                end_time: new Date(Date.now() + 60 * 60 * 1000),
                booking_date: new Date(),
                status: 'confirmed',
                payment_method: paymentMethod === 'stripe' ? 'Kort/Klarna (Stripe Online)' : 'Betala vid upphämtning',
                total_price: calculatedTotal,
                currency: 'SEK'
            }
        });

        // Automatically decrement product inventory stock in database
        const availabilityArr = Array.isArray(salon.availability) ? (salon.availability as any[]) : [];
        const prodBlock = availabilityArr.find((a: any) => a && (a.type === 'products' || a.type === 'addons'));
        let updatedProductsList: any[] = [];

        if (prodBlock && Array.isArray(prodBlock.list)) {
            let stockUpdated = false;
            updatedProductsList = prodBlock.list.map((prod: any) => {
                const boughtItem = items.find((it: any) => 
                    (it.id && String(it.id) === String(prod.id)) || 
                    (it.name && it.name.trim().toLowerCase() === (prod.name || '').trim().toLowerCase())
                );
                if (boughtItem) {
                    const qty = Math.max(1, Number(boughtItem.quantity) || 1);
                    const currentStock = typeof prod.stock === 'number' ? prod.stock : (parseInt(prod.stock, 10) || 0);
                    const newStock = Math.max(0, currentStock - qty);
                    stockUpdated = true;
                    return { ...prod, stock: newStock };
                }
                return prod;
            });

            if (stockUpdated) {
                const filteredAvail = availabilityArr.filter((a: any) => a && a.type !== 'products' && a.type !== 'addons');
                const finalAvailability = [
                    ...filteredAvail,
                    { type: 'products', list: updatedProductsList }
                ];
                try {
                    await prisma.salon.update({
                        where: { id: salon.id },
                        data: { availability: finalAvailability }
                    });
                } catch (stockErr) {
                    console.error('Failed updating product stock in DB:', stockErr);
                }
            }
        }

        // Send order confirmation email asynchronously
        try {
            await sendProductOrderConfirmationEmail({
                email: customerInfo.email,
                customerName: customerFullName,
                orderNumber: orderCode,
                salonName: salon.name,
                salonAddress: salon.address || undefined,
                salonCity: salon.municipality || salon.city || undefined,
                salonPhone: salon.owner?.phone || undefined,
                items: items.map((it: any) => ({
                    name: it.name,
                    brand: it.brand || undefined,
                    price: Number(it.price) || 0,
                    quantity: Number(it.quantity) || 1
                })),
                totalPrice: calculatedTotal,
                currency: 'kr',
                paymentMethod: paymentMethod === 'stripe' ? 'Betald online (Kort/Klarna)' : 'Betalas vid upphämtning i salongen'
            });
        } catch (emailErr) {
            console.error('Failed to send order confirmation email:', emailErr);
        }

        return NextResponse.json({
            success: true,
            orderId: orderRecord.id,
            orderNumber: orderCode,
            salonName: salon.name,
            salonAddress: salon.address,
            salonCity: salon.municipality || salon.city,
            totalPrice: calculatedTotal,
            currency: 'kr',
            items: items,
            customerInfo: {
                name: customerFullName,
                email: customerInfo.email,
                phone: customerInfo.phone
            },
            paymentMethod: paymentMethod,
            updatedProducts: updatedProductsList
        });

    } catch (err: any) {
        console.error('Order creation error:', err);
        return NextResponse.json({ error: err.message || 'Kunde inte skapa ordern.' }, { status: 500 });
    }
}
