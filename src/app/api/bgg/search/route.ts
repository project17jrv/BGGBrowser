import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

const BGG_API_KEY = process.env.BGG_API_KEY || "";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    if (!query) {
      return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
    }

    const url = `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=${encodeURIComponent(query)}`;
    console.log(`[BGG Search API] Querying BGG: ${url}`);

    const headers: HeadersInit = {};
    if (BGG_API_KEY) {
      headers["Authorization"] = `Bearer ${BGG_API_KEY}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`BGG Search API returned error status: ${res.status}`);
    }

    const xmlText = await res.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
    const parsed = parser.parse(xmlText);

    const toArray = <T>(val: T | T[] | undefined): T[] => {
      if (val === undefined) return [];
      return Array.isArray(val) ? val : [val];
    };

    const items = toArray(parsed.items?.item);
    const results = items.map((item: any) => {
      const bggId = parseInt(item["@_id"], 10);
      const name = item.name?.["@_value"] || item.name || "Unknown Game";
      const yearPublished = item.yearpublished ? parseInt(item.yearpublished["@_value"], 10) : null;
      return { bggId, name, yearPublished };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[BGG Search API] Error:", error);
    return NextResponse.json({ error: "Failed to search BGG" }, { status: 500 });
  }
}
