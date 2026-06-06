import { NextResponse } from "next/server";

function parseRSS(xml: string) {
  const items: { titulo: string; link: string; fonte: string; data: string }[] = [];
  const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const m of matches) {
    const bloco = m[1];
    const titulo =
      bloco.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
      bloco.match(/<title>(.*?)<\/title>/)?.[1] || "";
    const link =
      bloco.match(/<link>(https?:\/\/[^<]+)<\/link>/)?.[1] ||
      bloco.match(/<link\s*\/>[\s\S]*?<link>(https?:\/\/[^<]+)<\/link>/)?.[1] || "#";
    const fonte =
      bloco.match(/<source[^>]*>(.*?)<\/source>/)?.[1] ||
      bloco.match(/<source[^>]*\/>/)?.[0]?.match(/url="([^"]+)"/)?.[1] || "";
    const data = bloco.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
    const tituloLimpo = titulo.replace(/ - [^-]+$/, "").trim();
    if (tituloLimpo) items.push({ titulo: tituloLimpo, link, fonte, data });
  }
  return items.slice(0, 8);
}

const FEEDS: Record<string, string> = {
  brasil:
    "https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt",
  mundo:
    "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtcHlHZ0pTUWlnQVAB?hl=pt-BR&gl=BR&ceid=BR:pt",
  inclusao:
    "https://news.google.com/rss/search?q=autismo+crian%C3%A7a+especial+inclus%C3%A3o+tratamento+TEA&hl=pt-BR&gl=BR&ceid=BR:pt",
};

export async function GET(req: Request) {
  const tipo = new URL(req.url).searchParams.get("tipo") ?? "brasil";
  const url = FEEDS[tipo] ?? FEEDS.brasil;
  try {
    const res = await fetch(url, {
      next: { revalidate: 900 },
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ClinicaAbrace/1.0)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return NextResponse.json({ items: parseRSS(xml) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro";
    return NextResponse.json({ items: [], error: msg }, { status: 500 });
  }
}
