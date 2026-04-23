import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AppShell } from "@/components/app-shell";
import {
  GridIcon,
  PageIcon,
  ReportIcon,
  InboxIcon,
  CogIcon,
  UserIcon,
} from "@/components/icons";
import { auth } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/login?redirect=/admin");
  if (session.user.role !== "admin") redirect("/portal");

  return (
    <AppShell
      role="admin"
      user={{
        name: session.user.name,
        email: session.user.email,
        subtitle: "Memorial Health — Billing",
      }}
      nav={[
        { href: "/admin", label: "Overview", icon: <GridIcon /> },
        { href: "/admin/pages", label: "Payment pages", icon: <PageIcon /> },
        { href: "/admin/reports", label: "Reports", icon: <ReportIcon /> },
        { href: "/admin/users", label: "Admin users", icon: <UserIcon /> },
        { href: "/dev/inbox", label: "Inbox · SMS", icon: <InboxIcon /> },
        { href: "/admin/settings", label: "Settings", icon: <CogIcon /> },
      ]}
    >
      {children}
    </AppShell>
  );
}
