/**
 * Seed script — Waystar QPP
 *
 * Populates the database with:
 * - 1 organization (Memorial Health)
 * - 2 admin users + admin profiles
 * - 2 patient users + patient profiles + Better Auth credential accounts
 * - 2 payment pages (Memorial Health fixed $847 + Summit Pediatrics range)
 * - Custom fields for each page
 * - 2 outstanding bills for the demo patient
 * - 1 completed transaction + field responses (so /admin/reports has data)
 * - A scripted WhatsApp thread (inbound + outbound) for /dev/inbox
 *
 * Run: pnpm tsx src/db/seed.ts
 *
 * IDEMPOTENT — wipes the relevant tables first so you can re-run freely.
 */

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db, pool } from "./client";
import {
  organizations,
  adminProfiles,
  patientProfiles,
  paymentPages,
  customFields,
  bills,
  transactions,
  fieldResponses,
  messages,
  user,
  session,
  account,
  verification,
} from "./schema";

const DEMO_PASSWORD = "demopassword";

async function wipe() {
  console.log("→ wiping existing rows…");
  // Order matters due to FKs. Messages/transactions/bills first, then pages/fields, then users/org.
  await db.delete(fieldResponses);
  await db.delete(messages);
  await db.delete(transactions);
  await db.delete(bills);
  await db.delete(customFields);
  await db.delete(paymentPages);
  await db.delete(adminProfiles);
  await db.delete(patientProfiles);
  await db.delete(session);
  await db.delete(account);
  await db.delete(verification);
  await db.delete(user);
  await db.delete(organizations);
}

