import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Ingen fil skickades' }, { status: 400 });
        }

        // Validate file type (images + PDF certificates) & 5MB size cap
        const isAllowedType = file.type.startsWith('image/') || file.type === 'application/pdf';
        if (!isAllowedType) {
            return NextResponse.json({ error: 'Filen måste vara en bild (JPG/PNG) eller PDF' }, { status: 400 });
        }
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'Filen får vara max 5 MB stor' }, { status: 400 });
        }

        // Upload the file to Vercel Blob
        const blob = await put(file.name, file, {
            access: 'public',
        });

        console.log('[Upload API] Uploaded file to Vercel Blob:', blob.url);

        return NextResponse.json({ success: true, url: blob.url });
    } catch (error: any) {
        console.error('[Upload API] Error uploading file:', error);
        return NextResponse.json({ error: error.message || 'Serverfel vid uppladdning' }, { status: 500 });
    }
}
