/**
 * Demo config consumed by /pay/[slug] until the real DB is wired up.
 * Replace with a DB fetch once Drizzle schema + seed are in.
 */

export type AmountMode = "fixed" | "range" | "open";
export type FieldType = "text" | "number" | "dropdown" | "date" | "checkbox";

export type CustomField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  helper?: string;
  options?: string[];
  placeholder?: string;
};

export type PaymentPageConfig = {
  slug: string;
  orgName: string;
  orgTagline?: string;
  brandColor: string; // hex; the page may theme accents from this
  title: string;
  subtitle: string;
  amountMode: AmountMode;
  /** amounts in **cents** */
  fixedAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  glCode: string;
  allowPlans: boolean;
  planInstallments?: number[];
  fields: CustomField[];
  headerMessage?: string;
  footerMessage?: string;
};

export const DEMO_PAGES: Record<string, PaymentPageConfig> = {
  "memorial-health-mar-12": {
    slug: "memorial-health-mar-12",
    orgName: "Memorial Health",
    orgTagline: "Patient billing — account settlement",
    brandColor: "#F15A22",
    title: "Settle your visit balance",
    subtitle:
      "Your visit on March 12, 2026 has been processed by your insurance. The remaining balance is due below.",
    amountMode: "fixed",
    fixedAmount: 84700,
    glCode: "4201-PAT",
    allowPlans: true,
    planInstallments: [3, 6],
    headerMessage:
      "Questions about this balance? Reply to your text or call (555) 121-0199.",
    footerMessage:
      "Memorial Health partners with Waystar to process patient payments securely.",
    fields: [
      {
        id: "account",
        label: "Account number",
        type: "text",
        required: true,
        helper: "Found on the top right of your statement.",
        placeholder: "e.g. MH-48219",
      },
      {
        id: "dob",
        label: "Patient date of birth",
        type: "date",
        required: true,
      },
      {
        id: "notes",
        label: "Notes for billing (optional)",
        type: "text",
        required: false,
        placeholder: "Anything we should know…",
      },
    ],
  },
  "summit-pediatrics-wellvisit": {
    slug: "summit-pediatrics-wellvisit",
    orgName: "Summit Pediatrics",
    orgTagline: "Well-child visit copay",
    brandColor: "#F15A22",
    title: "Well-child visit copay",
    subtitle:
      "Enter an amount between the minimum and maximum defined by your plan.",
    amountMode: "range",
    minAmount: 2500,
    maxAmount: 15000,
    glCode: "4120-COP",
    allowPlans: false,
    fields: [
      {
        id: "child",
        label: "Child's full name",
        type: "text",
        required: true,
      },
      {
        id: "visit_date",
        label: "Visit date",
        type: "date",
        required: true,
      },
    ],
  },
};

export function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
