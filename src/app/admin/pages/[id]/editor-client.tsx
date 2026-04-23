"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader, PageBody } from "@/components/app-shell";
import { CopyIcon, QRCodeIcon, SmsIcon, LinkIcon } from "@/components/icons";
import { formatMoney } from "@/lib/demo-data";
import {
  GL_CODE_RE,
  normalizeAmountFields,
  validateUpdate,
  type AmountMode,
  type FieldType,
  type PageUpdateInput,
} from "@/lib/validation/page-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EditorField = {
  id: number;
  label: string;
  type: FieldType;
  options: string[] | null;
  required: boolean;
  placeholder: string | null;
  helperText: string | null;
  displayOrder: number;
};

export type EditorInitial = {
  id: string;
  slug: string;
  orgName: string;
  title: string;
  subtitle: string | null;
  headerMessage: string | null;
  footerMessage: string | null;
  brandColor: string;
  logoUrl: string | null;
  amountMode: AmountMode;
  fixedAmountCents: number | null;
  minAmountCents: number | null;
  maxAmountCents: number | null;
  glCodes: string[];
  emailTemplateBody: string | null;
  allowPlans: boolean;
  planInstallmentOptions: number[];
  isActive: boolean;
  fields: EditorField[];
};

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

// ---------------------------------------------------------------------------
// Autosave hook — debounced whole-page PATCH
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 600;

