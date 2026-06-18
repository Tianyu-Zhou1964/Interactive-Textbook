import { NextRequest, NextResponse } from 'next/server';
import { getChapterContent } from '@/lib/data-service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug');
  const bookId = searchParams.get('bookId') ?? undefined;

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 });
  }

  try {
    const chapterData = await getChapterContent(slug, bookId);
    
    if (!chapterData) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    return NextResponse.json(chapterData);
  } catch (error) {
    console.error('[API /chapter] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
