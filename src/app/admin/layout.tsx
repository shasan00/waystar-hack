import { AppShell } from "@/components/app-shell";
import { GridIcon, PageIcon, ReportIcon, InboxIcon, CogIcon } from "@/components/icons";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      role="admin"
      user={{
        name: "Sarah Okafor",
        email: "billing@memorialhealth.demo",
        subtitle: "Memorial Health — Billing",
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
