# CLAUDE.md — FieldFlow MVP

> WhatsApp job assignment. OTP client signature. Auto-invoicing. That's it.

---

## What This Is

FieldFlow MVP is a field service management platform with one core idea: **workers interact entirely through WhatsApp**. Admin creates jobs on a dashboard, workers manage everything by texting. No apps. No training. No complexity.

### The Loop

```
Admin creates job → Worker gets WhatsApp → Worker texts "Accept"
→ Worker does the job → Worker texts "Done 5000"
→ Client gets OTP + invoice → Client shares OTP with worker
→ Worker texts "847291" → Job verified, invoice paid, job card generated
```

Everything in the MVP exists to make this loop work.

---

## MVP Features (10 Total)

### 1. WhatsApp Job Assignment
Admin creates a job on the dashboard → selects a worker → system sends WhatsApp notification to the worker with job details (client name, location, time, description).

**Twilio Content Template:** Pre-approved template that includes client name, job type, location, scheduled date. Falls back to freeform within 24-hour window.

### 2. Accept / Decline + Auto-Reassign
Worker texts "Accept" → job moves to IN_PROGRESS, client notified.
Worker texts "Decline" → system auto-assigns the next best available worker. Admin gets notified.

No manual intervention needed for reassignment.

### 3. AI Intent Parser
Two-tier system:
- **Regex fast-path:** Handles 90%+ of messages instantly without API call
- **Gemini AI fallback:** For ambiguous messages

**MVP intents:**

| Intent | Regex Pattern | Examples |
|--------|--------------|---------|
| `ACCEPT_JOB` | `^(accept\|yes\|confirm\|ok\|sure\|taking)` | "Accept", "Yes", "Taking it" |
| `DECLINE_JOB` | `^(decline\|reject\|no\|cant\|busy)` | "Decline", "Busy", "No" |
| `REPORT_COMPLETION` | `(done\|finish\|complete)` or `^\d{3,6}$` | "Done", "Done 5000", "Finished" |
| `SUBMIT_OTP` | `\b\d{6}\b` | "847291", "Code is 847291" |
| `POSTPONE_JOB` | `(postpone\|reschedule\|delay\|cancel)` | "Postpone", "Postpone — client not home" |
| `UNDO` | `(undo\|mistake\|wrong)` | "Undo", "Mistake" |

**Returns:**
```typescript
interface AIResponse {
  intent: 'ACCEPT_JOB' | 'DECLINE_JOB' | 'REPORT_COMPLETION' | 'SUBMIT_OTP' | 'POSTPONE_JOB' | 'UNDO' | 'UNKNOWN';
  data: {
    amount?: number;
    clientName?: string;
    otpCode?: string;
    selectionIndex?: number;
    postponeReason?: string;
  };
}
```

### 4. Job Completion + OTP (Client Signature)

Worker texts "Done 5000":
1. System generates a random 6-digit OTP
2. Creates a PENDING invoice for KES 5,000
3. Sends WhatsApp to client: "Service complete. Amount: KES 5,000. Service Code: 847291. Share this code with the technician after payment."
4. Waits for worker to submit OTP

Worker texts "847291":
1. System validates OTP (matches + not expired)
2. Job → VERIFIED
3. Invoice → PAID
4. Generates Job Card PDF
5. Generates Warranty PDF (if applicable)
6. Sends all documents to client via WhatsApp
7. Creates admin notification

**Multi-job handling:** When a worker has multiple active jobs:
- Tries to match by amount or client name ("Done Machel 5000")
- Falls back to selection index ("Done 1")
- If ambiguous, sends numbered list for clarification

**OTP on the Job Card = Client Signature:**
```
CLIENT VERIFICATION
Service Code: 847291
Verified at: 2026-04-03 14:47:23
Status: ✅ Client Confirmed
```

### 5. Invoice Auto-Generation

**Created automatically** when worker reports "Done [amount]".
- Invoice number: auto-incremented (INV-0001, INV-0002, ...)
- Line items: job type + description
- Amount: from worker's completion message
- Status: PENDING → PAID (on OTP verification)
- PDF: auto-generated, downloadable, sent to client via WhatsApp

**No manual invoice creation needed for the standard flow.**

### 6. Job Card Generation

Auto-generated when a job reaches VERIFIED status. Contains:

