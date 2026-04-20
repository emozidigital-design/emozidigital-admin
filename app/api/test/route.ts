import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
    const { data, error } = await supabase
        .from('leads')
        .select('*')

    if (error) {
        return Response.json({ error })
    }

    return Response.json({ data })
}