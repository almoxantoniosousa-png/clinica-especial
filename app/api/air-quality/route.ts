import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  if (!lat || !lon) return NextResponse.json({ error: "lat/lon obrigatórios" }, { status: 400 });

  try {
    const res = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) throw new Error("open-meteo error");
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Qualidade do ar indisponível" }, { status: 500 });
  }
}
