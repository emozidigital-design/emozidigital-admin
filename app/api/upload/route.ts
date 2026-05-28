import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

async function compressImage(buffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; ext: string; mime: string }> {
  // AVIF/WebP are already efficient — just resize if oversized, keep format
  if (mimeType === 'image/avif' || mimeType === 'image/webp') {
    const compressed = await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
    const ext = mimeType === 'image/avif' ? 'avif' : 'webp';
    return { buffer: compressed, ext, mime: mimeType };
  }

  // PNG/JPEG/GIF → convert to WebP, max 1200px, 82% quality
  const compressed = await sharp(buffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  return { buffer: compressed, ext: 'webp', mime: 'image/webp' };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const { buffer, ext, mime } = await compressImage(rawBuffer, file.type);

    const fileName = `${nanoid()}.${ext}`;
    const filePath = `blog-posts/${fileName}`;

    const { error } = await supabase.storage
      .from('blog')
      .upload(filePath, buffer, {
        contentType: mime,
        cacheControl: '31536000', // 1 year — images are immutable (new name = new file)
        upsert: false,
      });

    if (error) {
      if (error.message.includes('bucket not found')) {
        const { error: error2 } = await supabase.storage
          .from('blog-posts')
          .upload(filePath, buffer, { contentType: mime, cacheControl: '31536000', upsert: false });
        if (error2) throw error2;
        const { data: { publicUrl } } = supabase.storage.from('blog-posts').getPublicUrl(filePath);
        return NextResponse.json({ url: publicUrl });
      }
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage.from('blog').getPublicUrl(filePath);
    return NextResponse.json({ url: publicUrl });

  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({
      error: 'Upload failed',
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
