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

        // Validate content type is an image
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Filen måste vara en bild' }, { status: 400 });
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
