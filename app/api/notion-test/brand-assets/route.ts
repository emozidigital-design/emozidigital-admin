export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getBrandAssets } from '@/lib/notion'

export async function GET() {
  const results = await getBrandAssets()
  return NextResponse.json({ count: results.length, data: results })
}
