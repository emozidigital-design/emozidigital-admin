export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getClients } from '@/lib/notion'

export async function GET() {
  const results = await getClients()
  return NextResponse.json({ count: results.length, data: results })
}
