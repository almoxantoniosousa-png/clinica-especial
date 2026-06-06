import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const cidade = new URL(req.url).searchParams.get("cidade") || "Salvador,BA";
  try {
    const res = await fetch(
      `https://wttr.in/${encodeURIComponent(cidade)}?format=j1`,
      { next: { revalidate: 900 } }
    );
    if (!res.ok) throw new Error("wttr.in error");
    const data = await res.json();
    return NextResponse.json({ ...data, _cidade: cidade });
  } catch {
    return NextResponse.json({ error: "Clima indisponível" }, { status: 500 });
  }
}
