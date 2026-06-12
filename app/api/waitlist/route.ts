import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

// Simple, dependency-free email check. We keep it permissive — the database
// `unique` constraint is the real source of truth for duplicates.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { email, company } = (body ?? {}) as {
    email?: unknown;
    company?: unknown;
  };

  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const normalizedCompany =
    typeof company === "string" && company.trim().length > 0
      ? company.trim().slice(0, 200)
      : null;

  let supabase;
  try {
    supabase = getServiceSupabase();
  } catch {
    // Misconfiguration (missing env vars). Don't leak details to the client.
    return NextResponse.json(
      { error: "The waitlist is temporarily unavailable. Please try again later." },
      { status: 500 },
    );
  }

  const { error } = await supabase
    .from("waitlist")
    .insert({ email: normalizedEmail, company: normalizedCompany });

  if (error) {
    // 23505 = unique_violation (duplicate email).
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You're already on the waitlist." },
        { status: 409 },
      );
    }

    console.error("Waitlist insert failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
