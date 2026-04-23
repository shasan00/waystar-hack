import { PageHeader, PageBody } from "@/components/app-shell";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Organization settings"
        description="Defaults applied to every payment page your team creates."
      />
      <PageBody>
        <div className="mx-auto max-w-[640px] rounded-lg border border-rule bg-white p-6">
          <div className="text-[13px] text-ink-muted">
            Settings UI goes here — default logo, default brand color, team
            members, Stripe connection, Twilio connection, BAA status.
          </div>
        </div>
      </PageBody>
    </>
  );
}
