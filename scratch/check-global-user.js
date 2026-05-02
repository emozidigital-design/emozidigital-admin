const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkGlobalUser() {
  const email = 'emozidigital@gmail.com';
  console.log('Checking global user for email:', email);

  const { data, error } = await supabase
    .from('client_users')
    .select('*')
    .eq('email', email);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Found in client_users:', data.map(u => ({ id: u.id, client_id: u.client_id, status: u.status })));
  }
}

checkGlobalUser();
