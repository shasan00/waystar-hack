import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { GridIcon, PageIcon } from "@/components/icons";
import { auth } from "@/lib/auth";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?redirect=/portal");

  return (
    <AppShell
      role="patient"
      user={{
        name: session.user.name,
        email: session.user.email,
        subtitle: "Patient",
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
