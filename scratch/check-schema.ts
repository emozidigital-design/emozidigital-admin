
import { supabase } from '../lib/supabase';

async function checkSchema() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching blog_posts:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in blog_posts:', Object.keys(data[0]));
  } else {
    console.log('No data in blog_posts to check columns.');
  }
}

checkSchema();
