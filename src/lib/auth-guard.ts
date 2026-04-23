import "server-only";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { adminProfiles } from "@/db/schema";

export type AdminContext = {
  userId: string;
  orgId: string;
};

export type GuardResult =
  | { ok: true; ctx: AdminContext }
  | { ok: false; status: 401 | 403 | 500; error: string };

/**
 * Resolve the admin session + org for an API route.
 * Returns a discriminated union so route handlers can early-return with the right status.
 */
export async function requireAdmin(): Promise<GuardResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, status: 401, error: "Unauthorized." };
  if (session.user.role !== "admin") {
    return { ok: false, status: 403, error: "Forbidden." };
  }
  const profile = await db.query.adminProfiles.findFirst({
    where: eq(adminProfiles.userId, session.user.id),
  });
  if (!profile) {
    return {
      ok: false,
      status: 500,
      error: "Admin profile missing. Contact support.",
    };
  }
  return { ok: true, ctx: { userId: session.user.id, orgId: profile.orgId } };
}
