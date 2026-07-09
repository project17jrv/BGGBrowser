import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BoardGameGeek Explorer",
    template: "%s | BoardGameGeek Explorer",
  },
  description:
    "Explora y filtra tu colección personal de juegos de mesa importados de BoardGameGeek en una base de datos local ultra-rápida.",
  openGraph: {
    title: "BoardGameGeek Explorer",
    description:
      "Explora y filtra tu colección personal de juegos de mesa importados de BoardGameGeek en una base de datos local ultra-rápida.",
    type: "website",
    locale: "es_ES",
    siteName: "BoardGameGeek Explorer",
  },
  twitter: {
    card: "summary_large_image",
    title: "BoardGameGeek Explorer",
    description: "Explora tu colección personal de juegos de mesa localmente.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
