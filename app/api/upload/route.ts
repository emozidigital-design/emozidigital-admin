import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${nanoid()}.${fileExt}`;
    const filePath = `blog-posts/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('blog') // I'll use 'blog' as the bucket name
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
       // If bucket 'blog' doesn't exist, try 'blog-posts'
       if (error.message.includes('bucket not found')) {
          const { data: data2, error: error2 } = await supabase.storage
            .from('blog-posts')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (error2) throw error2;

          const { data: { publicUrl } } = supabase.storage
            .from('blog-posts')
            .getPublicUrl(filePath);

          return NextResponse.json({ url: publicUrl });
       }
       throw error;
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('blog')
      .getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrl });

  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ 
      error: 'Upload failed', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
