"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import {
  user,
  adminProfiles,
  patientProfiles,
  organizations,
} from "@/db/schema";

/**
 * Runs after Better Auth sign-up. The client calls signUp.email() to create
 * the user + credential account, then invokes this to:
 *   1. stamp the chosen role on the user row
 *   2. create the matching admin_profile or patient_profile
 *
 * Admin accounts attach to the first org in the DB (demo simplification —
 * in production this would be invite-code gated).
 */
export async function finalizeSignupAction(args: {
  role: "admin" | "patient";
  fullName: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  const userId = session.user.id;

  await db.update(user).set({ role: args.role }).where(eq(user.id, userId));

  if (args.role === "admin") {
    const [org] = await db.select().from(organizations).limit(1);
    if (!org) {
      throw new Error(
        "No organization exists yet. Run `pnpm db:seed` or ask a platform admin to create one.",
      );
    }
    await db
      .insert(adminProfiles)
      .values({
        userId,
        orgId: org.id,
        fullName: args.fullName,
      })
      .onConflictDoNothing();
  } else {
    await db
      .insert(patientProfiles)
      .values({
        userId,
        fullName: args.fullName,
      })
      .onConflictDoNothing();
  }
}

/**
 * Reads the current session's role — used on sign-in to decide whether to
 * route to /admin or /portal.
 */
export async function getSessionRoleAction(): Promise<
  "admin" | "patient" | null
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const [row] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  return (row?.role as "admin" | "patient" | undefined) ?? "patient";
}
