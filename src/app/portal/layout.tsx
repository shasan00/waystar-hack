import { AppShell } from "@/components/app-shell";
import { GridIcon, PageIcon } from "@/components/icons";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      role="patient"
      user={{
        name: "Jordan Rivera",
        email: "jordan.rivera@demo.com",
        subtitle: "Patient · MH-48219",
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
