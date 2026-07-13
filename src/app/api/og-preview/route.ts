import { NextRequest, NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function getOg(html: string, prop: string): string | null {
  const m =
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, "i")) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:${prop}["']`, "i"));
  return m ? m[1].trim() : null;
}

function getMeta(html: string, name: string): string | null {
  const m =
    html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i")) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"));
  return m ? m[1].trim() : null;
}

function getTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
  return m ? m[1].trim() : null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ title: null, description: null, image: null }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json({ title: null, description: null, image: null });
    }

    // Stream only the first 25 KB — OG tags are always in <head>
    const reader = res.body?.getReader();
    if (!reader) return NextResponse.json({ title: null, description: null, image: null });

    let html = "";
    let bytes = 0;
    while (bytes < 25_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      bytes += value?.length ?? 0;
      if (html.includes("</head>")) break;
    }
    reader.cancel();

    const title = getOg(html, "title") || getMeta(html, "title") || getTitle(html);
    const description = getOg(html, "description") || getMeta(html, "description");
    const image = getOg(html, "image") || getOg(html, "image:url");

    return NextResponse.json({
      title: title ? title.slice(0, 120) : null,
      description: description ? description.slice(0, 200) : null,
      image: image || null,
    });
  } catch {
    return NextResponse.json({ title: null, description: null, image: null });
  }
}