async function createUser(opts: {
  email: string;
  name: string;
  password: string;
  role: "admin" | "patient";
}): Promise<string> {
  // Bypass Better Auth's HTTP API — it hangs at seed time. Insert user +
  // credential account row directly, using Better Auth's own password hasher
  // so the produced hash is compatible with auth.api.signInEmail at runtime.
  const userId = randomUUID();
  const accountId = randomUUID();
  const now = new Date();
  const hash = await hashPassword(opts.password);

  await db.insert(user).values({
    id: userId,
    name: opts.name,
    email: opts.email,
    emailVerified: true,
    role: opts.role,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(account).values({
    id: accountId,
    userId,
    accountId: userId, // Better Auth uses userId as accountId for credentials
    providerId: "credential",
    password: hash,
    createdAt: now,
    updatedAt: now,
  });
  return userId;
}

async function main() {
  await wipe();

  // --- organization -------------------------------------------------
  const [org] = await db
    .insert(organizations)
    .values({
      name: "Memorial Health",
      brandColor: "#F15A22",
      logoUrl: null,
    })
    .returning();
  console.log("✓ org", org.id);

  // --- admin users --------------------------------------------------
  const adminId = await createUser({
    email: "billing@memorialhealth.demo",
    name: "Sarah Okafor",
    password: DEMO_PASSWORD,
    role: "admin",
  });
  await db.insert(adminProfiles).values({
    userId: adminId,
    orgId: org.id,
    fullName: "Sarah Okafor",
    title: "Billing Manager",
  });

  const admin2Id = await createUser({
    email: "ops@memorialhealth.demo",
    name: "Ben Chen",
    password: DEMO_PASSWORD,
    role: "admin",
  });
  await db.insert(adminProfiles).values({
    userId: admin2Id,
    orgId: org.id,
    fullName: "Ben Chen",
    title: "Revenue Cycle Analyst",
  });
  console.log("✓ admins");

  // --- patient users ------------------------------------------------
  const patient1Id = await createUser({
    email: "patient@demo.com",
    name: "Jordan Rivera",
    password: DEMO_PASSWORD,
    role: "patient",
  });
  await db.insert(patientProfiles).values({
    userId: patient1Id,
    fullName: "Jordan Rivera",
    phone: "+15554420199",
    dateOfBirth: "1988-07-14",
    mrn: "MH-48219",
  });

  const patient2Id = await createUser({
    email: "alex.kim@demo.com",
    name: "Alex Kim",
    password: DEMO_PASSWORD,
    role: "patient",
  });
  await db.insert(patientProfiles).values({
    userId: patient2Id,
    fullName: "Alex Kim",
    phone: "+15554420202",
    dateOfBirth: "1995-02-03",
    mrn: "MH-51140",
  });
  console.log("✓ patients");

  // --- payment pages ------------------------------------------------
  const [memorialPage] = await db
    .insert(paymentPages)
    .values({
      orgId: org.id,
      slug: "memorial-health-mar-12",
      title: "Settle your visit balance",
      subtitle:
        "Your visit on March 12, 2026 has been processed by your insurance. The remaining balance is due below.",
      headerMessage:
        "Questions about this balance? Reply to your text or call (555) 121-0199.",
      footerMessage:
        "Memorial Health partners with Waystar to process patient payments securely.",
      brandColor: "#F15A22",
      amountMode: "fixed",
      fixedAmountCents: 84700,
      glCodes: ["4201-PAT"],
      allowPlans: true,
      planInstallmentOptions: [3, 6],
      emailTemplateBody: `Hi {{payer_name}},\n\nThank you — we received your payment of {{amount}} on {{date}}.\n\nTransaction ID: {{transaction_id}}\n\n— The billing team at {{org_name}}`,
      isActive: true,
    })
    .returning();

  const memorialFields = await db
    .insert(customFields)
    .values([
      {
        pageId: memorialPage.id,
        label: "Account number",
        type: "text",
        required: true,
        placeholder: "e.g. MH-48219",
        helperText: "Found on the top right of your statement.",
        displayOrder: 0,
      },
      {
        pageId: memorialPage.id,
        label: "Patient date of birth",
        type: "date",
        required: true,
        displayOrder: 1,
      },
      {
        pageId: memorialPage.id,
        label: "Notes for billing (optional)",
        type: "text",
        required: false,
        placeholder: "Anything we should know…",
        displayOrder: 2,
      },
    ])
    .returning();

  const [summitPage] = await db
    .insert(paymentPages)
    .values({
      orgId: org.id,
      slug: "summit-pediatrics-wellvisit",
      title: "Well-child visit copay",
      subtitle:
        "Enter an amount between the minimum and maximum defined by your plan.",
      brandColor: "#F15A22",
      amountMode: "range",
      minAmountCents: 2500,
      maxAmountCents: 15000,
      glCodes: ["4120-COP"],
      allowPlans: false,
      isActive: true,
    })
    .returning();

  await db.insert(customFields).values([
    {
      pageId: summitPage.id,
      label: "Child's full name",
      type: "text",
      required: true,
      displayOrder: 0,
    },
    {
      pageId: summitPage.id,
      label: "Visit date",
      type: "date",
      required: true,
      displayOrder: 1,
    },
  ]);
  console.log("✓ payment pages");

  // --- bills --------------------------------------------------------
  await db.insert(bills).values([
    {
      patientId: patient1Id,
      pageId: memorialPage.id,
      amountCents: 84700,
      description: "Visit on March 12, 2026",
      status: "outstanding",
      dueDate: "2026-04-30",
    },
    {
      patientId: patient1Id,
      pageId: summitPage.id,
      amountCents: 4500,
      description: "Well-child visit copay · April 4",
      status: "outstanding",
      dueDate: "2026-05-10",
    },
  ]);
  console.log("✓ bills");

  // --- one historical transaction so reports has data --------------
  const [tx] = await db
    .insert(transactions)
    .values({
      pageId: memorialPage.id,
      patientId: patient2Id,
      amountCents: 4500,
      paymentMethod: "card",
      status: "succeeded",
      payerEmail: "alex.kim@demo.com",
      payerName: "Alex Kim",
      stripePaymentIntentId: `pi_seed_${randomUUID().slice(0, 10)}`,
      glCodeAtPayment: "4201-PAT",
    })
    .returning();

  await db.insert(fieldResponses).values([
    {
      transactionId: tx.id,
      fieldId: memorialFields[0].id,
      value: "MH-51140",
    },
    {
      transactionId: tx.id,
      fieldId: memorialFields[1].id,
      value: "1995-02-03",
    },
  ]);
  console.log("✓ historical transaction");

  // --- simulated WhatsApp thread -----------------------------------
  const now = Date.now();
  const mins = (n: number) => new Date(now - n * 60_000);

  await db.insert(messages).values([
    {
      patientId: patient1Id,
      pageId: memorialPage.id,
      direction: "out",
      channel: "whatsapp",
      body: "Hi Jordan — you have a balance of $847.00 for your visit on 3/12. Reply PAY to settle in full, PLAN for options, or ASK a question.",
      createdAt: mins(8),
    },
    {
      patientId: patient1Id,
      pageId: memorialPage.id,
      direction: "in",
      channel: "whatsapp",
      body: "plan please",
      createdAt: mins(7),
    },
    {
      patientId: patient1Id,
      pageId: memorialPage.id,
      direction: "out",
      channel: "whatsapp",
      body: "Got it — I can split this into 3 payments of $282.33 or 6 payments of $141.17. Which works?",
      createdAt: mins(7),
    },
    {
      patientId: patient1Id,
      pageId: memorialPage.id,
      direction: "in",
      channel: "whatsapp",
      body: "3 month plan sounds good",
      createdAt: mins(6),
    },
    {
      patientId: patient1Id,
      pageId: memorialPage.id,
      direction: "out",
      channel: "whatsapp",
      body: "Perfect. First payment of $282.33 is due today. Here's your secure link: https://qpp.waystar.demo/pay/memorial-health-mar-12?plan=3&installment=1",
      createdAt: mins(6),
    },
  ]);
  console.log("✓ whatsapp thread");

  console.log("\n✓ seed complete");
  console.log("\n  Admin:   billing@memorialhealth.demo / demopassword");
  console.log("  Patient: patient@demo.com           / demopassword\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
