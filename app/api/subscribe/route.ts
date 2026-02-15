import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ['parent', 'coach', 'athlete'] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, role } = body;

    // Validate email
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    // Validate role
    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Please select a valid role (parent, coach, or athlete).' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // If Supabase is not configured (dev/demo mode), return success
    if (!supabase) {
      console.log('[subscribe] Dev mode - would insert:', { email: normalizedEmail, role });
      return NextResponse.json({
        success: true,
        message: "You're on the list! We'll notify you when LevelUp launches.",
      });
    }

    // Insert into Supabase leads table
    const { error } = await supabase
      .from('leads')
      .insert({
        email: normalizedEmail,
        role,
        created_at: new Date().toISOString(),
      });

    // Handle duplicate email (Postgres unique constraint violation code: 23505)
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({
          success: true,
          message: "You're already on the list! We'll be in touch soon.",
        });
      }

      console.error('[subscribe] Supabase insert error:', error);
      return NextResponse.json(
        { success: false, error: 'Something went wrong. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "You're on the list! We'll notify you when LevelUp launches.",
    });
  } catch (err) {
    console.error('[subscribe] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Invalid request. Please try again.' },
      { status: 400 }
    );
  }
}
