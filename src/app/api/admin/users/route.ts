import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { user, account, adminProfiles } from "@/db/schema";

export const runtime = "nodejs";

interface Body {
  email?: unknown;
  fullName?: unknown;
  title?: unknown;
  password?: unknown;
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { email, fullName, title, password } = body;

  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400 },
    );
  }
  if (typeof fullName !== "string" || fullName.trim().length === 0) {
    return NextResponse.json(
      { error: "Full name is required." },
      { status: 400 },
    );
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }
  if (title !== undefined && typeof title !== "string") {
    return NextResponse.json(
      { error: "Title must be a string." },
      { status: 400 },
    );
  }

  const existing = await db.query.user.findFirst({
    where: eq(user.email, email),
  });
  if (existing) {
    return NextResponse.json(
      { error: "A user with that email already exists." },
      { status: 409 },
    );
  }

  // Single-tenant: new admins join the first org. Matches the PRD's
  // explicit out-of-scope on multi-org (prd.md:201).
  const org = await db.query.organizations.findFirst({
    orderBy: (o, { asc }) => asc(o.createdAt),
  });
  if (!org) {
    return NextResponse.json(
      { error: "No organization exists. Run the seed script first." },
      { status: 500 },
    );
  }

  const userId = randomUUID();
  const accountId = randomUUID();
  const now = new Date();
  const hash = await hashPassword(password);

  await db.insert(user).values({
    id: userId,
    name: fullName.trim(),
    email,
    emailVerified: true,
    role: "admin",
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
  await db.insert(adminProfiles).values({
    userId,
    orgId: org.id,
    fullName: fullName.trim(),
    title: typeof title === "string" && title.trim() ? title.trim() : null,
  });

  return NextResponse.json({ id: userId, email });
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const admins = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.role, "admin"))
    .orderBy(user.createdAt);

  return NextResponse.json({ admins });
}
