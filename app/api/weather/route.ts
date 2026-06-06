import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://wttr.in/Salvador,BA?format=j1", {
      next: { revalidate: 1800 },
    });
    if (!res.ok) throw new Error("wttr.in error");
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Clima indisponível" }, { status: 500 });
  }
}
