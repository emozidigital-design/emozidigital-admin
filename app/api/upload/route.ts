import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { nanoid } from 'nanoid';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CF_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY!,
  },
});

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

    const fileName = `blog-posts/${nanoid()}.${ext}`;

    await r2.send(new PutObjectCommand({
      Bucket: process.env.CF_R2_BUCKET_NAME!,
      Key: fileName,
      Body: buffer,
      ContentType: mime,
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    const url = `${process.env.CF_R2_PUBLIC_URL}/${fileName}`;
    return NextResponse.json({ url });

  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({
      error: 'Upload failed',
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
