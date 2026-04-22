import { supabase } from '../lib/supabase.ts';

async function verifySeed() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug')
    .order('created_at', { ascending: false })
    .limit(4);

  if (error) {
    console.error('❌ Error verifying seed:', error);
  } else {
    console.log('✅ Verification successful. Recent posts:');
    data.forEach(post => console.log(`- ${post.title} (${post.slug})`));
  }
}

verifySeed().catch(console.error);
