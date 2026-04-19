export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getOnboarding } from '@/lib/notion'

export async function GET() {
  const results = await getOnboarding()
  return NextResponse.json({ count: results.length, data: results })
}
