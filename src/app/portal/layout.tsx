import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { GridIcon, PageIcon } from "@/components/icons";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { patientProfiles, user as userTable } from "@/db/schema";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login?role=patient");

  const [row] = await db
    .select({
      role: userTable.role,
      email: userTable.email,
      name: userTable.name,
      fullName: patientProfiles.fullName,
      mrn: patientProfiles.mrn,
    })
    .from(userTable)
    .leftJoin(patientProfiles, eq(patientProfiles.userId, userTable.id))
    .where(eq(userTable.id, session.user.id))
    .limit(1);

  if (!row || row.role !== "patient") {
    redirect("/admin");
  }

  return (
    <AppShell
      role="patient"
      user={{
        name: row.fullName ?? row.name,
        email: row.email,
        subtitle: row.mrn ? `Patient · ${row.mrn}` : "Patient",
      }}
      nav={[
        { href: "/portal", label: "Your bills", icon: <GridIcon /> },
        { href: "/portal/history", label: "Payment history", icon: <PageIcon /> },
      ]}
    >
      {children}
    </AppShell>
  );
}
