import { getTableOfContents, getChapterContent } from "@/lib/data-service";
import { TextbookPlatform } from "@/components/TextbookPlatform";

interface HomeProps {
  searchParams: Promise<{ chapter?: string; lang?: string }>
}

// Server Component
export default async function Home({ searchParams }: HomeProps) {
  // Await searchParams (Next.js 15+ requirement)
  const params = await searchParams;
  
  // 1. Fetch TOC from Supabase
  const lang = (params.lang === 'en') ? 'en' : 'zh'
  const sections = await getTableOfContents(lang);


  // 2. Determine current chapter slug
  // Use URL param or default to first section's slug
  const currentSlug = params.chapter || (sections.length > 0 ? sections[0].slug : null);

  // 3. Fetch chapter content
  let chapterData = null;
  if (currentSlug) {
    const bookId = sections[0]?.bookId
    chapterData = await getChapterContent(currentSlug, bookId);
  }

  // Fallback if no data
  if (!chapterData) {
    chapterData = {
      title: "Welcome",
      sectionId: "", // Placeholder sectionId for fallback
      blocks: [{ id: "placeholder", type: "markdown" as const, content: "# Welcome\n\nNo content found. Please check if data has been imported.", order_index: 0 }]
    };
  }

  return (
    <TextbookPlatform
      sections={sections}
      initialChapterData={chapterData}
      currentSlug={currentSlug || ''}
    />
  );
}
