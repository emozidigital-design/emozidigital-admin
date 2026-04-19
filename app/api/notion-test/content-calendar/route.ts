export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getContentCalendar } from '@/lib/notion'

export async function GET() {
  const results = await getContentCalendar()
  return NextResponse.json({ count: results.length, data: results })
}
