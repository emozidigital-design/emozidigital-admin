import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const envFile = fs.readFileSync('.env.local', 'utf8')
const env: Record<string, string> = {}
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=')
  if (key && value) env[key.trim()] = value.join('=').trim()
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixBrokenImage() {
  const brokenUrl = '1485827404703-f3ae2042ad33'
  const newUrl = 'photo-1677442136019-21780ecad995'

  console.log('Updating broken image URL in blog_posts...')

  const { data, error } = await supabase
    .from('blog_posts')
    .update({ cover_image_url: `https://images.unsplash.com/${newUrl}?auto=format&fit=crop&q=80&w=1200&h=630` })
    .ilike('cover_image_url', `%${brokenUrl}%`)

  if (error) {
    console.error('Error updating image:', error)
  } else {
    console.log('Successfully updated broken image URL.')
  }
}

fixBrokenImage()
