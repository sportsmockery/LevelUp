import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import { requireAuth } from "@/lib/auth-check"

const CURRENT_TERMS_VERSION = "1.0"

// GET: Check if the current user has accepted the current terms version
export async function GET(req: NextRequest) {
  const { user, response: authError } = await requireAuth(req)
  if (authError) return authError

  try {
    if (!supabaseServer) {
      return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 500 })
    }

    const { data } = await supabaseServer
      .from("Terms_Acceptance")
      .select("*")
      .eq("user_id", user!.id)
      .eq("terms_version", CURRENT_TERMS_VERSION)
      .order("accepted_at", { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      ok: true,
      accepted: !!data,
      termsVersion: CURRENT_TERMS_VERSION,
      acceptance: data || null,
    })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

// POST: Record terms acceptance with digital signature
export async function POST(req: NextRequest) {
  const { user, response: authError } = await requireAuth(req)
  if (authError) return authError

  try {
    if (!supabaseServer) {
      return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 500 })
    }

    const body = await req.json()
    const { signedName, termsVersion } = body

    if (!signedName || !termsVersion) {
      return NextResponse.json({ ok: false, error: "Missing signedName or termsVersion" }, { status: 400 })
    }

    // Verify the signed name matches the user's profile
    const { data: profile } = await supabaseServer
      .from("profiles")
      .select("full_name")
      .eq("id", user!.id)
      .single()

    if (!profile?.full_name) {
      return NextResponse.json({ ok: false, error: "Profile name not found. Please update your profile first." }, { status: 400 })
    }

    const normalizedSigned = signedName.trim().toLowerCase()
    const normalizedProfile = profile.full_name.trim().toLowerCase()

    if (normalizedSigned !== normalizedProfile) {
      return NextResponse.json({
        ok: false,
        error: "The name you typed does not match your profile name.",
      }, { status: 400 })
    }

    // Record acceptance
    const { error } = await supabaseServer.from("Terms_Acceptance").insert({
      user_id: user!.id,
      terms_version: termsVersion,
      signed_name: signedName.trim(),
      accepted_at: new Date().toISOString(),
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
      user_agent: req.headers.get("user-agent") || null,
    })

    if (error) {
      console.error("Terms acceptance insert error:", error)
      return NextResponse.json({ ok: false, error: "Failed to record acceptance" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, accepted: true, termsVersion })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
