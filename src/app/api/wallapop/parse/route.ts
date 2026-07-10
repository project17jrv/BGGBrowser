import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    console.log(`[Wallapop Auto-Parser] Fetching Wallapop URL: ${url}`);
    
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Wallapop listing: ${res.statusText}`);
    }

    const html = await res.text();

    // 1. Extract Title
    let title = "";
    const titleMatch = html.match(/<meta[^>]*?(?:property|name)="og:title"[^>]*?content="([^"]+)"/i) ||
                       html.match(/<meta[^>]*?content="([^"]+)"[^>]*?(?:property|name)="og:title"/i) ||
                       html.match(/<meta\s+name="twitter:title"\s+content="([^"]+)"/i) ||
                       html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      // Wallapop titles often end with " de segunda mano por ... en ..."
      title = titleMatch[1].split(" de segunda mano por")[0].trim();
      title = title.replace(/&amp;/g, "&").replace(/&quot;/g, '"');
    }

    // 2. Extract Price
    let price = 0;
    const priceMatch = html.match(/"price":\s*(\d+(?:\.\d+)?)/) ||
                       html.match(/(?:property|name)="product:price:amount"\s+content="([^"]+)"/) ||
                       html.match(/"price":\s*"([^"]+)"/);
    if (priceMatch && priceMatch[1]) {
      price = parseFloat(priceMatch[1]);
    } else {
      // Fallback: search for "por X EUR" in title or description
      const descMatch = html.match(/por\s+(\d+(?:\.\d+)?)\s*EUR/i) ||
                        html.match(/(\d+(?:\.\d+)?)\s*€/);
      if (descMatch && descMatch[1]) {
        price = parseFloat(descMatch[1]);
      }
    }

    // 3. Extract Image
    let imageUrl = "";
    const imageMatch = html.match(/<meta[^>]*?(?:property|name)="og:image"[^>]*?content="([^"]+)"/i) ||
                       html.match(/<meta[^>]*?content="([^"]+)"[^>]*?(?:property|name)="og:image"/i) ||
                       html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i);
    if (imageMatch && imageMatch[1]) {
      imageUrl = imageMatch[1];
    }

    return NextResponse.json({ title, price, imageUrl });
  } catch (error) {
    console.error(`[Wallapop Auto-Parser] Failed to parse Wallapop link:`, error);
    return NextResponse.json({ error: "No se pudieron extraer los datos del anuncio de Wallapop. Inténtalo de nuevo o rellénalo a mano." }, { status: 500 });
  }
}