function useAutosave(
  pageId: string,
  payload: PageUpdateInput,
  enabled: boolean,
) {
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const serialized = JSON.stringify(payload);
  const firstRunRef = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState({ kind: "saving" });
      try {
        const res = await fetch(`/api/admin/pages/${pageId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: serialized,
          signal: controller.signal,
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setState({ kind: "error", message: j.error ?? "Save failed." });
          return;
        }
        setState({ kind: "saved", at: Date.now() });
      } catch (e) {
        if ((e as { name?: string }).name === "AbortError") return;
        setState({ kind: "error", message: "Network error." });
      }
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, enabled, pageId]);

  return state;
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state.kind === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-muted">
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-waystar"
          aria-hidden
        />
        Saving…
      </span>
    );
  }
  if (state.kind === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11.5px] text-success">
        <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
        Saved
      </span>
    );
  }
  if (state.kind === "error") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11.5px] text-destructive"
        role="alert"
      >
        <span
          className="h-1.5 w-1.5 rounded-full bg-destructive"
          aria-hidden
        />
        {state.message}
      </span>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const TABS = [
  { id: "branding", label: "Branding" },
  { id: "amount", label: "Amount" },
  { id: "fields", label: "Custom fields" },
  { id: "gl", label: "GL code" },
  { id: "email", label: "Email template" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function PageEditorClient({ initial }: { initial: EditorInitial }) {
  // Editable scalar state
  const [title, setTitle] = useState(initial.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle ?? "");
  const [headerMessage, setHeaderMessage] = useState(
    initial.headerMessage ?? "",
  );
  const [footerMessage, setFooterMessage] = useState(
    initial.footerMessage ?? "",
  );
  const [brandColor, setBrandColor] = useState(initial.brandColor);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? "");
  const [amountMode, setAmountMode] = useState<AmountMode>(initial.amountMode);
  const [fixedAmount, setFixedAmount] = useState<string>(
    initial.fixedAmountCents != null
      ? (initial.fixedAmountCents / 100).toFixed(2)
      : "",
  );
  const [minAmount, setMinAmount] = useState<string>(
    initial.minAmountCents != null
      ? (initial.minAmountCents / 100).toFixed(2)
      : "",
  );
  const [maxAmount, setMaxAmount] = useState<string>(
    initial.maxAmountCents != null
      ? (initial.maxAmountCents / 100).toFixed(2)
      : "",
  );
  const [glCodes, setGlCodes] = useState<string[]>(initial.glCodes);
  const [glDraft, setGlDraft] = useState("");
  const [emailTemplate, setEmailTemplate] = useState(
    initial.emailTemplateBody ?? "",
  );
  const [allowPlans, setAllowPlans] = useState(initial.allowPlans);
  const [planInstallmentOptions, setPlanInstallmentOptions] = useState<
    number[]
  >(initial.planInstallmentOptions ?? []);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [tab, setTab] = useState<TabId>("branding");

  // Fields are managed via separate API calls; state mirrors the server.
  const [fields, setFields] = useState<EditorField[]>(initial.fields);

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return `/pay/${initial.slug}`;
    return `${window.location.origin}/pay/${initial.slug}`;
  }, [initial.slug]);

  // Build PATCH payload. Dollar strings → cents; empty → null.
  const patchPayload = useMemo<PageUpdateInput>(() => {
    const dollarsToCents = (s: string): number | null => {
      const t = s.trim();
      if (t.length === 0) return null;
      const n = Number(t);
      if (!Number.isFinite(n)) return null;
      return Math.round(n * 100);
    };
    const base: PageUpdateInput = {
      title: title,
      subtitle: subtitle.trim().length === 0 ? null : subtitle,
      headerMessage:
        headerMessage.trim().length === 0 ? null : headerMessage,
      footerMessage:
        footerMessage.trim().length === 0 ? null : footerMessage,
      brandColor,
      logoUrl: logoUrl.trim().length === 0 ? null : logoUrl,
      amountMode,
      fixedAmountCents: dollarsToCents(fixedAmount),
      minAmountCents: dollarsToCents(minAmount),
      maxAmountCents: dollarsToCents(maxAmount),
      glCodes,
      emailTemplateBody:
        emailTemplate.trim().length === 0 ? null : emailTemplate,
      allowPlans,
      planInstallmentOptions,
      isActive,
    };
    return normalizeAmountFields(base);
  }, [
    title,
    subtitle,
    headerMessage,
    footerMessage,
    brandColor,
    logoUrl,
    amountMode,
    fixedAmount,
    minAmount,
    maxAmount,
    glCodes,
    emailTemplate,
    allowPlans,
    planInstallmentOptions,
    isActive,
  ]);

  // Skip autosave when client-side validation would fail — prevents spamming
  // 400s while the user is mid-edit in an invalid state.
  const clientValid = useMemo(
    () => validateUpdate(patchPayload).length === 0 && title.trim().length > 0,
    [patchPayload, title],
  );
  const saveState = useAutosave(initial.id, patchPayload, clientValid);

  // --- Custom field mutations (immediate API calls) ----------------------

  const [fieldsBusy, setFieldsBusy] = useState(false);
  const [fieldsError, setFieldsError] = useState<string | null>(null);

  const addField = useCallback(async () => {
    if (fields.length >= 10) return;
    setFieldsBusy(true);
    setFieldsError(null);
    try {
      const res = await fetch(
        `/api/admin/pages/${initial.id}/custom-fields`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            label: "New field",
            type: "text",
            required: false,
          }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as {
        field?: EditorField;
        error?: string;
      };
      if (!res.ok || !json.field) {
        setFieldsError(json.error ?? "Failed to add field.");
        return;
      }
      setFields((prev) => [...prev, json.field!]);
    } finally {
      setFieldsBusy(false);
    }
  }, [fields.length, initial.id]);

  const updateField = useCallback(
    async (fieldId: number, patch: Partial<EditorField>) => {
      setFields((prev) =>
        prev.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
      );
      setFieldsError(null);
      const res = await fetch(
        `/api/admin/pages/${initial.id}/custom-fields/${fieldId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setFieldsError(j.error ?? "Field update failed.");
      }
    },
    [initial.id],
  );

  const deleteField = useCallback(
    async (fieldId: number) => {
      const prev = fields;
      setFields((p) => p.filter((f) => f.id !== fieldId));
      setFieldsError(null);
      const res = await fetch(
        `/api/admin/pages/${initial.id}/custom-fields/${fieldId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        setFields(prev);
        setFieldsError("Failed to delete field.");
      }
    },
    [fields, initial.id],
  );

  const reorderField = useCallback(
    async (fieldId: number, direction: "up" | "down") => {
      const idx = fields.findIndex((f) => f.id === fieldId);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= fields.length) return;
      const next = [...fields];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      setFields(next);
      const order = next.map((f) => f.id);
      const res = await fetch(
        `/api/admin/pages/${initial.id}/custom-fields`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ order }),
        },
      );
      if (!res.ok) {
        setFields(fields);
        setFieldsError("Reorder failed.");
      }
    },
    [fields, initial.id],
  );

  // --- UI --------------------------------------------------------------

  return (
    <>
      <PageHeader
        eyebrow={`Page · /pay/${initial.slug}`}
        title={title || "Untitled page"}
        description={subtitle || "Configure branding, amount, and custom fields."}
        actions={
          <>
            <SaveIndicator state={saveState} />
            <label className="inline-flex h-10 items-center gap-2 rounded-md border border-rule bg-white px-3 text-[12.5px] text-ink">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 accent-waystar"
                aria-label="Page is enabled"
              />
              <span className="font-medium">
                {isActive ? "Enabled" : "Disabled"}
              </span>
              <span className="text-[11px] text-ink-muted">
                {isActive ? "(payers can pay)" : "(hidden from payers)"}
              </span>
            </label>
            <Link
              href={`/pay/${initial.slug}`}
              target="_blank"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-rule bg-white px-3 text-[13px] text-ink hover:border-waystar"
            >
              Open live page
            </Link>
          </>
        }
      />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
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
                    type="button"
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
                        className="absolute -bottom-[9px] left-3 right-3 h-[2px] bg-waystar"
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="p-5">
              {tab === "branding" && (
                <BrandingTab
                  orgName={initial.orgName}
                  slug={initial.slug}
                  title={title}
                  setTitle={setTitle}
                  subtitle={subtitle}
                  setSubtitle={setSubtitle}
                  headerMessage={headerMessage}
                  setHeaderMessage={setHeaderMessage}
                  footerMessage={footerMessage}
                  setFooterMessage={setFooterMessage}
                  brandColor={brandColor}
                  setBrandColor={setBrandColor}
                  logoUrl={logoUrl}
                  setLogoUrl={setLogoUrl}
                />
              )}
              {tab === "amount" && (
                <AmountTab
                  amountMode={amountMode}
                  setAmountMode={setAmountMode}
                  fixedAmount={fixedAmount}
                  setFixedAmount={setFixedAmount}
                  minAmount={minAmount}
                  setMinAmount={setMinAmount}
                  maxAmount={maxAmount}
                  setMaxAmount={setMaxAmount}
                  allowPlans={allowPlans}
                  setAllowPlans={setAllowPlans}
                  planInstallmentOptions={planInstallmentOptions}
                  setPlanInstallmentOptions={setPlanInstallmentOptions}
                />
              )}
              {tab === "fields" && (
                <FieldsTab
                  fields={fields}
                  busy={fieldsBusy}
                  error={fieldsError}
                  onAdd={addField}
                  onUpdate={updateField}
                  onDelete={deleteField}
                  onReorder={reorderField}
                />
              )}
              {tab === "gl" && (
                <GLTab
                  glCodes={glCodes}
                  setGlCodes={setGlCodes}
                  glDraft={glDraft}
                  setGlDraft={setGlDraft}
                />
              )}
              {tab === "email" && (
                <EmailTab
                  emailTemplate={emailTemplate}
                  setEmailTemplate={setEmailTemplate}
                  fields={fields}
                />
              )}
            </div>
          </div>

          {/* Live preview & distribution */}
          <div className="space-y-6">
            <div className="overflow-hidden rounded-lg border border-rule bg-white">
              <div className="flex items-center justify-between border-b border-rule px-5 py-3">
                <div className="text-[13px] font-medium">Live preview</div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                  /pay/{initial.slug}
                </span>
              </div>
              <div className="bg-canvas p-6">
                <div className="mx-auto max-w-[420px] rounded-md border border-rule bg-white p-5 shadow-[0_8px_32px_-20px_rgba(10,10,10,0.25)]">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                    {initial.orgName}
                  </div>
                  <div className="mt-1 font-display text-[24px] leading-tight text-ink">
                    {title || "Untitled page"}
                  </div>
                  <div className="mt-3 text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                    {amountMode === "fixed"
                      ? "Amount due"
                      : amountMode === "range"
                        ? "Enter amount"
                        : "Pay what you'd like"}
                  </div>
                  <div
                    className="tabular font-display text-[42px] leading-none"
                    style={{ color: brandColor }}
                  >
                    {amountMode === "fixed" &&
                      patchPayload.fixedAmountCents != null &&
                      formatMoney(patchPayload.fixedAmountCents)}
                    {amountMode === "range" && "—"}
                    {amountMode === "open" && "—"}
                  </div>
                  <button
                    className="mt-5 h-10 w-full rounded-md text-[13px] font-medium text-white"
                    style={{ backgroundColor: brandColor }}
                    type="button"
                    disabled
                  >
                    Pay now
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-rule bg-white">
              <div className="border-b border-rule px-5 py-3 text-[13px] font-medium">
                Share this page
              </div>
              <div className="space-y-4 p-5">
                <ShareRow
                  icon={<LinkIcon />}
                  title="Public URL"
                  subtitle={publicUrl}
                  action={
                    <CopyButton text={publicUrl} label="Copy URL" />
                  }
                />
                <ShareRow
                  icon={<QRCodeIcon />}
                  title="QR code"
                  subtitle="Scans to the public URL. Downloadable as PNG or SVG."
                  action={<QrDownloadButtons pageId={initial.id} />}
                />
                <ShareRow
                  icon={<SmsIcon />}
                  title="Send by text"
                  subtitle="Provider differentiator — not part of this slice."
                  action={
                    <span className="text-[11px] text-ink-muted">later</span>
                  }
                />
                <ShareRow
                  icon={<CopyIcon />}
                  title="Embed iframe"
                  subtitle="Copy a snippet to drop into an external site."
                  action={
                    <CopyButton
                      text={`<iframe src="${publicUrl}" width="520" height="720" style="border:0" loading="lazy"></iframe>`}
                      label="Copy snippet"
                    />
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </PageBody>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function Section({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="mb-5">
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[11px] font-mono uppercase tracking-[0.14em] text-ink-muted"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id?: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      id={id}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-md border border-rule bg-white px-3 py-2 text-[13.5px] outline-none focus:border-waystar focus:ring-2 focus:ring-waystar/20 disabled:bg-canvas disabled:text-ink-muted"
    />
  );
}

function BrandingTab(props: {
  orgName: string;
  slug: string;
  title: string;
  setTitle: (v: string) => void;
  subtitle: string;
  setSubtitle: (v: string) => void;
  headerMessage: string;
  setHeaderMessage: (v: string) => void;
  footerMessage: string;
  setFooterMessage: (v: string) => void;
  brandColor: string;
  setBrandColor: (v: string) => void;
  logoUrl: string;
  setLogoUrl: (v: string) => void;
}) {
  return (
    <>
      <Section label="Organization">
        <TextInput value={props.orgName} disabled />
      </Section>
      <Section label="URL slug (permanent)">
        <TextInput value={`/pay/${props.slug}`} disabled />
      </Section>
      <Section label="Page title" htmlFor="ed-title">
        <TextInput
          id="ed-title"
          value={props.title}
          onChange={props.setTitle}
        />
      </Section>
      <Section label="Description" htmlFor="ed-subtitle">
        <textarea
          id="ed-subtitle"
          value={props.subtitle}
          onChange={(e) => props.setSubtitle(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-rule bg-white px-3 py-2 text-[13.5px] outline-none focus:border-waystar focus:ring-2 focus:ring-waystar/20"
        />
      </Section>
      <Section label="Header message" htmlFor="ed-header">
        <TextInput
          id="ed-header"
          value={props.headerMessage}
          onChange={props.setHeaderMessage}
          placeholder="Shown at the top of the public page (optional)"
        />
      </Section>
      <Section label="Footer message" htmlFor="ed-footer">
        <TextInput
          id="ed-footer"
          value={props.footerMessage}
          onChange={props.setFooterMessage}
          placeholder="Shown at the bottom of the public page (optional)"
        />
      </Section>
      <Section label="Brand color" htmlFor="ed-brand">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-md border border-rule"
            style={{ backgroundColor: props.brandColor }}
            aria-hidden
          />
          <TextInput
            id="ed-brand"
            value={props.brandColor}
            onChange={props.setBrandColor}
            placeholder="#F15A22"
          />
        </div>
      </Section>
      <Section label="Logo URL" htmlFor="ed-logo">
        <TextInput
          id="ed-logo"
          value={props.logoUrl}
          onChange={props.setLogoUrl}
          placeholder="https://…/logo.png (optional)"
        />
      </Section>
    </>
  );
}

function AmountTab(props: {
  amountMode: AmountMode;
  setAmountMode: (v: AmountMode) => void;
  fixedAmount: string;
  setFixedAmount: (v: string) => void;
  minAmount: string;
  setMinAmount: (v: string) => void;
  maxAmount: string;
  setMaxAmount: (v: string) => void;
  allowPlans: boolean;
  setAllowPlans: (v: boolean) => void;
  planInstallmentOptions: number[];
  setPlanInstallmentOptions: (v: number[]) => void;
}) {
  const { amountMode } = props;
  const INSTALLMENT_CHOICES = [2, 3, 4, 6, 12] as const;
  const toggleInstallment = (n: number) => {
    const has = props.planInstallmentOptions.includes(n);
    const next = has
      ? props.planInstallmentOptions.filter((x) => x !== n)
      : [...props.planInstallmentOptions, n].sort((a, b) => a - b);
    props.setPlanInstallmentOptions(next);
  };
  return (
    <>
      <Section label="Amount mode">
        <div className="grid grid-cols-3 gap-2">
          {(["fixed", "range", "open"] as const).map((m) => {
            const active = amountMode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => props.setAmountMode(m)}
                aria-pressed={active}
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
      {amountMode === "fixed" && (
        <Section label="Amount (USD)" htmlFor="ed-fixed">
          <TextInput
            id="ed-fixed"
            value={props.fixedAmount}
            onChange={props.setFixedAmount}
            placeholder="e.g. 84.70"
          />
        </Section>
      )}
      {amountMode === "range" && (
        <div className="grid grid-cols-2 gap-3">
          <Section label="Min (USD)" htmlFor="ed-min">
            <TextInput
              id="ed-min"
              value={props.minAmount}
              onChange={props.setMinAmount}
              placeholder="10.00"
            />
          </Section>
          <Section label="Max (USD)" htmlFor="ed-max">
            <TextInput
              id="ed-max"
              value={props.maxAmount}
              onChange={props.setMaxAmount}
              placeholder="500.00"
            />
          </Section>
        </div>
      )}
      <Section label="Payment plan options">
        <label className="flex items-start gap-3 rounded-md border border-rule bg-white px-3 py-3">
          <input
            type="checkbox"
            checked={props.allowPlans}
            onChange={(e) => props.setAllowPlans(e.target.checked)}
            className="mt-1 h-4 w-4 accent-waystar"
          />
          <div>
            <div className="text-[13px] font-medium text-ink">
              Allow monthly installment plans
            </div>
            <div className="mt-1 text-[12px] text-ink-muted">
              Payers can split the balance over equal monthly installments.
            </div>
          </div>
        </label>
        {props.allowPlans && (
          <div className="mt-3 rounded-md border border-rule bg-white p-3">
            <div className="mb-2 text-[11px] font-mono uppercase tracking-[0.14em] text-ink-muted">
              Allowed installment counts
            </div>
            <div className="flex flex-wrap gap-2">
              {INSTALLMENT_CHOICES.map((n) => {
                const active = props.planInstallmentOptions.includes(n);
                return (
                  <label
                    key={n}
                    className={[
                      "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-[12px]",
                      active
                        ? "border-waystar bg-waystar-wash text-waystar-deep"
                        : "border-rule bg-white text-ink hover:border-waystar/40",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleInstallment(n)}
                      className="h-3.5 w-3.5 accent-waystar"
                    />
                    {n}-month
                  </label>
                );
              })}
            </div>
            {props.planInstallmentOptions.length === 0 && (
              <p className="mt-2 text-[11.5px] text-destructive">
                Select at least one installment count or turn off plans above.
              </p>
            )}
            <p className="mt-2 text-[11px] text-ink-muted">
              Installment counts are only offered when the total divides
              evenly (no fractional cents).
            </p>
          </div>
        )}
      </Section>
    </>
  );
}

function FieldsTab(props: {
  fields: EditorField[];
  busy: boolean;
  error: string | null;
  onAdd: () => void;
  onUpdate: (id: number, patch: Partial<EditorField>) => void;
  onDelete: (id: number) => void;
  onReorder: (id: number, direction: "up" | "down") => void;
}) {
  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[13px] text-ink-muted">
          {props.fields.length} of 10 custom fields
        </div>
        <button
          type="button"
          onClick={props.onAdd}
          disabled={props.busy || props.fields.length >= 10}
          className="inline-flex items-center gap-1 rounded-md border border-rule bg-white px-2.5 py-1.5 text-[12px] hover:border-waystar disabled:opacity-50"
        >
          + Add field
        </button>
      </div>
      {props.error && (
        <div
          role="alert"
          className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive"
        >
          {props.error}
        </div>
      )}
      <ul className="divide-y divide-rule rounded-md border border-rule bg-white">
        {props.fields.length === 0 && (
          <li className="px-3 py-6 text-center text-[12.5px] text-ink-muted">
            No custom fields yet. Add up to 10.
          </li>
        )}
        {props.fields.map((f, i) => (
          <FieldRow
            key={f.id}
            field={f}
            index={i}
            last={i === props.fields.length - 1}
            onUpdate={(patch) => props.onUpdate(f.id, patch)}
            onDelete={() => props.onDelete(f.id)}
            onReorder={(dir) => props.onReorder(f.id, dir)}
          />
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-ink-muted">
        Supported types: text · number · dropdown · date · checkbox.
      </p>
    </>
  );
}

function FieldRow({
  field,
  index,
  last,
  onUpdate,
  onDelete,
  onReorder,
}: {
  field: EditorField;
  index: number;
  last: boolean;
  onUpdate: (patch: Partial<EditorField>) => void;
  onDelete: () => void;
  onReorder: (dir: "up" | "down") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [optionDraft, setOptionDraft] = useState("");
  const options = field.options ?? [];
  return (
    <li className="px-3 py-3 text-[13px]">
      <div className="flex items-center gap-3">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-canvas font-mono text-[11px] text-ink-muted">
          {index + 1}
        </span>
        <input
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          aria-label="Field label"
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-[13px] text-ink hover:border-rule focus:border-waystar focus:bg-white focus:outline-none"
        />
        <select
          value={field.type}
          onChange={(e) =>
            onUpdate({
              type: e.target.value as FieldType,
              options:
                e.target.value === "dropdown" ? (field.options ?? []) : null,
            })
          }
          aria-label="Field type"
          className="h-7 rounded-md border border-rule bg-white px-2 text-[12px]"
        >
          <option value="text">text</option>
          <option value="number">number</option>
          <option value="dropdown">dropdown</option>
          <option value="date">date</option>
          <option value="checkbox">checkbox</option>
        </select>
        <label className="inline-flex items-center gap-1 text-[11.5px] text-ink-muted">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="h-3.5 w-3.5 accent-waystar"
          />
          required
        </label>
        <button
          type="button"
          aria-label="Move up"
          disabled={index === 0}
          onClick={() => onReorder("up")}
          className="grid h-6 w-6 place-items-center rounded text-ink-muted hover:bg-canvas hover:text-ink disabled:opacity-30"
        >
          ↑
        </button>
        <button
          type="button"
          aria-label="Move down"
          disabled={last}
          onClick={() => onReorder("down")}
          className="grid h-6 w-6 place-items-center rounded text-ink-muted hover:bg-canvas hover:text-ink disabled:opacity-30"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[11.5px] text-ink-muted hover:text-ink"
          aria-expanded={expanded}
        >
          {expanded ? "close" : "more"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete field"
          className="text-[11.5px] text-ink-muted hover:text-destructive"
        >
          ✕
        </button>
      </div>
      {expanded && (
        <div className="mt-3 grid gap-3 rounded-md bg-canvas p-3">
          <div>
            <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-ink-muted">
              Placeholder
            </label>
            <TextInput
              value={field.placeholder ?? ""}
              onChange={(v) => onUpdate({ placeholder: v || null })}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-ink-muted">
              Helper text
            </label>
            <TextInput
              value={field.helperText ?? ""}
              onChange={(v) => onUpdate({ helperText: v || null })}
            />
          </div>
          {field.type === "dropdown" && (
            <div>
              <label className="mb-1 block text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                Options
              </label>
              <div className="flex flex-wrap gap-1.5">
                {options.map((opt, i) => (
                  <span
                    key={`${opt}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-white px-2.5 py-0.5 text-[12px]"
                  >
                    {opt}
                    <button
                      type="button"
                      aria-label={`Remove option ${opt}`}
                      onClick={() =>
                        onUpdate({
                          options: options.filter((_, j) => j !== i),
                        })
                      }
                      className="text-ink-muted hover:text-destructive"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = optionDraft.trim();
                    if (!v) return;
                    onUpdate({ options: [...options, v] });
                    setOptionDraft("");
                  }}
                  className="inline-flex items-center gap-1"
                >
                  <input
                    value={optionDraft}
                    onChange={(e) => setOptionDraft(e.target.value)}
                    placeholder="Add option"
                    className="h-7 w-36 rounded-md border border-rule bg-white px-2 text-[12px] outline-none focus:border-waystar"
                  />
                  <button
                    type="submit"
                    className="h-7 rounded-md border border-rule bg-white px-2 text-[11.5px] hover:border-waystar"
                  >
                    add
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function GLTab(props: {
  glCodes: string[];
  setGlCodes: (v: string[]) => void;
  glDraft: string;
  setGlDraft: (v: string) => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const addCode = () => {
    const code = props.glDraft.trim().toUpperCase();
    if (!code) return;
    if (!GL_CODE_RE.test(code)) {
      setErr("Expected format: NNNN-XXX (e.g. 4201-PAT).");
      return;
    }
    if (props.glCodes.includes(code)) {
      setErr("That code is already added.");
      return;
    }
    setErr(null);
    props.setGlCodes([...props.glCodes, code]);
    props.setGlDraft("");
  };
  return (
    <>
      <Section label="GL codes">
        <div className="rounded-md border border-rule bg-white p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {props.glCodes.length === 0 && (
              <span className="text-[12px] text-ink-muted">
                No GL codes yet.
              </span>
            )}
            {props.glCodes.map((code, i) => (
              <span
                key={code}
                className={[
                  "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 font-mono text-[11.5px]",
                  i === 0
                    ? "border-waystar/30 bg-waystar-wash text-waystar-deep"
                    : "border-rule bg-canvas text-ink",
                ].join(" ")}
              >
                {code}
                {i === 0 && (
                  <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] font-sans uppercase tracking-wider text-waystar-deep">
                    primary
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Remove GL code ${code}`}
                  onClick={() =>
                    props.setGlCodes(props.glCodes.filter((_, j) => j !== i))
                  }
                  className="ml-0.5 text-ink-muted hover:text-destructive"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addCode();
            }}
            className="mt-3 flex items-center gap-2"
          >
            <input
              value={props.glDraft}
              onChange={(e) =>
                props.setGlDraft(e.target.value.toUpperCase())
              }
              placeholder="4201-PAT"
              aria-label="New GL code"
              className="h-8 w-40 rounded-md border border-rule bg-white px-2 font-mono text-[12px] outline-none focus:border-waystar"
            />
            <button
              type="submit"
              className="h-8 rounded-md border border-rule bg-white px-3 text-[12px] hover:border-waystar"
            >
              Add
            </button>
          </form>
          {err && (
            <p
              role="alert"
              className="mt-2 text-[11.5px] text-destructive"
            >
              {err}
            </p>
          )}
        </div>
      </Section>
      <div className="rounded-md border border-rule bg-waystar-wash/40 p-3 text-[12px] text-ink-muted">
        Format: <code className="font-mono text-ink">NNNN-XXX</code> — 4 digits,
        dash, 3 uppercase letters.
      </div>
    </>
  );
}

function EmailTab(props: {
  emailTemplate: string;
  setEmailTemplate: (v: string) => void;
  fields: EditorField[];
}) {
  return (
    <>
      <Section label="Confirmation email" htmlFor="ed-email">
        <textarea
          id="ed-email"
          rows={10}
          value={props.emailTemplate}
          onChange={(e) => props.setEmailTemplate(e.target.value)}
          placeholder={`Hi {{payer_name}},\n\nThank you — we received your payment of {{amount}} on {{date}}.\n\nTransaction ID: {{transaction_id}}\n\n— {{org_name}}`}
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
            ...props.fields.map((f) => `{{field.${f.id}}}`),
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
          Leave this empty to use the platform default template.
        </p>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Share row + copy button
// ---------------------------------------------------------------------------

function ShareRow({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-rule bg-canvas text-ink-muted">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-ink">{title}</div>
        <div className="truncate text-[12px] text-ink-muted">{subtitle}</div>
      </div>
      {action}
    </div>
  );
}

function QrDownloadButtons({ pageId }: { pageId: string }) {
  const [busy, setBusy] = useState<"png" | "svg" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async (format: "png" | "svg") => {
    setBusy(format);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/pages/${pageId}/qr?format=${format}&size=512`,
      );
      if (!res.ok) {
        setError("QR download failed.");
        setBusy(null);
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      const cd = res.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `qr.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => download("png")}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-white px-2.5 py-1.5 text-[12px] hover:border-waystar disabled:opacity-60"
        >
          {busy === "png" ? "…" : "PNG"}
        </button>
        <button
          type="button"
          onClick={() => download("svg")}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-white px-2.5 py-1.5 text-[12px] hover:border-waystar disabled:opacity-60"
        >
          {busy === "svg" ? "…" : "SVG"}
        </button>
      </div>
      {error && (
        <span className="text-[10.5px] text-destructive" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* noop */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-white px-2.5 py-1.5 text-[12px] hover:border-waystar"
    >
      <CopyIcon /> {copied ? "Copied" : label}
    </button>
  );
}
