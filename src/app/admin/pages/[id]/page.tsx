import { notFound, redirect } from "next/navigation";
import { PageBody } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth-guard";
import { getAdminPageById } from "@/db/queries";
import { PageEditorClient } from "./editor-client";

export default async function PageEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const guard = await requireAdmin();
  if (!guard.ok) {
    if (guard.status === 401) redirect("/login");
    return (
      <PageBody>
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
          {guard.error}
        </div>
      </PageBody>
    );
  }

  const page = await getAdminPageById(id, guard.ctx.orgId);
  if (!page) return notFound();

  return (
    <PageEditorClient
      initial={{
        id: page.id,
        slug: page.slug,
        orgName: page.org.name,
        title: page.title,
        subtitle: page.subtitle,
        headerMessage: page.headerMessage,
        footerMessage: page.footerMessage,
        brandColor: page.brandColor,
        logoUrl: page.logoUrl,
        amountMode: page.amountMode,
        fixedAmountCents: page.fixedAmountCents,
        minAmountCents: page.minAmountCents,
        maxAmountCents: page.maxAmountCents,
        glCodes: page.glCodes,
        emailTemplateBody: page.emailTemplateBody,
        allowPlans: page.allowPlans,
        planInstallmentOptions: page.planInstallmentOptions,
        isActive: page.isActive,
        fields: page.fields.map((f) => ({
          id: f.id,
          label: f.label,
          type: f.type as
            | "text"
            | "number"
            | "dropdown"
            | "date"
            | "checkbox",
          options: (f.options as string[] | null) ?? null,
          required: f.required,
          placeholder: f.placeholder,
          helperText: f.helperText,
          displayOrder: f.displayOrder,
        })),
      }}
    />
  );
}
