import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const ADMIN_EMAIL = "cbur22@gmail.com"

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey)
}

async function verifyAdmin(req: NextRequest) {
  const admin = getAdminClient()
  if (!admin) return { admin: null, error: "Database unavailable" }

  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null

  // Try cookie-based auth for web
  const { createServerClient } = await import("@supabase/ssr")
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll() {},
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser(token || undefined)
  if (!user || user.email !== ADMIN_EMAIL) {
    return { admin: null, error: "Forbidden" }
  }

  return { admin, error: null }
}

// GET: List all users
export async function GET(req: NextRequest) {
  const { admin, error } = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ ok: false, error }, { status: error === "Forbidden" ? 403 : 500 })

  const { data, error: listError } = await admin.auth.admin.listUsers()
  if (listError) {
    return NextResponse.json({ ok: false, error: listError.message }, { status: 500 })
  }

  const users = data.users.map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    email_confirmed_at: u.email_confirmed_at,
    banned_until: u.banned_until,
  }))

  return NextResponse.json({ ok: true, users })
}

// POST: Create user, reset password, ban/unban, or delete
export async function POST(req: NextRequest) {
  const { admin, error } = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ ok: false, error }, { status: error === "Forbidden" ? 403 : 500 })

  const body = await req.json()
  const { action } = body

  switch (action) {
    case "create": {
      const { email, password } = body
      if (!email || !password) {
        return NextResponse.json({ ok: false, error: "Missing email or password" }, { status: 400 })
      }
      const { data, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (createError) {
        return NextResponse.json({ ok: false, error: createError.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true, user: { id: data.user.id, email: data.user.email } })
    }

    case "reset-password": {
      const { userId, password } = body
      if (!userId || !password) {
        return NextResponse.json({ ok: false, error: "Missing userId or password" }, { status: 400 })
      }
      const { error: resetError } = await admin.auth.admin.updateUserById(userId, { password })
      if (resetError) {
        return NextResponse.json({ ok: false, error: resetError.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true, message: "Password updated" })
    }

    case "send-reset-email": {
      const { email } = body
      if (!email) {
        return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 })
      }
      const { error: sendError } = await admin.auth.resetPasswordForEmail(email)
      if (sendError) {
        return NextResponse.json({ ok: false, error: sendError.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true, message: "Reset email sent" })
    }

    case "ban": {
      const { userId } = body
      if (!userId) return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 })
      const { error: banError } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: "876600h", // ~100 years
      })
      if (banError) return NextResponse.json({ ok: false, error: banError.message }, { status: 500 })
      return NextResponse.json({ ok: true, message: "User banned" })
    }

    case "unban": {
      const { userId } = body
      if (!userId) return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 })
      const { error: unbanError } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      })
      if (unbanError) return NextResponse.json({ ok: false, error: unbanError.message }, { status: 500 })
      return NextResponse.json({ ok: true, message: "User unbanned" })
    }

    case "delete": {
      const { userId } = body
      if (!userId) return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 })
      const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
      if (deleteError) return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 })
      return NextResponse.json({ ok: true, message: "User deleted" })
    }

    default:
      return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 })
  }
}
