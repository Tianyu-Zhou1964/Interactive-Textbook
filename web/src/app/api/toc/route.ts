import { getTableOfContents } from '@/lib/data-service'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lang = searchParams.get('lang') as 'zh' | 'en' || 'zh'
  const sections = await getTableOfContents(lang)
  return NextResponse.json(sections)
}