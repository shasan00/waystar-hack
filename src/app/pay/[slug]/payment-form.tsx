"use client";

import { useMemo, useState, useId } from "react";
import { useRouter } from "next/navigation";
import type { PaymentPageConfig, CustomField } from "@/lib/demo-data";
import { formatMoney } from "@/lib/demo-data";
import { toast } from "sonner";

export function PaymentForm({
  config,
  planChoice,
  installmentNumber,
}: {
  config: PaymentPageConfig;
  planChoice: number | null;
  installmentNumber: number;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [userAmount, setUserAmount] = useState<string>("");
  const [card, setCard] = useState({ number: "", exp: "", cvc: "", zip: "" });

  const amountCents = useMemo(() => {
    if (config.amountMode === "fixed" && config.fixedAmount) {
      return planChoice
        ? Math.round(config.fixedAmount / planChoice)
        : config.fixedAmount;
    }
    const parsed = Math.round(parseFloat(userAmount || "0") * 100);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [config, planChoice, userAmount]);

  const amountOk = useMemo(() => {
    if (config.amountMode === "fixed") return amountCents > 0;
    if (config.amountMode === "range")
      return (
        amountCents >= (config.minAmount ?? 0) &&
        amountCents <= (config.maxAmount ?? Infinity)
      );
    return amountCents > 0;
  }, [config, amountCents]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amountOk) {
      toast.error("Please enter a valid amount.");
      return;
    }
    setSubmitting(true);
    // Simulated payment — Person B will wire to Stripe Payment Intent.
    await new Promise((r) => setTimeout(r, 900));
    const params = new URLSearchParams({
      amount: String(amountCents),
      name,
      email,
      ...(planChoice ? { plan: String(planChoice) } : {}),
      ...(planChoice ? { installment: String(installmentNumber) } : {}),
    });
    router.push(`/pay/${config.slug}/success?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Amount input for non-fixed modes */}
      {config.amountMode !== "fixed" && (
        <Section title="Amount">
          <FloatingInput
            label="Amount (USD)"
            value={userAmount}
            onChange={setUserAmount}
            placeholder="0.00"
            inputMode="decimal"
            required
            helper={
              config.amountMode === "range"
                ? `Between ${formatMoney(config.minAmount!)} and ${formatMoney(
                    config.maxAmount!
                  )}`
                : "Any amount you choose."
            }
            leading="$"
          />
        </Section>
      )}

      <Section title="Your information">
        <div className="grid gap-3 md:grid-cols-2">
          <FloatingInput
            label="Full name"
            value={name}
            onChange={setName}
            autoComplete="name"
            required
          />
          <FloatingInput
            label="Email for receipt"
            value={email}
            onChange={setEmail}
            type="email"
            autoComplete="email"
            required
          />
        </div>
      </Section>

      {config.fields.length > 0 && (
        <Section title="Additional details">
          <div className="grid gap-3">
            {config.fields.map((f) => (
              <CustomFieldInput
                key={f.id}
                field={f}
                value={fieldValues[f.id] ?? ""}
                onChange={(v) =>
                  setFieldValues((s) => ({ ...s, [f.id]: v }))
                }
              />
            ))}
          </div>
        </Section>
      )}

      <Section title="Payment method" subtle>
        {/* Placeholder — Person B will swap for Stripe Payment Element */}
        <div className="grid gap-3">
          <FloatingInput
            label="Card number"
            value={card.number}
            onChange={(v) => setCard({ ...card, number: v })}
            placeholder="1234 1234 1234 1234"
            autoComplete="cc-number"
            inputMode="numeric"
            required
          />
          <div className="grid grid-cols-3 gap-3">
            <FloatingInput
              label="Expiry"
              value={card.exp}
              onChange={(v) => setCard({ ...card, exp: v })}
              placeholder="MM / YY"
              autoComplete="cc-exp"
              required
            />
            <FloatingInput
              label="CVC"
              value={card.cvc}
              onChange={(v) => setCard({ ...card, cvc: v })}
              placeholder="123"
              autoComplete="cc-csc"
              inputMode="numeric"
              required
            />
            <FloatingInput
              label="Zip"
              value={card.zip}
              onChange={(v) => setCard({ ...card, zip: v })}
              autoComplete="postal-code"
              inputMode="numeric"
              required
            />
          </div>
          <p className="text-[11px] text-ink-muted">
            Test with <span className="font-mono">4242 4242 4242 4242</span>,
            any future expiry, any CVC. No real card will be charged.
          </p>
        </div>
      </Section>

      <button
        type="submit"
        disabled={submitting || !amountOk}
        className="group relative mt-2 flex h-[52px] w-full items-center justify-center gap-2 rounded-md bg-waystar px-6 text-[15px] font-medium text-white transition-colors hover:bg-waystar-deep disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Spinner /> Processing…
          </>
        ) : (
          <>
            Pay <span className="tabular">{formatMoney(amountCents || 0)}</span>
            {planChoice && (
              <span className="ml-1 text-[12px] opacity-80">
                (1 of {planChoice})
              </span>
            )}
            <ArrowRight />
          </>
        )}
      </button>

      <p className="mt-4 flex items-center justify-center gap-2 text-center text-[11px] text-ink-muted">
        <LockIcon /> Encrypted. PCI-compliant. No card data touches our servers.
      </p>
    </form>
  );
}

/* --------------- primitives --------------- */

function Section({
  title,
  children,
  subtle,
}: {
  title: string;
  children: React.ReactNode;
  subtle?: boolean;
}) {
  return (
    <fieldset className="mb-7">
      <legend
        className={`mb-3 text-[11px] font-mono uppercase tracking-[0.18em] ${
          subtle ? "text-ink-muted" : "text-ink-muted"
        }`}
      >
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-5 bg-ink-muted/50" aria-hidden />
          {title}
        </span>
      </legend>
      {children}
    </fieldset>
  );
}

function FloatingInput({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  helper,
  autoComplete,
  inputMode,
  leading,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  helper?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  leading?: string;
}) {
  const id = useId();
  const helperId = `${id}-helper`;
  const filled = value.length > 0;

  return (
    <div>
      <label
        htmlFor={id}
        className="relative block rounded-md border border-rule bg-white focus-within:border-waystar focus-within:ring-2 focus-within:ring-waystar/20"
      >
        <span
          className={`pointer-events-none absolute left-3 text-ink-muted transition-all ${
            filled
              ? "top-1.5 text-[10px] font-mono uppercase tracking-[0.14em]"
              : "top-1/2 -translate-y-1/2 text-[14px]"
          }`}
        >
          {label}
          {required && <span className="ml-0.5 text-waystar">*</span>}
        </span>
        <div className="flex items-center">
          {leading && (
            <span
              className={`pl-3 tabular text-[15px] ${filled ? "pt-5 text-ink" : "pt-5 text-ink-muted"}`}
              aria-hidden
            >
              {leading}
            </span>
          )}
          <input
            id={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={filled ? placeholder : undefined}
            required={required}
            autoComplete={autoComplete}
            inputMode={inputMode}
            aria-describedby={helper ? helperId : undefined}
            className="peer w-full bg-transparent px-3 pb-2 pt-5 text-[15px] text-ink outline-none placeholder:text-ink-muted/60 tabular"
          />
        </div>
      </label>
      {helper && (
        <p id={helperId} className="mt-1 px-1 text-[11px] text-ink-muted">
          {helper}
        </p>
      )}
    </div>
  );
}

function CustomFieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <label className="flex items-start gap-3 rounded-md border border-rule bg-white px-3 py-3">
        <input
          type="checkbox"
          checked={value === "true"}
          onChange={(e) => onChange(e.target.checked ? "true" : "")}
          required={field.required}
          className="mt-0.5 h-4 w-4 accent-waystar"
        />
        <span className="text-[14px] text-ink">
          {field.label}
          {field.required && <span className="ml-1 text-waystar">*</span>}
          {field.helper && (
            <span className="mt-0.5 block text-[12px] text-ink-muted">
              {field.helper}
            </span>
          )}
        </span>
      </label>
    );
  }

  if (field.type === "dropdown") {
    return (
      <FloatingSelect
        label={field.label}
        required={field.required}
        value={value}
        onChange={onChange}
        options={field.options ?? []}
        helper={field.helper}
      />
    );
  }

  return (
    <FloatingInput
      label={field.label}
      value={value}
      onChange={onChange}
      type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
      placeholder={field.placeholder}
      required={field.required}
      helper={field.helper}
      inputMode={field.type === "number" ? "numeric" : undefined}
    />
  );
}

function FloatingSelect({
  label,
  value,
  onChange,
  options,
  required,
  helper,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
  helper?: string;
}) {
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        className="relative block rounded-md border border-rule bg-white focus-within:border-waystar"
      >
        <span className="absolute left-3 top-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-ink-muted">
          {label}
          {required && <span className="ml-0.5 text-waystar">*</span>}
        </span>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full appearance-none bg-transparent px-3 pb-2 pt-5 text-[15px] text-ink outline-none"
        >
          <option value="" disabled>
            Select…
          </option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            d="M6 9l6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </label>
      {helper && (
        <p className="mt-1 px-1 text-[11px] text-ink-muted">{helper}</p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
        fill="none"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg
      className="transition-transform group-hover:translate-x-0.5"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        d="M5 12h14M13 5l7 7-7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 11V7a4 4 0 0 1 8 0v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
