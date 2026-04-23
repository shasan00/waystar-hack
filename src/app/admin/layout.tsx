import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { GridIcon, PageIcon, ReportIcon, InboxIcon, CogIcon } from "@/components/icons";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { adminProfiles, organizations, user as userTable } from "@/db/schema";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login?role=admin");

  // Load role + admin profile (with org name for the sidebar subtitle).
  const [row] = await db
    .select({
      role: userTable.role,
      email: userTable.email,
      name: userTable.name,
      fullName: adminProfiles.fullName,
      orgName: organizations.name,
    })
    .from(userTable)
    .leftJoin(adminProfiles, eq(adminProfiles.userId, userTable.id))
    .leftJoin(organizations, eq(organizations.id, adminProfiles.orgId))
    .where(eq(userTable.id, session.user.id))
    .limit(1);

  if (!row || row.role !== "admin") {
    redirect("/portal");
  }

  return (
    <AppShell
      role="admin"
      user={{
        name: row.fullName ?? row.name,
        email: row.email,
        subtitle: row.orgName
          ? `${row.orgName} — Billing`
          : "Provider admin",
      }}
      nav={[
        { href: "/admin", label: "Overview", icon: <GridIcon /> },
        { href: "/admin/pages", label: "Payment pages", icon: <PageIcon /> },
        { href: "/admin/reports", label: "Reports", icon: <ReportIcon /> },
        { href: "/dev/inbox", label: "Inbox · SMS", icon: <InboxIcon /> },
        { href: "/admin/settings", label: "Settings", icon: <CogIcon /> },
      ]}
    >
      {children}
    </AppShell>
  );
}
