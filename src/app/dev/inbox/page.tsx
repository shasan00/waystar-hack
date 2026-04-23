import { PageHeader, PageBody, AppShell } from "@/components/app-shell";
import { GridIcon, InboxIcon } from "@/components/icons";

const CONVO = [
  { from: "Memorial Health", direction: "out" as const, body: "Hi Jordan — you have a balance of $847.00 for your visit on 3/12. Reply PAY to settle in full, PLAN for options, or ASK a question.", at: "2:04 PM" },
  { from: "Jordan", direction: "in" as const, body: "plan please", at: "2:05 PM" },
  { from: "QPP Bot", direction: "out" as const, body: "Got it — I can split this into 3 payments of $282.33 or 6 payments of $141.17. Which works?", at: "2:05 PM" },
  { from: "Jordan", direction: "in" as const, body: "3 month plan sounds good", at: "2:06 PM" },
  { from: "QPP Bot", direction: "out" as const, body: "Perfect. First payment of $282.33 is due today. Here's your secure link: https://qpp.waystar.demo/pay/memorial-health-mar-12?plan=3&installment=1 — the remaining 2 payments will be scheduled once your card is on file.", at: "2:06 PM" },
];

export default function DevInbox() {
  return (
    <AppShell
      role="admin"
      user={{ name: "Dev", email: "dev@qpp.local", subtitle: "Simulated SMS" }}
      nav={[
        { href: "/admin", label: "Back to admin", icon: <GridIcon /> },
        { href: "/dev/inbox", label: "Inbox", icon: <InboxIcon /> },
      ]}
    >
      <PageHeader
        eyebrow="Developer · simulated"
        title="Text-to-pay inbox"
        description="Live view of inbound and outbound WhatsApp/SMS messages handled by the QPP bot. Used in the on-stage demo so the audience can watch the conversation."
      />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Conversation list */}
          <div className="overflow-hidden rounded-lg border border-rule bg-white">
            <div className="border-b border-rule px-4 py-3 text-[13px] font-medium">
              Conversations
            </div>
            <ul className="divide-y divide-rule">
              <li className="flex items-center gap-3 bg-waystar-wash/60 px-4 py-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-waystar text-[12px] font-medium text-white">
                  JR
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-ink">
                    Jordan Rivera
                  </div>
                  <div className="truncate text-[11.5px] text-ink-muted">
                    3 month plan sounds good
                  </div>
                </div>
              </li>
              <li className="flex items-center gap-3 px-4 py-3 opacity-60">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-canvas text-[12px] font-medium text-ink-muted">
                  AK
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-ink">
                    Alex Kim
                  </div>
                  <div className="truncate text-[11.5px] text-ink-muted">
                    Paid $75.00 · 58m ago
                  </div>
                </div>
              </li>
            </ul>
          </div>

          {/* Thread */}
          <div className="flex h-[560px] flex-col overflow-hidden rounded-lg border border-rule bg-white">
            <div className="border-b border-rule px-5 py-3">
              <div className="text-[13px] font-medium text-ink">Jordan Rivera</div>
              <div className="text-[11.5px] text-ink-muted">
                whatsapp:+1 (555) 442-0199 · Memorial Health — 3/12 Visit
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-canvas px-5 py-5">
              {CONVO.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.direction === "in" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={[
                      "max-w-[78%] rounded-lg px-3 py-2 text-[13px] leading-relaxed",
                      m.direction === "in"
                        ? "bg-ink text-white"
                        : "bg-white text-ink border border-rule",
                    ].join(" ")}
                  >
                    {m.direction === "out" && (
                      <div className="mb-0.5 text-[10.5px] font-medium uppercase tracking-wider text-waystar-deep">
                        {m.from}
                      </div>
                    )}
                    <div>{m.body}</div>
                    <div
                      className={`mt-1 text-[10.5px] ${m.direction === "in" ? "text-white/60" : "text-ink-muted"}`}
                    >
                      {m.at}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-rule p-3">
              <div className="flex items-center gap-2">
                <input
                  placeholder="Simulate inbound message…"
                  className="h-9 flex-1 rounded-md border border-rule bg-white px-3 text-[13px] outline-none focus:border-waystar"
                />
                <button className="h-9 rounded-md bg-waystar px-3 text-[12.5px] font-medium text-white">
                  Send
                </button>
              </div>
              <div className="mt-2 text-[11px] text-ink-muted">
                Try: <span className="font-mono">PAY</span> ·{" "}
                <span className="font-mono">PLAN</span> ·{" "}
                <span className="font-mono">ASK when is my follow-up?</span>
              </div>
            </div>
          </div>
        </div>
      </PageBody>
    </AppShell>
  );
}
