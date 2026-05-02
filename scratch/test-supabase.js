
import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Role Key defined:', !!serviceRoleKey);

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function test() {
  console.log('Testing connection...');
  const { data, error, count } = await supabase.from('clients').select('*', { count: 'exact', head: true });
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Total clients:', count);
  }
}

test();
