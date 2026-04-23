"use client";

import { createAuthClient } from "better-auth/react";

// Always use the origin the page was served from. Avoids the
// NEXT_PUBLIC_SITE_URL being frozen at build time and pointing at localhost
// when the client bundle is served from a different host later.
const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

export const authClient = createAuthClient({ baseURL });

export const { signIn, signUp, signOut, useSession } = authClient;
