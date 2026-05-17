import { NextResponse } from 'next/server';
import { sendProviderWelcomeEmail } from '@/lib/email';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Lägg till ?email=din@mail.com i URLen' }, { status: 400 });
    }

    try {
        const result = await sendProviderWelcomeEmail(email, "Glowbook Studio");
        
        if (result.success) {
            return NextResponse.json({ success: true, message: `Ett testmail har skickats till ${email}!` });
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
