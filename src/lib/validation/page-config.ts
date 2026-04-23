/**
 * Hand-rolled validation for payment page config.
 * Used on both client (pre-submit) and server (pre-insert/update).
 * Pure: no DB access, no network.
 */

export type AmountMode = "fixed" | "range" | "open";

export type FieldType = "text" | "number" | "dropdown" | "date" | "checkbox";

export const SLUG_RE = /^[a-z0-9-]{3,60}$/;
export const GL_CODE_RE = /^[0-9]{4}-[A-Z]{3}$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export interface PageCreateInput {
  title: string;
  slug: string;
  subtitle?: string | null;
}

export interface PageUpdateInput {
  title?: string;
  subtitle?: string | null;
  headerMessage?: string | null;
  footerMessage?: string | null;
  brandColor?: string;
  logoUrl?: string | null;
  amountMode?: AmountMode;
  fixedAmountCents?: number | null;
  minAmountCents?: number | null;
  maxAmountCents?: number | null;
  glCodes?: string[];
  emailTemplateBody?: string | null;
  allowPlans?: boolean;
  planInstallmentOptions?: number[];
  isActive?: boolean;
}

export interface CustomFieldInput {
  label: string;
  type: FieldType;
  options?: string[] | null;
  required?: boolean;
  placeholder?: string | null;
  helperText?: string | null;
}

export type ValidationError = { field: string; message: string };

function err(field: string, message: string): ValidationError {
  return { field, message };
}

export function validateCreate(input: PageCreateInput): ValidationError[] {
  const errs: ValidationError[] = [];
  if (!input.title || input.title.trim().length === 0) {
    errs.push(err("title", "Title is required."));
  } else if (input.title.length > 200) {
    errs.push(err("title", "Title must be 200 characters or fewer."));
  }
  if (!input.slug) {
    errs.push(err("slug", "Slug is required."));
  } else if (!SLUG_RE.test(input.slug)) {
    errs.push(
      err(
        "slug",
        "Slug must be 3–60 lowercase letters, digits, or hyphens.",
      ),
    );
  }
  if (input.subtitle && input.subtitle.length > 1000) {
    errs.push(err("subtitle", "Subtitle must be 1000 characters or fewer."));
  }
  return errs;
}

/**
 * Validates a partial update. Amount-mode invariants are checked holistically:
 * when `amountMode` is present, the caller must also send amount fields
 * consistent with that mode (or explicit nulls for unused fields).
 */
export function validateUpdate(input: PageUpdateInput): ValidationError[] {
  const errs: ValidationError[] = [];

  if (input.title !== undefined) {
    if (!input.title || input.title.trim().length === 0) {
      errs.push(err("title", "Title is required."));
    } else if (input.title.length > 200) {
      errs.push(err("title", "Title must be 200 characters or fewer."));
    }
  }

  if (input.brandColor !== undefined && !HEX_RE.test(input.brandColor)) {
    errs.push(err("brandColor", "Brand color must be a #RRGGBB hex value."));
  }

  if (input.amountMode !== undefined) {
    const mode = input.amountMode;
    if (mode === "fixed") {
      if (
        input.fixedAmountCents === undefined ||
        input.fixedAmountCents === null ||
        input.fixedAmountCents <= 0
      ) {
        errs.push(
          err(
            "fixedAmountCents",
            "Fixed amount must be greater than zero.",
          ),
        );
      }
    } else if (mode === "range") {
      const min = input.minAmountCents;
      const max = input.maxAmountCents;
      if (min === undefined || min === null || min <= 0) {
        errs.push(err("minAmountCents", "Minimum must be greater than zero."));
      }
      if (max === undefined || max === null || max <= 0) {
        errs.push(err("maxAmountCents", "Maximum must be greater than zero."));
      }
      if (
        typeof min === "number" &&
        typeof max === "number" &&
        min > 0 &&
        max > 0 &&
        max < min
      ) {
        errs.push(
          err("maxAmountCents", "Maximum must be greater than or equal to minimum."),
        );
      }
    }
    // "open" mode: all amount fields should be null; no error if caller sends nulls.
  }

  if (input.glCodes !== undefined) {
    for (const code of input.glCodes) {
      if (!GL_CODE_RE.test(code)) {
        errs.push(
          err(
            "glCodes",
            `GL code "${code}" must match format NNNN-XXX (4 digits, dash, 3 uppercase letters).`,
          ),
        );
        break;
      }
    }
  }

  if (input.planInstallmentOptions !== undefined) {
    for (const n of input.planInstallmentOptions) {
      if (!Number.isInteger(n) || n < 2 || n > 24) {
        errs.push(
          err(
            "planInstallmentOptions",
            "Plan options must be integers between 2 and 24.",
          ),
        );
        break;
      }
    }
  }

  return errs;
}

/**
 * Normalizes an amount-mode change by nulling the fields that don't belong.
 * Call before sending a PATCH so the invariant holds across the transition.
 */
export function normalizeAmountFields(
  input: PageUpdateInput,
): PageUpdateInput {
  if (input.amountMode === undefined) return input;
  const out = { ...input };
  if (out.amountMode === "fixed") {
    out.minAmountCents = null;
    out.maxAmountCents = null;
  } else if (out.amountMode === "range") {
    out.fixedAmountCents = null;
  } else if (out.amountMode === "open") {
    out.fixedAmountCents = null;
    out.minAmountCents = null;
    out.maxAmountCents = null;
  }
  return out;
}

export function validateCustomField(input: CustomFieldInput): ValidationError[] {
  const errs: ValidationError[] = [];
  if (!input.label || input.label.trim().length === 0) {
    errs.push(err("label", "Field label is required."));
  } else if (input.label.length > 120) {
    errs.push(err("label", "Field label must be 120 characters or fewer."));
  }
  const validTypes: FieldType[] = ["text", "number", "dropdown", "date", "checkbox"];
  if (!validTypes.includes(input.type)) {
    errs.push(err("type", "Field type is invalid."));
  }
  if (input.type === "dropdown") {
    if (!input.options || input.options.length === 0) {
      errs.push(err("options", "Dropdown fields need at least one option."));
    }
  }
  return errs;
}
