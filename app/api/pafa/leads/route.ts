import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { PROGRAM_SLUGS } from "@/lib/pafa/constants";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PROGRAMS = [...PROGRAM_SLUGS, "undecided", ""] as const;
const VALID_SOURCES = ["season-guide", "newsletter"] as const;

/**
 * Lead capture for the PAFA marketing site (season-guide form + footer
 * newsletter). Inserts into the `pafa_leads` table.
 *
 * Expected table (run once in Supabase):
 *   create table pafa_leads (
 *     id uuid primary key default gen_random_uuid(),
 *     email text not null,
 *     program text,
 *     source text not null default 'season-guide',
 *     created_at timestamptz not null default now(),
 *     unique (email, source)
 *   );
 *
 * Degrades gracefully to "dev mode" success when Supabase env vars are absent,
 * matching the existing /api/subscribe convention.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const program = typeof body.program === "string" ? body.program : "";
    const source = VALID_SOURCES.includes(body.source) ? body.source : "season-guide";

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 },
      );
    }

    if (!VALID_PROGRAMS.includes(program)) {
      return NextResponse.json(
        { success: false, error: "Please select a valid program." },
        { status: 400 },
      );
    }

    // Dev/demo mode — no Supabase configured.
    if (!supabaseServer) {
      console.log("[pafa/leads] Dev mode — would insert:", { email, program, source });
      return NextResponse.json({
        success: true,
        message: "You're on the list! Check your inbox for the Panther Season Guide.",
      });
    }

    const { error } = await supabaseServer.from("pafa_leads").insert({
      email,
      program: program || null,
      source,
      created_at: new Date().toISOString(),
    });

    if (error) {
      // Unique violation — already subscribed, treat as success.
      if (error.code === "23505") {
        return NextResponse.json({
          success: true,
          message: "You're already on the list! We'll be in touch soon.",
        });
      }
      console.error("[pafa/leads] Supabase insert error:", error);
      return NextResponse.json(
        { success: false, error: "Something went wrong. Please try again later." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "You're on the list! Check your inbox for the Panther Season Guide.",
    });
  } catch (err) {
    console.error("[pafa/leads] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Invalid request. Please try again." },
      { status: 400 },
    );
  }
}
