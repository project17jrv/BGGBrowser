import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bggId = searchParams.get("bggId");
  const pageid = searchParams.get("pageid") || "1";
  const languageid = searchParams.get("languageid") || "2203"; // Default Spanish

  if (!bggId) {
    return NextResponse.json({ error: "Falta el parámetro bggId" }, { status: 400 });
  }

  try {
    const url = `https://boardgamegeek.com/api/files?objecttype=thing&objectid=${bggId}&pageid=${pageid}&languageid=${languageid}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Error al consultar la API de BGG" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error in bgg-files route:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