```
┌──────────────────────────────────────────┐
│         [COMPANY LOGO & NAME]            │
│              JOB CARD                    │
│         Job #: JC-2026-0847             │
├──────────────────────────────────────────┤
│ CLIENT: Name, Phone, Location            │
├──────────────────────────────────────────┤
│ JOB: Type, Description, Priority         │
├──────────────────────────────────────────┤
│ WORKER: Name, Phone                      │
├──────────────────────────────────────────┤
│ TIMELINE                                 │
│ Assigned:  Apr 2, 4:35 PM                │
│ Accepted:  Apr 2, 4:42 PM                │
│ Completed: Apr 3, 11:47 AM               │
│ Verified:  Apr 3, 12:03 PM               │
├──────────────────────────────────────────┤
│ FINANCIAL                                │
│ Amount: KES 8,000  Invoice: INV-0847     │
├──────────────────────────────────────────┤
│ CLIENT VERIFICATION                      │
│ ✅ Service Code: 847291                  │
│ Verified: Apr 3, 12:03 PM               │
├──────────────────────────────────────────┤
│ POSTPONEMENT HISTORY (if any)            │
│ Apr 1 — "Client not available"           │
└──────────────────────────────────────────┘
```

Sent to: client (WhatsApp), stored on dashboard.

### 7. Postponement with Reason

**Simple path:** "Postpone — client not home" → one message does everything.

**Guided path:** "Postpone" → system asks which job (if multiple) → asks reason → worker types reason.

**What happens:**
1. Job status → POSTPONED
2. Reason + timestamp logged
3. Client notified via WhatsApp
4. Admin notified
5. Job appears in "Needs Rescheduling" queue on dashboard

### 8. Daily Briefing

Every morning at a configured time, each worker with scheduled jobs gets:

```
☀️ Good morning, James!

📋 Today's Jobs (2):

1. 🔧 Tank Repair — Mrs. Wanjiku
   📍 Kilimani, Nairobi
   ⏰ 9:00 AM

2. 🧹 Tank Cleaning — Mr. Otieno
   📍 Lavington, Nairobi
   ⏰ 12:00 PM

Reply "Accept" to confirm all.
```

### 9. Assignment Engine

When admin creates a job, the system suggests the best worker based on:

| Factor | Weight | How |
|--------|--------|-----|
| Proximity | 40% | Gemini AI compares worker locations vs job location |
| Workload | 30% | Fewer active jobs = higher score |
| Fairness | 30% | Fewer total historical jobs = higher score |

Admin can override and pick any worker manually.

### 10. Admin Dashboard

**Minimal but complete:**

| Section | What It Shows |
|---------|-------------|
| **Overview** | Active jobs count, revenue this month, pending jobs, notifications |
| **Jobs** | Create, view, assign, reassign, reschedule. Status filters. "Needs Rescheduling" queue. |
| **Invoices** | Auto-generated list. Status filters (PENDING/PAID). PDF download. |
| **Workers** | Add/edit workers. Phone number (critical — this is how WhatsApp identifies them). Name, role, zone. |
| **Notifications** | Real-time feed: job completed, declined, postponed, verified |
| **Settings** | Company name, logo, default job types, Twilio config |

---

## Job Status Machine (MVP)

```
ASSIGNED ──→ IN_PROGRESS ──→ COMPLETED_PENDING_VERIFICATION ──→ VERIFIED ──→ CLOSED
  │              │ ↑                                              
  │              │ └──── UNDO (15 min) ──────────────────────────┘
  │              │
  │              ├── POSTPONED ──→ Admin reschedules ──→ ASSIGNED
  │              │
  └── DECLINED ──→ Auto-Reassign ──→ ASSIGNED (new worker)
```

Six statuses. That's it.

---

## Database Schema (MVP Only)

