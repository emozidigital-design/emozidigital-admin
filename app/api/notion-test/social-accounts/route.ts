export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSocialAccounts } from '@/lib/notion'

export async function GET() {
  const results = await getSocialAccounts()
  return NextResponse.json({ count: results.length, data: results })
}
