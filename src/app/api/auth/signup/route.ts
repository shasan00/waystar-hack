import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/db/client";
import { user, account, patientProfiles } from "@/db/schema";

export const runtime = "nodejs";

/**
 * Public patient signup.
 *
 * Admins are provisioned through `/api/admin/users` (admin-only). Patient
 * signup is open. Uses the same manual insert path as admin provisioning
 * so we don't depend on Better Auth's higher-level signUpEmail, which
 * behaved inconsistently in this project (different thrown shape on
 * duplicate email, cookie-setting side-effects tied to request context).
 */

interface Body {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  profileData?: {
    fullName?: unknown;
    phone?: unknown;
    dateOfBirth?: unknown;
    mrn?: unknown;
  };
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const profile = body.profileData ?? {};
  const fullName =
    typeof profile.fullName === "string" && profile.fullName.trim().length > 0
      ? profile.fullName.trim()
      : name;
  const phone =
    typeof profile.phone === "string" && profile.phone.trim().length > 0
      ? profile.phone.trim()
      : null;
  const dateOfBirth =
    typeof profile.dateOfBirth === "string" &&
    profile.dateOfBirth.trim().length > 0
      ? profile.dateOfBirth
      : null;
  const mrn =
    typeof profile.mrn === "string" && profile.mrn.trim().length > 0
      ? profile.mrn.trim()
      : null;

  if (name.length === 0) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const existing = await db.query.user.findFirst({
    where: eq(user.email, email),
  });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 },
    );
  }

  const userId = randomUUID();
  const accountId = randomUUID();
  const now = new Date();
  const hash = await hashPassword(password);

  try {
    await db.insert(user).values({
      id: userId,
      name,
      email,
      emailVerified: true,
      role: "patient",
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(account).values({
      id: accountId,
      userId,
      accountId: userId,
      providerId: "credential",
      password: hash,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(patientProfiles).values({
      userId,
      fullName,
      phone,
      dateOfBirth,
      mrn,
    });
  } catch (err) {
    console.error("[signup] insert failed", err);
    return NextResponse.json(
      { error: "Could not create account. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { id: userId, email, message: "Account created." },
    { status: 201 },
  );
}
