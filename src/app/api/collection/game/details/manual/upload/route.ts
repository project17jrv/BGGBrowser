import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bggIdStr = formData.get("bggId") as string | null;

    if (!file || !bggIdStr) {
      return NextResponse.json({ error: "Faltan parámetros requeridos (file, bggId)" }, { status: 400 });
    }

    const bggId = parseInt(bggIdStr, 10);
    if (isNaN(bggId)) {
      return NextResponse.json({ error: "bggId no es un número válido" }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/manuals directory
    const manualsDir = path.join(process.cwd(), "public", "manuals");
    // Ensure dir exists
    await mkdir(manualsDir, { recursive: true });

    // Sanitize filename: replace spaces, keep extension
    const sanitizedFilename = `${bggId}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const filePath = path.join(manualsDir, sanitizedFilename);

    await writeFile(filePath, buffer);
    const pdfUrl = `/manuals/${sanitizedFilename}`;

    // Update database
    await prisma.game.update({
      where: { bggId },
      data: { pdfUrl }
    });

    return NextResponse.json({ success: true, pdfUrl });
  } catch (err) {
    console.error("Error uploading manual:", err);
    return NextResponse.json({ error: "Error al subir el archivo" }, { status: 500 });
  }
}
