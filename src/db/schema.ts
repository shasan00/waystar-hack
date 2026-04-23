/**
 * Drizzle schema — Waystar QPP
 *
 * Conventions:
 * - Money stored as integers in **cents** (USD)
 * - Timestamps are `timestamp with time zone` (UTC)
 * - UUIDs for public-exposed IDs (payment pages, bills, transactions)
 * - Serials for internal join tables (custom fields, field responses)
 * - `gl_codes` stored as text[] to match PRD "one or more" requirement
 * - Better Auth tables (user, session, account, verification) live at the top
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  serial,
  jsonb,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ---------------------------------------------------------------
   Better Auth tables
   Column names match Better Auth's default Drizzle adapter.
---------------------------------------------------------------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // QPP-specific: who is this human?
  role: text("role", { enum: ["admin", "patient"] }).notNull().default("patient"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------------------------------------------------------
   Enums
---------------------------------------------------------------- */

export const amountModeEnum = pgEnum("amount_mode", ["fixed", "range", "open"]);
export const fieldTypeEnum = pgEnum("field_type", [
  "text",
  "number",
  "dropdown",
  "date",
  "checkbox",
]);
export const billStatusEnum = pgEnum("bill_status", [
  "outstanding",
  "paid",
  "cancelled",
]);
export const planStatusEnum = pgEnum("plan_status", [
  "active",
  "complete",
  "cancelled",
]);
export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "succeeded",
  "failed",
  "refunded",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "card",
  "wallet",
  "ach",
]);
export const messageDirectionEnum = pgEnum("message_direction", ["in", "out"]);
export const messageChannelEnum = pgEnum("message_channel", [
  "whatsapp",
  "sms",
]);

