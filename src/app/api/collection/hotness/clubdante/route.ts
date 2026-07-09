import { NextRequest, NextResponse } from "next/server";

export interface ClubDantePost {
  id: number;
  title: string;
  link: string;
  excerpt: string;
  imageUrl: string | null;
  date: string;
  pros: string[];
  contras: string[];
  rating: string | null;
}

interface WordPressPostItem {
  id: number;
  title?: { rendered?: string };
  link: string;
  excerpt?: { rendered?: string };
  date: string;
  content?: { rendered?: string };
  _embedded?: {
    "wp:featuredmedia"?: { source_url?: string }[];
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "1";
    const url = `https://elclubdante.es/wp-json/wp/v2/posts?per_page=12&page=${page}&_embed`;
    
    console.log("[Club Dante API] Fetching posts from:", url);
    const res = await fetch(url, {
      next: { revalidate: 3600 }, // Cache on Next.js fetch for 1 hour
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      }
    });

    if (!res.ok) {
      throw new Error(`WordPress API returned status ${res.status}`);
    }

    const data = await res.json() as WordPressPostItem[];
    
    const posts: ClubDantePost[] = data.map((item) => {
      // 1. Get title and excerpt
      const title = item.title?.rendered?.replace(/&#8217;/g, "'").replace(/&#8211;/g, "–").replace(/&amp;/g, "&") || "Sin Título";
      
      // Clean excerpt HTML
      let excerpt = item.excerpt?.rendered || "";
      excerpt = excerpt.replace(/<[^>]*>/g, "").replace(/&#8217;/g, "'").replace(/&#8211;/g, "–").trim();
      if (excerpt.length > 180) {
        excerpt = excerpt.slice(0, 177) + "...";
      }

      // 2. Get featured image
      let imageUrl: string | null = null;
      try {
        const featuredMedia = item._embedded?.["wp:featuredmedia"]?.[0];
        if (featuredMedia && featuredMedia.source_url) {
          imageUrl = featuredMedia.source_url;
        }
      } catch {
        // ignore
      }

      // 3. Extract rating, pros, and contras from content if available
      const content = item.content?.rendered || "";
      const pros: string[] = [];
      const contras: string[] = [];
      let rating: string | null = null;

      // Simple regex parser for pros / contras / rating
      // Pros are often written as list items or bullet points near "PROS" or "A favor"
      const prosMatch = content.match(/PROS:?<\/strong>(.*?)<\/p>/i) || content.match(/A favor:?<\/strong>(.*?)<\/p>/i);
      if (prosMatch && prosMatch[1]) {
        // Clean and split
        const cleaned = prosMatch[1].replace(/<[^>]*>/g, "").split(/[,;\-\u2022]/);
        cleaned.map((p: string) => p.trim()).filter((p: string) => p.length > 2).forEach((p: string) => pros.push(p));
      }

      const contrasMatch = content.match(/CONTRAS:?<\/strong>(.*?)<\/p>/i) || content.match(/En contra:?<\/strong>(.*?)<\/p>/i);
      if (contrasMatch && contrasMatch[1]) {
        const cleaned = contrasMatch[1].replace(/<[^>]*>/g, "").split(/[,;\-\u2022]/);
        cleaned.map((c: string) => c.trim()).filter((c: string) => c.length > 2).forEach((c: string) => contras.push(c));
      }

      // Ratings are sometimes like "Valoración: 8.5" or similar
      const ratingMatch = content.match(/Valoración:?\s*<strong>(\d+(?:\.\d+)?)<\/strong>/i) || content.match(/Nota:?\s*<strong>(\d+(?:\.\d+)?)<\/strong>/i);
      if (ratingMatch && ratingMatch[1]) {
        rating = ratingMatch[1];
      }

      return {
        id: item.id,
        title,
        link: item.link,
        excerpt,
        imageUrl,
        date: item.date,
        pros: pros.slice(0, 3),
        contras: contras.slice(0, 3),
        rating,
      };
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("[Club Dante API] Error loading feed:", error);
    // Return empty list on failure rather than failing the whole dashboard
    return NextResponse.json({ posts: [], error: "No se pudo cargar el feed de El Club de Dante." });
  }
}
