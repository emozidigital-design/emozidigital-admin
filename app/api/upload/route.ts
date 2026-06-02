import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = `blog-images/${fileName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from('blog')
    .upload(filePath, buffer, { contentType: file.type, upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabaseAdmin.storage.from('blog').getPublicUrl(filePath);

  return NextResponse.json({ url: publicUrl });
}
