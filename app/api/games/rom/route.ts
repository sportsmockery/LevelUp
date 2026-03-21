import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ROMS: Record<string, string> = {
  "nba-jam": "https://arcadespot.com/wp-content/uploads/2026/03/nba-jam.smc",
  "tecmo-super-bowl": "https://www.free80sarcade.com/vnes_roms/Tecmo%20Super%20Bowl.nes",
};

export async function GET(req: NextRequest) {
  const game = req.nextUrl.searchParams.get("game");
  if (!game || !ALLOWED_ROMS[game]) {
    return NextResponse.json({ error: "Unknown game" }, { status: 404 });
  }

  const res = await fetch(ALLOWED_ROMS[game]);
  if (!res.ok) {
    return NextResponse.json({ error: "ROM fetch failed" }, { status: 502 });
  }

  const data = await res.arrayBuffer();
  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
