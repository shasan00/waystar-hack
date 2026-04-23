// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth"; // your Better Auth instance
import { db } from "@/db/client";
import { patientProfiles, adminProfiles } from "@/db/schema";

export async function POST(req: Request) {
  const { name, email, password, role, profileData } = await req.json();
  // profileData shape:
  //   patient → { fullName, phone?, dateOfBirth?, mrn? }
  //   admin   → { fullName, orgId, title? }

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  // Step 1: Let Better Auth create the user + account rows (handles hashing)
  const signUpResponse = await auth.api.signUpEmail({
    body: { name, email, password },
  });

  if (!signUpResponse || signUpResponse.error) {
    const msg = signUpResponse?.error?.message ?? "Signup failed.";
    // Better Auth returns 422 if email is already taken
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  const userId = signUpResponse.user.id;

  // Step 2: Set role on the user row (Better Auth doesn't set custom fields by default)
  await db
    .update(user)
    .set({ role })
    .where(eq(user.id, userId));

  // Step 3: Insert the matching profile
  try {
    if (role === "patient") {
      await db.insert(patientProfiles).values({
        userId,
        fullName: profileData.fullName,
        phone: profileData.phone ?? null,
        dateOfBirth: profileData.dateOfBirth ?? null,
        mrn: profileData.mrn ?? null,
      });
    } else if (role === "admin") {
      await db.insert(adminProfiles).values({
        userId,
        orgId: profileData.orgId, // must be a valid existing org uuid
        fullName: profileData.fullName,
        title: profileData.title ?? null,
      });
    }
  } catch (err) {
    // Profile insert failed — user was created but profile wasn't. Log this.
    console.error("Profile insert failed after user creation:", err);
    return NextResponse.json(
      { error: "Account created but profile setup failed. Contact support." },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: "Account created successfully." }, { status: 201 });
}