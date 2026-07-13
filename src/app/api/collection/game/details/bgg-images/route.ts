import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bggId = searchParams.get("bggId");

    if (!bggId) {
      return NextResponse.json({ error: "BGG ID is required" }, { status: 400 });
    }

    const url = `https://api.geekdo.com/api/images?ajax=1&gallery=all&nosession=1&objectid=${bggId}&objecttype=thing&pageid=1&showcount=20&size=large&sort=recent`;
    
    console.log(`[BGG Gallery] Fetching image gallery from: ${url}`);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch BGG gallery: ${res.statusText}`);
    }

    interface BggApiImage {
      imageid: string;
      imageurl_lg?: string;
      imageurl: string;
      caption?: string;
    }

    const data = await res.json();
    const images = (data.images || []).map((img: BggApiImage) => ({
      id: img.imageid,
      url: img.imageurl_lg || img.imageurl,
      caption: img.caption || "",
    }));

    return NextResponse.json({ images });
  } catch (error) {
    console.error(`[BGG Gallery API] Error fetching gallery:`, error);
    return NextResponse.json({ error: "Failed to load BGG images" }, { status: 500 });
  }
}
