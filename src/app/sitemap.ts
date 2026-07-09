import { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Fetch all games to compile detail page URLs
  let gameUrls: MetadataRoute.Sitemap = [];
  try {
    const games = await prisma.game.findMany({
      select: {
        id: true,
        updatedAt: true,
      },
    });

    gameUrls = games.map((game) => ({
      url: `${baseUrl}/game/${game.id}`,
      lastModified: game.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch (error) {
    console.error("Failed to generate sitemap URLs:", error);
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/admin`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    ...gameUrls,
  ];
}
