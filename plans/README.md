# Slice plans for remaining QPP work

Each file is a self-contained brief for one dev on one branch. Read the file
end-to-end before starting. All branches should be taken off `main` unless the
file says otherwise.

| # | Plan | Branch | Est. | Blocked by |
|---|------|--------|------|-----------|
| 1 | [Webhook Event Processor](01-webhook-processor.md) | `webhook-processor` | ~1 hr | — |
| 2 | [Admin Page CRUD](02-page-crud.md) | `page-crud` | ~1.5 hr | — |
| 3 | [Reporting + CSV](03-reporting.md) | `reporting` | ~1 hr | slice 1 for live data (dev against seeded row) |
| 4 | [Distribution helpers](04-distribution-helpers.md) | `distribution-helpers` | ~30 min | — |
| 5 | [Email confirmation](05-email-confirmation.md) | `email-confirmation` | ~45 min | slice 1 |
| 6 | [Deploy + README + A11y](06-deploy.md) | `deploy` | ~45 min | slices 1–5 ideally merged |

## Parallelism

Slices 1, 2, and 4 have no code-level overlap and can be worked on simultaneously in separate worktrees. Slices 3 and 5 depend on slice 1's seam (webhook processor) — start them after slice 1 is up, or branch them off `webhook-processor` directly and rebase later. Slice 6 is the submission gate and goes last.

## Priority if time-boxed

In order: **1 → 2 → 3 → 6** is the minimum viable submission path. 4 and 5 add points but aren't blockers for a functional demo.
