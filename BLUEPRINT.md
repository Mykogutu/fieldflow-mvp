# FieldFlow MVP — Build Blueprint

## What We're Building

A WhatsApp-based field service management system. 10 features. 9 database models. One core loop.

---

## The Core Loop

```
Admin creates job → Worker WhatsApp → Accept → Do work → "Done 5000"
→ Client gets OTP + invoice → Worker submits OTP → Job verified, invoice paid, job card sent
```

If everything in the MVP serves this loop, you ship. If it doesn't, cut it.

---

## Build Order

### Week 1: Foundation

| Day | What | Files |
|-----|------|-------|
| 1 | Project setup (Next.js 14, Prisma, Tailwind, TypeScript) | `package.json`, `tsconfig.json`, `tailwind.config.ts`, `prisma/schema.prisma` |
| 1 | Database schema (9 models) + push to Neon | `prisma/schema.prisma` |
| 1 | Auth system (JWT login, middleware, default admin) | `src/lib/auth.ts`, `src/app/api/auth/*/route.ts` |
| 2 | Admin layout (sidebar, top bar, notification bell) | `src/app/admin/layout.tsx` |
| 2 | Admin login page | `src/app/admin/login/page.tsx` |
| 2 | Prisma singleton + utility helpers | `src/lib/prisma.ts`, `src/lib/utils.ts` |
| 3 | Workers CRUD (add/edit/delete workers with phone numbers) | `src/app/admin/workers/page.tsx`, `src/app/actions/user-actions.ts` |
| 3 | Settings page (company name, logo, job types) | `src/app/admin/settings/page.tsx` |

### Week 2: Job Management + WhatsApp

| Day | What | Files |
|-----|------|-------|
| 4 | Jobs CRUD (create, list, filter by status) | `src/app/admin/jobs/page.tsx`, `src/app/actions/job-actions.ts` |
| 4 | Job creation form (client details, type, location, date, assign worker) | Component in jobs page |
| 4 | Twilio messaging layer (send WhatsApp, templates, fallback) | `src/lib/twilio.ts` |
| 5 | **WhatsApp webhook** — accept/decline intents | `src/app/api/webhooks/whatsapp/route.ts` |
| 5 | AI intent parser (regex fast-path) | `src/lib/ai-agent.ts` |
| 5 | Auto-reassignment on decline | Inside webhook + `src/lib/assignment.ts` |
| 6 | **WhatsApp webhook** — completion + OTP flow | Continue `route.ts` |
| 6 | Invoice auto-generation on "Done [amount]" | `src/app/actions/invoice-actions.ts` |
| 7 | OTP verification → VERIFIED + invoice PAID | Continue `route.ts` |
| 7 | Gemini AI fallback for ambiguous messages | Continue `src/lib/ai-agent.ts` |

### Week 3: Documents + Postponement + Dashboard

| Day | What | Files |
|-----|------|-------|
| 8 | Invoice PDF generator | `src/lib/pdf-generator.ts` |
| 8 | Job Card PDF generator | Continue `pdf-generator.ts` |
| 8 | PDF API routes | `src/app/api/invoices/[id]/pdf/route.ts` |
| 9 | Send docs to client via WhatsApp on verification | `src/lib/notifications.ts` |
| 9 | **WhatsApp webhook** — postpone intent + reason capture | Continue `route.ts` |
| 9 | Needs Rescheduling queue on jobs page | Update jobs page |
| 10 | Assignment engine (proximity + workload + fairness) | `src/lib/assignment.ts` |
| 10 | Gemini proximity analysis | Continue `assignment.ts` |

### Week 4: Polish + Deploy

| Day | What | Files |
|-----|------|-------|
| 11 | Dashboard overview (active jobs, revenue, notifications) | `src/app/admin/page.tsx` |
| 11 | Invoices list page (status filters, PDF download) | `src/app/admin/invoices/page.tsx` |
| 11 | Notification system (bell icon, dropdown, mark read) | `src/lib/notifications.ts`, `src/components/notifications/` |
| 12 | Daily briefing cron job | `src/app/api/cron/daily-briefing/route.ts` |
| 12 | SLA alerts cron job | `src/app/api/cron/sla-alerts/route.ts` |
| 12 | Expense tracking (basic CRUD) | `src/app/admin/expenses/page.tsx`, `src/app/actions/expense-actions.ts` |
| 13 | **WhatsApp webhook** — undo intent (15-min window) | Continue `route.ts` |
| 13 | Multi-job selection (numbered list when worker has multiple jobs) | Continue `route.ts` |
| 14 | End-to-end testing | Manual + Playwright |
| 14 | Deploy to Vercel, configure Twilio webhook URL, test with real WhatsApp | Vercel dashboard |

---

## Twilio Setup

### Before you start coding:

1. **Twilio Account** — Create at twilio.com
2. **WhatsApp Sandbox** (for dev) — Twilio Console → Messaging → Try WhatsApp
3. **WhatsApp Business Number** (for production) — Apply via Twilio
4. **Webhook URL** — Point to `https://your-domain.com/api/webhooks/whatsapp`
5. **Content Templates** — Create and get approved:

| Template | Purpose | Variables |
|----------|---------|-----------|
| Job Assignment | Notify worker of new job | client_name, job_type, location, date |
| Service Completion | Send OTP + invoice to client | worker_name, amount, otp_code, invoice_url |

Templates must be approved by WhatsApp (takes 24-48 hours).

---

## Admin Dashboard Pages (5 total)

```
/admin                    → Dashboard (overview widgets)
/admin/jobs               → Jobs list + create/edit modal
/admin/invoices           → Invoices list + PDF download
/admin/workers            → Workers CRUD
/admin/settings           → Company config, job types
```

That's 5 pages. Plus login = 6 total admin routes.

---

## WhatsApp Webhook — The Heart

`POST /api/webhooks/whatsapp`

```
Incoming Twilio POST → Extract phone + message body
→ Find worker by phone number
→ Parse intent (regex → Gemini fallback)
→ Switch on intent:
   ACCEPT_JOB    → Set IN_PROGRESS, notify client
   DECLINE_JOB   → Mark DECLINED, find next worker, reassign
   REPORT_COMPLETION → Generate OTP, create invoice, send to client
   SUBMIT_OTP    → Verify, mark VERIFIED, generate docs, send to client
   POSTPONE_JOB  → Log reason, notify client + admin
   UNDO          → Reset to IN_PROGRESS (15-min window)
   UNKNOWN       → Reply "I didn't understand. Reply ACCEPT, DECLINE, or DONE."
→ Send WhatsApp response to worker
```

**Critical: every intent handler must:**
1. Update job status in database
2. Send WhatsApp response to worker
3. Create admin notification
4. Notify client when appropriate

---

## File Structure (MVP)

```
src/
├── app/
│   ├── admin/
│   │   ├── layout.tsx           # Sidebar + top bar + notification bell
│   │   ├── login/page.tsx       # Login form
│   │   ├── page.tsx             # Dashboard overview
│   │   ├── jobs/page.tsx        # Jobs list + create/edit
│   │   ├── invoices/page.tsx    # Invoices list
│   │   ├── workers/page.tsx     # Workers CRUD
│   │   ├── expenses/page.tsx    # Expenses list
│   │   └── settings/page.tsx    # Company config
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── me/route.ts
│   │   ├── webhooks/
│   │   │   └── whatsapp/route.ts   # ★ THE CORE
│   │   ├── invoices/
│   │   │   └── [id]/pdf/route.ts
│   │   └── cron/
│   │       ├── daily-briefing/route.ts
│   │       └── sla-alerts/route.ts
│   └── actions/
│       ├── job-actions.ts
│       ├── invoice-actions.ts
│       ├── expense-actions.ts
│       ├── user-actions.ts
│       └── notification-actions.ts
├── components/
│   ├── admin/                   # Admin-specific components
│   └── notifications/           # Bell + dropdown
├── lib/
│   ├── auth.ts                  # JWT auth + middleware
│   ├── prisma.ts                # Prisma singleton
│   ├── twilio.ts                # Send WhatsApp + templates
│   ├── ai-agent.ts              # Intent parser (regex + Gemini)
│   ├── assignment.ts            # Worker scoring algorithm
│   ├── pdf-generator.ts         # Invoice + Job Card PDFs
│   ├── notifications.ts         # Doc delivery + admin notify
│   └── utils.ts                 # Formatters, phone normalize
└── types/
    └── index.ts                 # Shared TypeScript types
```

**14 lib/action files. 8 admin pages (including login). 1 webhook. 2 crons. That's the MVP.**

---

## Verification Checklist

Before you ship, test this exact sequence:

- [ ] Admin can log in
- [ ] Admin can add a worker (with phone number)
- [ ] Admin can create a job and assign it to a worker
- [ ] Worker receives WhatsApp assignment notification
- [ ] Worker texts "Accept" → job moves to IN_PROGRESS
- [ ] Worker texts "Decline" → job auto-reassigns to another worker
- [ ] Worker texts "Done 5000" → OTP sent to client, invoice created
- [ ] Worker texts the 6-digit OTP → job VERIFIED, invoice PAID
- [ ] Client receives invoice PDF + job card PDF via WhatsApp
- [ ] Admin sees notification for each event
- [ ] Worker texts "Postpone — client not home" → job postponed, reason logged
- [ ] Admin can reschedule a postponed job
- [ ] Worker texts "Undo" within 15 minutes → job reset
- [ ] Daily briefing sends at configured time
- [ ] Dashboard shows active jobs count, revenue, recent activity

**If all 15 checks pass, the MVP is done.**

---

## After MVP — What to Add Next

**Priority order (each builds on the last):**

1. **Warranties/Certificates** — auto-generate on verification (week 5)
2. **Before/after photos** — WhatsApp media handling (week 5)
3. **Worker earnings check** — "Earnings" intent (week 6)
4. **Schedule check** — "My jobs" intent (week 6)
5. **Client ratings** — post-job WhatsApp survey (week 6)
6. **Quotation system** — create, send, convert to job (week 7)
7. **Check-in + job timer** — "Arrived" intent (week 7)
8. **Financial reports** — revenue vs expenses charts (week 8)
9. **Industry add-ons** — Vehicle/Device/SIM models for tracker client (week 8+)
