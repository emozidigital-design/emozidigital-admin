/**
 * One-time migration: move all blog cover images from Supabase Storage → Cloudinary.
 * Run with: npx tsx scripts/migrate-images-to-cloudinary.ts
 */
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function uploadToCloudinary(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
  const buffer = Buffer.from(await response.arrayBuffer());

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'blog-images', resource_type: 'image' },
      (error, result) => (error ? reject(error) : resolve((result as { secure_url: string }).secure_url))
    ).end(buffer);
  });
}

async function migrate() {
  // Fetch all posts with Supabase storage URLs
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, title, cover_image_url')
    .like('cover_image_url', '%supabase.co/storage%');

  if (error) { console.error('Failed to fetch posts:', error.message); process.exit(1); }
  if (!posts || posts.length === 0) { console.log('No posts with Supabase storage images found.'); return; }

  console.log(`Found ${posts.length} posts to migrate.\n`);

  let success = 0;
  let failed = 0;

  for (const post of posts) {
    try {
      process.stdout.write(`Migrating "${post.title}" ... `);
      const cloudinaryUrl = await uploadToCloudinary(post.cover_image_url);

      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({ cover_image_url: cloudinaryUrl })
        .eq('id', post.id);

      if (updateError) throw new Error(updateError.message);

      console.log(`✓ ${cloudinaryUrl}`);
      success++;
    } catch (err) {
      console.log(`✗ ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log(`\nDone. ${success} migrated, ${failed} failed.`);
}

migrate();
