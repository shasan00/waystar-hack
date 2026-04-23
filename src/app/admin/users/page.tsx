import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { user, adminProfiles } from "@/db/schema";
import { NewAdminForm } from "./new-admin-form";

export default async function AdminUsersPage() {
  const admins = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      fullName: adminProfiles.fullName,
      title: adminProfiles.title,
    })
    .from(user)
    .leftJoin(adminProfiles, eq(adminProfiles.userId, user.id))
    .where(eq(user.role, "admin"))
    .orderBy(user.createdAt);

  return (
    <div className="mx-auto max-w-[960px] px-6 py-10">
      <header className="mb-8">
        <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-muted">
          Admin users
        </div>
        <h1 className="mt-1 font-display text-[32px] leading-tight tracking-tight text-ink">
          Team
        </h1>
        <p className="mt-2 max-w-[60ch] text-[14px] text-ink-muted">
          Provision staff who can configure payment pages and view reports.
          New admins sign in at <code>/login</code> with the credentials below.
        </p>
      </header>

      <section className="mb-10 rounded-lg border border-rule bg-white">
        <div className="border-b border-rule px-5 py-3 text-[11px] font-mono uppercase tracking-[0.14em] text-ink-muted">
          Current admins ({admins.length})
        </div>
        <ul className="divide-y divide-rule">
          {admins.map((a) => (
            <li key={a.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <div className="text-[14px] text-ink">
                  {a.fullName ?? a.name}
                </div>
                <div className="text-[12px] text-ink-muted">{a.email}</div>
              </div>
              <div className="text-[12px] text-ink-muted">
                {a.title ?? "—"}
              </div>
            </li>
          ))}
          {admins.length === 0 && (
            <li className="px-5 py-6 text-center text-[13px] text-ink-muted">
              No admins yet.
            </li>
          )}
        </ul>
      </section>

      <section className="rounded-lg border border-rule bg-white p-5">
        <h2 className="mb-1 text-[14px] font-medium text-ink">
          Create a new admin
        </h2>
        <p className="mb-4 text-[12px] text-ink-muted">
          The user will be able to sign in immediately with the password set below.
        </p>
        <NewAdminForm />
      </section>
    </div>
  );
}