/* ---------------------------------------------------------------
   Organizations & profiles
---------------------------------------------------------------- */

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  brandColor: text("brand_color").notNull().default("#F15A22"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminProfiles = pgTable(
  "admin_profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    title: text("title"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("admin_profiles_org_idx").on(t.orgId)],
);

export const patientProfiles = pgTable("patient_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  dateOfBirth: date("date_of_birth"),
  mrn: text("mrn"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------------------------------------------------------
   Payment pages & custom fields
---------------------------------------------------------------- */

export const paymentPages = pgTable(
  "payment_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    headerMessage: text("header_message"),
    footerMessage: text("footer_message"),
    brandColor: text("brand_color").notNull().default("#F15A22"),
    logoUrl: text("logo_url"),
    amountMode: amountModeEnum("amount_mode").notNull().default("fixed"),
    fixedAmountCents: integer("fixed_amount_cents"),
    minAmountCents: integer("min_amount_cents"),
    maxAmountCents: integer("max_amount_cents"),
    glCodes: text("gl_codes").array().notNull().default([]),
    emailTemplateBody: text("email_template_body"),
    allowPlans: boolean("allow_plans").notNull().default(false),
    planInstallmentOptions: integer("plan_installment_options")
      .array()
      .notNull()
      .default([]),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("payment_pages_slug_idx").on(t.slug),
    index("payment_pages_org_idx").on(t.orgId),
  ],
);

export const customFields = pgTable(
  "custom_fields",
  {
    id: serial("id").primaryKey(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => paymentPages.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    type: fieldTypeEnum("type").notNull(),
    options: jsonb("options").$type<string[] | null>(),
    required: boolean("required").notNull().default(false),
    placeholder: text("placeholder"),
    helperText: text("helper_text"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("custom_fields_page_idx").on(t.pageId)],
);

/* ---------------------------------------------------------------
   Bills, plans, transactions
---------------------------------------------------------------- */

export const bills = pgTable(
  "bills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: text("patient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    pageId: uuid("page_id")
      .notNull()
      .references(() => paymentPages.id, { onDelete: "restrict" }),
    amountCents: integer("amount_cents").notNull(),
    description: text("description"),
    status: billStatusEnum("status").notNull().default("outstanding"),
    dueDate: date("due_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("bills_patient_idx").on(t.patientId),
    index("bills_page_idx").on(t.pageId),
    index("bills_status_idx").on(t.status),
  ],
);

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    billId: uuid("bill_id")
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    totalAmountCents: integer("total_amount_cents").notNull(),
    installmentCount: integer("installment_count").notNull(),
    installmentAmountCents: integer("installment_amount_cents").notNull(),
    status: planStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("plans_bill_idx").on(t.billId)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => paymentPages.id, { onDelete: "restrict" }),
    billId: uuid("bill_id").references(() => bills.id, { onDelete: "set null" }),
    patientId: text("patient_id").references(() => user.id, {
      onDelete: "set null",
    }),
    planId: uuid("plan_id").references(() => plans.id, { onDelete: "set null" }),
    installmentNumber: integer("installment_number"),
    amountCents: integer("amount_cents").notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("card"),
    status: transactionStatusEnum("status").notNull().default("pending"),
    payerEmail: text("payer_email"),
    payerName: text("payer_name"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeCustomerId: text("stripe_customer_id"),
    // Denormalized for historical accuracy — even if the page's GL codes change later.
    glCodeAtPayment: text("gl_code_at_payment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("transactions_stripe_pi_idx").on(t.stripePaymentIntentId),
    index("transactions_page_idx").on(t.pageId),
    index("transactions_patient_idx").on(t.patientId),
    index("transactions_bill_idx").on(t.billId),
    index("transactions_status_idx").on(t.status),
    index("transactions_created_idx").on(t.createdAt),
  ],
);

export const fieldResponses = pgTable(
  "field_responses",
  {
    id: serial("id").primaryKey(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    fieldId: integer("field_id")
      .notNull()
      .references(() => customFields.id, { onDelete: "restrict" }),
    value: text("value"),
  },
  (t) => [index("field_responses_txn_idx").on(t.transactionId)],
);

/* ---------------------------------------------------------------
   Messages — drives the SMS differentiator + /dev/inbox viewer
---------------------------------------------------------------- */

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: text("patient_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    pageId: uuid("page_id").references(() => paymentPages.id, {
      onDelete: "set null",
    }),
    direction: messageDirectionEnum("direction").notNull(),
    channel: messageChannelEnum("channel").notNull().default("whatsapp"),
    body: text("body").notNull(),
    twilioSid: text("twilio_sid"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("messages_patient_idx").on(t.patientId),
    index("messages_created_idx").on(t.createdAt),
  ],
);

/* ---------------------------------------------------------------
   Relations (Drizzle query API)
---------------------------------------------------------------- */

export const organizationsRelations = relations(organizations, ({ many }) => ({
  paymentPages: many(paymentPages),
  admins: many(adminProfiles),
}));

export const userRelations = relations(user, ({ one, many }) => ({
  adminProfile: one(adminProfiles, {
    fields: [user.id],
    references: [adminProfiles.userId],
  }),
  patientProfile: one(patientProfiles, {
    fields: [user.id],
    references: [patientProfiles.userId],
  }),
  sessions: many(session),
  accounts: many(account),
  bills: many(bills),
  transactions: many(transactions),
  messages: many(messages),
}));

export const paymentPagesRelations = relations(paymentPages, ({ one, many }) => ({
  org: one(organizations, {
    fields: [paymentPages.orgId],
    references: [organizations.id],
  }),
  fields: many(customFields),
  transactions: many(transactions),
  bills: many(bills),
}));

export const customFieldsRelations = relations(customFields, ({ one, many }) => ({
  page: one(paymentPages, {
    fields: [customFields.pageId],
    references: [paymentPages.id],
  }),
  responses: many(fieldResponses),
}));

export const billsRelations = relations(bills, ({ one, many }) => ({
  patient: one(user, {
    fields: [bills.patientId],
    references: [user.id],
  }),
  page: one(paymentPages, {
    fields: [bills.pageId],
    references: [paymentPages.id],
  }),
  plans: many(plans),
  transactions: many(transactions),
}));

export const plansRelations = relations(plans, ({ one, many }) => ({
  bill: one(bills, {
    fields: [plans.billId],
    references: [bills.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  page: one(paymentPages, {
    fields: [transactions.pageId],
    references: [paymentPages.id],
  }),
  bill: one(bills, {
    fields: [transactions.billId],
    references: [bills.id],
  }),
  patient: one(user, {
    fields: [transactions.patientId],
    references: [user.id],
  }),
  plan: one(plans, {
    fields: [transactions.planId],
    references: [plans.id],
  }),
  fieldResponses: many(fieldResponses),
}));

export const fieldResponsesRelations = relations(fieldResponses, ({ one }) => ({
  transaction: one(transactions, {
    fields: [fieldResponses.transactionId],
    references: [transactions.id],
  }),
  field: one(customFields, {
    fields: [fieldResponses.fieldId],
    references: [customFields.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  patient: one(user, {
    fields: [messages.patientId],
    references: [user.id],
  }),
  page: one(paymentPages, {
    fields: [messages.pageId],
    references: [paymentPages.id],
  }),
}));

/* ---------------------------------------------------------------
   Inferred types — import these in app code
---------------------------------------------------------------- */

export type User = typeof user.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type PaymentPage = typeof paymentPages.$inferSelect;
export type PaymentPageInsert = typeof paymentPages.$inferInsert;
export type CustomField = typeof customFields.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Message = typeof messages.$inferSelect;