### Models (9)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  phone     String?  @unique        // WhatsApp identifier
  password  String
  name      String
  role      Role     @default(TECHNICIAN)
  baseZone  String?                 // For proximity scoring
  jobs      Job[]    @relation("JobWorkers")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Job {
  id                String    @id @default(cuid())
  clientName        String
  clientPhone       String
  description       String?
  jobType           String                     // Configurable per tenant
  status            JobStatus @default(ASSIGNED)
  priority          Priority  @default(NORMAL)
  location          String?
  zone              String?
  scheduledDate     DateTime?
  quotedAmount      Float?
  finalAmount       Float?
  otpCode           String?                    // 6-digit verification code
  otpExpiresAt      DateTime?
  postponeReason    String?
  postponedAt       DateTime?
  isReassigned      Boolean   @default(false)

  workers           User[]    @relation("JobWorkers")
  invoice           Invoice?
  notifications     Notification[]

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model Invoice {
  id              String        @id @default(cuid())
  invoiceNumber   String        @unique
  jobId           String        @unique
  job             Job           @relation(fields: [jobId], references: [id])
  amount          Float
  status          InvoiceStatus @default(PENDING)
  items           Json?                         // Line items array
  pdfUrl          String?
  clientName      String
  clientPhone     String
  technicianName  String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model Expense {
  id          String          @id @default(cuid())
  description String
  amount      Float
  category    ExpenseCategory
  jobId       String?
  invoiceId   String?
  date        DateTime        @default(now())
  receiptUrl  String?
  notes       String?
  createdAt   DateTime        @default(now())
}

model Notification {
  id        String   @id @default(cuid())
  type      String                          // JOB_REPORTED_DONE, JOB_VERIFIED, etc.
  title     String
  message   String
  isRead    Boolean  @default(false)
  link      String?
  jobId     String?
  job       Job?     @relation(fields: [jobId], references: [id])
  createdAt DateTime @default(now())
}

model Setting {
  id    String @id @default(cuid())
  key   String @unique
  value String
  type  String @default("string")
}

enum Role {
  ADMIN
  TECHNICIAN
}

enum JobStatus {
  ASSIGNED
  IN_PROGRESS
  POSTPONED
  COMPLETED_PENDING_VERIFICATION
  VERIFIED
  CLOSED
  DECLINED
}

enum Priority {
  EMERGENCY
  HIGH
  NORMAL
  LOW
}

enum InvoiceStatus {
  PENDING
  PAID
  CANCELLED
}

enum ExpenseCategory {
  MATERIALS
  TRANSPORT
  FUEL
  TOOLS
  LABOR
  OTHER
}
```

**9 models. 6 enums. That's the entire MVP database.**

---

## Tech Stack (MVP)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL + Prisma |
| Auth | JWT (bcryptjs + jsonwebtoken) |
| Messaging | Twilio (WhatsApp) |
| AI | Google Gemini (intent parsing + assignment) |
| PDF | jsPDF |
| Deployment | Vercel |

---

## API Routes (MVP)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/login` | POST | Admin login |
| `/api/auth/logout` | POST | Clear session |
| `/api/auth/me` | GET | Check session |
| `/api/webhooks/whatsapp` | POST | **Twilio webhook — the core** |
| `/api/invoices/[id]/pdf` | GET | Generate/serve invoice PDF |
| `/api/cron/daily-briefing` | GET | Morning worker briefing |
| `/api/cron/sla-alerts` | GET | Flag overdue jobs |

---

## Server Actions (MVP)

| Action File | Functions |
|------------|-----------|
| `job-actions.ts` | createJob, updateJob, assignJob, reassignJob, rescheduleJob, getJobs |
| `invoice-actions.ts` | getInvoices, updateInvoiceStatus |
| `expense-actions.ts` | createExpense, getExpenses |
| `user-actions.ts` | createUser, updateUser, getUsers, deleteUser |
| `notification-actions.ts` | getNotifications, markAsRead, markAllAsRead |

---

## Key Files to Build

| File | Purpose | Complexity |
|------|---------|-----------|
| `src/app/api/webhooks/whatsapp/route.ts` | WhatsApp webhook — all 6 intents | High |
| `src/lib/ai-agent.ts` | Regex + Gemini intent parser | Medium |
| `src/lib/assignment.ts` | Proximity + workload + fairness scoring | Medium |
| `src/lib/twilio.ts` | Send WhatsApp messages + templates | Low |
| `src/lib/pdf-generator.ts` | Invoice + Job Card PDFs | Medium |
| `src/lib/auth.ts` | JWT auth + middleware | Low |
| `src/app/admin/page.tsx` | Dashboard overview | Medium |
| `src/app/admin/jobs/page.tsx` | Jobs list + create/edit | Medium |
| `src/app/admin/invoices/page.tsx` | Invoice list | Low |
| `src/app/admin/workers/page.tsx` | Worker management | Low |
| `src/app/admin/layout.tsx` | Admin sidebar + notifications | Medium |
| `prisma/schema.prisma` | Database schema (above) | Low |
| `vercel.json` | Cron jobs config | Low |

---

## Environment Variables (MVP)

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="secure-random"
NEXT_PUBLIC_SITE_URL="https://..."

# Twilio
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_WHATSAPP_NUMBER="+1..."
TWILIO_JOB_ASSIGNMENT_TEMPLATE_SID="HX..."
TWILIO_SERVICE_COMPLETION_TEMPLATE_SID="HX..."

# Gemini
GOOGLE_API_KEY="..."

# Vercel
CRON_SECRET="..."
ADMIN_PHONE="+254..."
```

---

## What Is NOT in the MVP

Explicitly excluded to keep it simple:

- ❌ Warranties / Certificates (add later)
- ❌ Quotations (add later)
- ❌ Before/after photos (add later)
- ❌ Worker earnings check via WhatsApp (add later)
- ❌ Schedule check via WhatsApp (add later)
- ❌ Client rating system (add later)
- ❌ Arrival check-in / job timer (add later)
- ❌ Recurring jobs (add later)
- ❌ Multi-language (add later)
- ❌ Client self-service (add later)
- ❌ Payment gateway integration (add later, manual payments for now)
- ❌ Financial reports (add later, just raw invoice list for now)
- ❌ Multi-tenancy (single deployment per customer for now)
- ❌ Vehicle/Device/SIM tracking (industry add-on, not core)
- ❌ Blog / SEO / Marketing site (not part of FieldFlow)
