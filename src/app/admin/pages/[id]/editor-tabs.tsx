"use client";

import { useState } from "react";
import type { PaymentPageConfig } from "@/lib/demo-data";

const TABS = [
  { id: "branding", label: "Branding" },
  { id: "amount", label: "Amount" },
  { id: "fields", label: "Custom fields" },
  { id: "gl", label: "GL code" },
  { id: "email", label: "Email template" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function EditorTabs({ config }: { config: PaymentPageConfig }) {
  const [tab, setTab] = useState<TabId>("branding");

  return (
    <div className="rounded-lg border border-rule bg-white">
      <div
        role="tablist"
        aria-label="Page editor"
        className="flex items-center gap-1 overflow-x-auto border-b border-rule px-3 py-2"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={[
                "relative rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "text-waystar-deep"
                  : "text-ink-muted hover:text-ink",
              ].join(" ")}
            >
              {t.label}
              {active && (
                <span
                  className="absolute -bottom-[9px] left-3 right-3 h-[2px] origin-left bg-waystar"
                  style={{ animation: "draw-underline 220ms ease-out both" }}
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="p-5">
        {tab === "branding" && <BrandingTab config={config} />}
        {tab === "amount" && <AmountTab config={config} />}
        {tab === "fields" && <FieldsTab config={config} />}
        {tab === "gl" && <GLTab config={config} />}
        {tab === "email" && <EmailTab config={config} />}
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="mb-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </div>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-rule bg-white px-3 py-2 text-[13.5px] outline-none focus:border-waystar focus:ring-2 focus:ring-waystar/20"
    />
  );
}

function BrandingTab({ config }: { config: PaymentPageConfig }) {
  return (
    <>
      <Section label="Organization name">
        <Input value={config.orgName} />
      </Section>
      <Section label="Tagline / subtitle (admin only)">
        <Input value={config.orgTagline ?? ""} />
      </Section>
      <Section label="Page title">
        <Input value={config.title} />
      </Section>
      <Section label="Description">
        <textarea
          defaultValue={config.subtitle}
          className="w-full rounded-md border border-rule bg-white px-3 py-2 text-[13.5px] outline-none focus:border-waystar focus:ring-2 focus:ring-waystar/20"
          rows={3}
        />
      </Section>
      <Section label="Brand color">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-md border border-rule"
            style={{ backgroundColor: config.brandColor }}
          />
          <Input value={config.brandColor} />
        </div>
      </Section>
      <Section label="Logo">
        <div className="flex items-center gap-3 rounded-md border border-dashed border-rule bg-canvas px-4 py-5 text-[12px] text-ink-muted">
          Drag an image or{" "}
          <button className="text-waystar-deep underline underline-offset-4">
            browse
          </button>
        </div>
      </Section>
    </>
  );
}

function AmountTab({ config }: { config: PaymentPageConfig }) {
  return (
    <>
      <Section label="Amount mode">
        <div className="grid grid-cols-3 gap-2">
          {(["fixed", "range", "open"] as const).map((m) => {
            const active = config.amountMode === m;
            return (
              <button
                key={m}
                type="button"
                className={[
                  "rounded-md border px-3 py-3 text-left text-[12.5px]",
                  active
                    ? "border-waystar bg-waystar-wash text-waystar-deep"
                    : "border-rule bg-white text-ink hover:border-waystar/40",
                ].join(" ")}
              >
                <div className="font-medium capitalize">
                  {m === "open" ? "User-entered" : m}
                </div>
                <div className="mt-1 text-[11px] text-ink-muted">
                  {m === "fixed" && "Same amount for every payer"}
                  {m === "range" && "Min and max bounds"}
                  {m === "open" && "Payer chooses any amount"}
                </div>
              </button>
            );
          })}
        </div>
      </Section>
      {config.amountMode === "fixed" && (
        <Section label="Amount (USD)">
          <Input
            value={
              config.fixedAmount ? (config.fixedAmount / 100).toFixed(2) : ""
            }
          />
        </Section>
      )}
      <Section label="Payment plan options">
        <label className="flex items-start gap-3 rounded-md border border-rule bg-white px-3 py-3">
          <input
            type="checkbox"
            defaultChecked={config.allowPlans}
            className="mt-1 h-4 w-4 accent-waystar"
          />
          <div>
            <div className="text-[13px] font-medium text-ink">
              Allow 3-month or 6-month plans
            </div>
            <div className="mt-1 text-[12px] text-ink-muted">
              Patients can split balances over 3 or 6 months. First installment
              is charged now; subsequent installments appear in the ledger.
            </div>
          </div>
        </label>
      </Section>
    </>
  );
}

function FieldsTab({ config }: { config: PaymentPageConfig }) {
  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[13px] text-ink-muted">
          {config.fields.length} of 10 custom fields
        </div>
        <button
          className="inline-flex items-center gap-1 rounded-md border border-rule bg-white px-2.5 py-1.5 text-[12px] hover:border-waystar disabled:opacity-50"
          disabled={config.fields.length >= 10}
        >
          + Add field
        </button>
      </div>
      <ul className="divide-y divide-rule rounded-md border border-rule bg-white">
        {config.fields.map((f, i) => (
          <li
            key={f.id}
            className="flex items-center gap-3 px-3 py-3 text-[13px]"
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-canvas font-mono text-[11px] text-ink-muted">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-ink">{f.label}</div>
              <div className="text-[11px] text-ink-muted">
                {f.type}
                {f.required ? " · required" : ""}
                {f.placeholder && ` · “${f.placeholder}”`}
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <OrderButton
                label="Move up"
                disabled={i === 0}
                direction="up"
              />
              <OrderButton
                label="Move down"
                disabled={i === config.fields.length - 1}
                direction="down"
              />
            </div>
            <button className="ml-1 text-[11.5px] text-ink-muted hover:text-waystar-deep">
              edit
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-ink-muted">
        Supported types: text · number · dropdown · date · checkbox. Required
        flag and placeholder/helper text configurable per field.
      </p>
    </>
  );
}

function OrderButton({
  label,
  disabled,
  direction,
}: {
  label: string;
  disabled?: boolean;
  direction: "up" | "down";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className="grid h-6 w-6 place-items-center rounded text-ink-muted hover:bg-canvas hover:text-ink disabled:opacity-30"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
        <path
          d={direction === "up" ? "M5 15l7-7 7 7" : "M5 9l7 7 7-7"}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function GLTab({ config }: { config: PaymentPageConfig }) {
  return (
    <>
      <Section label="GL codes">
        <div className="rounded-md border border-rule bg-white p-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <GLChip code={config.glCode} primary />
            <button className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-rule bg-canvas px-2.5 text-[11.5px] text-ink-muted hover:border-waystar hover:text-waystar-deep">
              + Add GL code
            </button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-ink-muted">
          Associate one or more GL codes with this page. Each code is stored on
          every completed transaction for downstream reporting.
        </p>
      </Section>
      <div className="rounded-md border border-rule bg-waystar-wash/40 p-3 text-[12px] text-ink-muted">
        Expected format:{" "}
        <code className="font-mono text-ink">NNNN-XXX</code> — 4 digits, dash, 3
        letters. Validation runs on save.
      </div>
    </>
  );
}

function GLChip({ code, primary }: { code: string; primary?: boolean }) {
  return (
    <span
      className={[
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 font-mono text-[11.5px]",
        primary
          ? "border-waystar/30 bg-waystar-wash text-waystar-deep"
          : "border-rule bg-canvas text-ink",
      ].join(" ")}
    >
      {code}
      {primary && (
        <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] font-sans uppercase tracking-wider text-waystar-deep">
          primary
        </span>
      )}
      <button
        type="button"
        aria-label={`Remove GL code ${code}`}
        className="ml-0.5 text-ink-muted hover:text-ink"
      >
        ×
      </button>
    </span>
  );
}

function EmailTab({ config }: { config: PaymentPageConfig }) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <label className="inline-flex items-center gap-2 text-[12.5px] text-ink">
          <input
            type="checkbox"
            defaultChecked
            className="h-4 w-4 accent-waystar"
          />
          Use a custom template (leave off to use the platform default)
        </label>
      </div>
      <Section label="Confirmation email">
        <textarea
          rows={10}
          defaultValue={`Hi {{payer_name}},\n\nThank you — we received your payment of {{amount}} on {{date}}.\n\nTransaction ID: {{transaction_id}}\n\nIf you have any questions about this payment, reply to this email or call us at (555) 121-0199.\n\n— The billing team at {{org_name}}`}
          className="w-full rounded-md border border-rule bg-white px-3 py-2 font-mono text-[12.5px] leading-relaxed outline-none focus:border-waystar focus:ring-2 focus:ring-waystar/20"
        />
      </Section>
      <div className="rounded-md border border-rule bg-waystar-wash/40 p-3 text-[11.5px] text-ink-muted">
        <div className="mb-1 font-medium text-ink">Supported variables</div>
        <div className="flex flex-wrap gap-1.5">
          {[
            "{{payer_name}}",
            "{{amount}}",
            "{{date}}",
            "{{transaction_id}}",
            "{{org_name}}",
            ...config.fields.map((f) => `{{field.${f.id}}}`),
          ].map((v) => (
            <code
              key={v}
              className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-ink"
            >
              {v}
            </code>
          ))}
        </div>
        <p className="mt-2">
          Field variables map to the custom-field responses submitted by the
          payer.
        </p>
      </div>
    </>
  );
}
