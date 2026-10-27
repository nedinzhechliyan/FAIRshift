# FairShift — Worker Trust & Workforce Risk Platform
*Prompt Wars 2026 x SRM ACM Hackathon | Theme: UN SDG 8 (Decent Work and Economic Growth)*

FairShift is an enterprise-grade dual-interface workforce platform designed for shift-heavy workplaces across India (construction sites, university campuses, and hospitals). It bridges the gap between vulnerable shift workers and site employers through transparent shift pay calculations, privacy-preserving incident reporting, and fatigue-driven risk radar.

---

## The Anonymity Contract (Non-Negotiable)

Worker safety and trust require architectural guarantees, not just privacy policies. FairShift enforces a strict **Anonymity Contract** across its database schema, server middleware, logging, and AI pipelines:

1. **Zero Worker Identifiers in Reports**
   - The `reports` table contains **NO** `worker_id`, `device_id`, `session_id`, `ip_address`, or `user_agent`.
   - The report ingestion route verifies authentication only to ensure the reporter is an active worker at `site_id`; the session cookie is never read into or associated with the report record.

2. **Temporal Coarsening (Hour Rounding)**
   - No sub-minute or exact timestamps are stored. All report timestamps (`createdAtHour`) are deterministically truncated to the start of the hour (e.g. `2026-10-27T05:00:00.000Z`), preventing time-correlation attacks against physical gate logs or CCTV footage.

3. **In-Memory Audio Lifecycle**
   - Voice audio is streamed directly to server memory as a temporary buffer.
   - Audio is **never written to disk, local temp files, or object storage**.
   - Audio buffers are immediately wiped and dereferenced from RAM once processed by Gemini (`@google/genai`). Raw audio is never returned to any client or supervisor.

4. **Structured Log Sanitization**
   - All server log streams pass through an Anonymity Log Scrubber (`anonymityLogger.ts`).
   - IP addresses, session cookies, Base64 audio payloads, and raw report text are stripped before writing to stdout/stderr.

5. **Small-Group Suppression (< 5 Threshold)**
   - Employer dashboards, safety heatmaps, and zone aggregations enforce a hard k-anonymity floor of $k=5$.
   - Any breakdown (by zone, department, or shift) with fewer than 5 reports is suppressed: *"Too few reports to display safely (< 5 reports)"*.

6. **Dual-Table Anonymous Pulse Feedback**
   - Worker check-ins split into two non-joinable tables:
     - `pulse_participation`: Stores a one-way salted SHA-256 hash `HMAC(worker_id, iso_week)` to prevent duplicate weekly submissions.
     - `pulse_responses`: Stores mood rating (1–5), concern tags, and optional audio reflection timestamped only to the ISO calendar week with zero user linkage.
   - It is mathematically impossible for an employer or database administrator to correlate a response back to a specific worker.

7. **Prompt-Injection Defense & Deterministic Safety Net**
   - Transcripts cannot manipulate or downgrade hazard classifications.
   - A deterministic keyword safety net (`safetyNet.ts`) inspects raw text in English, Hindi, and Tamil (e.g. *scaffold*, *मचान*, *சாரக்கட்டு*, *fall*, *fire*, *crane*).
   - If high-risk hazards are detected, severity is elevated to `high` or `critical` and marked `urgent: true`, completely bypassing any LLM evasion attempts.

8. **Role Isolation & Transcript Audit Logging**
   - Worker session cookies receive `403 Forbidden` on all supervisor routes (`/api/employer/*`).
   - Supervisors view English summaries by default.
   - Access to original voice transcripts requires explicit action and writes an immutable audit log (`transcript_views`) without exposing reporter metadata.

---

## Architecture & Core Modules

### 1. Worker App (Mobile-First PWA, 360px Base)
- **High-contrast, icon- and voice-first UI** built for low-literacy workers on basic Android devices.
- **Full trilingual localization** (English, हिन्दी, தமிழ்) with zero hardcoded strings.
- **State-aware Shift Check-In / Check-Out** supporting rotating HMAC QR codes and GPS geofence checks (Haversine formula).
- **Offline-First Synchronization Queue** (IndexedDB) with automatic replay and client clock-skew compensation.
- **Transparent Shift Payslips** powered by a deterministic pay engine with audio explanations.
- **Voice Grievance Reporting** with hold/tap waveform recording, zone picker, and CSPRNG unambiguous case codes (`RPT-XXXX`).
- **Live Status Tracking** allowing workers to query supervisor actions and hear recorded audio updates anonymously.

### 2. Deterministic Pay Engine (`payEngine.ts`)
- Strict separation of concern: LLMs **never calculate money or hours**.
- Unit-tested calculation engine accounting for standard hours, 2x overtime multipliers, night-shift premiums, advance deductions, and statutory gross/net pay.
- Indian currency formatting (`formatINR`) compliant with RBI/SBI conventions (`₹1,780`).

### 3. Fatigue & Attrition Radars (`fatigueEngine.ts` & `attritionEngine.ts`)
- Multi-factor fatigue scoring calibrated to Indian industrial norms:
  - Long shift penalty (> 8h regular).
  - Insufficient rest gaps (< 12h turnarounds).
  - Circadian disruption (night shift clusters).
  - Consecutive shift streaks (> 6 days).
- Transparent score breakdown with explainable factors summing to 100%.

### 4. Enterprise Multi-Sector Configurations (`siteRules.ts`)
- Seamless configuration packs across:
  - **Metro Line Construction Site** (Default).
  - **University Campus Facilities**.
  - **District General Hospital**.

---

## Demo Mode & Shared Server-Side Architecture

In Demo Mode (the default when external cloud databases are not configured), FairShift manages all application state in the **single unified Node.js/Express server process** (`src/server/repository.ts`):

- **Single Shared Server Repository**: All worker reports, supervisor status transitions, attention queue triages, hazard map pins, and anonymous pulse feedback live in server memory (`this.inMemoryStore`).
- **Real Cross-Device Synchronization**: When a worker submits a report on a mobile device (or separate browser window), it is immediately persisted in the server's repository and fetched in real time (via 5-second visibility-aware polling) by all connected employer consoles.
- **Worker Status Verification**: When a supervisor updates a case status or appends an action note, any worker querying that secret case code from any device sees the updated status immediately via `/api/reports/status/:caseCode`.
- **Zero Client-Only State**: No incident reports or supervisor actions are stored in browser `localStorage` or component-only state.
- **Reset Boundary**: All state is held in the running Node server process heap and is shared simultaneously across all clients; **all dynamic demo reports and updates reset cleanly to initial seed data whenever the server process is restarted**.

---

## Verification & Testing

Run all deterministic engine, anonymity, and cross-device integration verification suites:
```bash
npm test
```
The test suite validates:
- Pay Engine: Base ₹180/hr, 8h regular, 1.5h OT @ 2x, ₹200 advance → Gross ₹1,980, Net ₹1,780.
- Fatigue Engine: Story worker Ramesh Kumar calibrated to red band (≥ 70, score 75).
- Boundary tests at 39/40 (Green/Amber) and 69/70 (Amber/Red).
- Anonymity Contract: No `worker_id` stored, hour-level rounding, prompt injection defense, and small-group suppression.
- Cross-Device Demo Loop: Worker report submission → Supervisor case list visibility → Supervisor status/note update → Worker case-code lookup verification across independent clients.

---

## 3-Command Setup

```bash
# 1. Install dependencies
npm install

# 2. Run test verification suite
npm test

# 3. Start development server (serves worker PWA & employer console)
npm run dev
```

---

## Environment Variables

| Variable | Description | Required | Default / Note |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Optional. Google Gemini API key for live voice transcription & summary analysis. If omitted, deterministic fallbacks and local multilingual NLP engines operate seamlessly. | No | `MY_GEMINI_API_KEY` (placeholder) |
| `APP_URL` | Application root URL for self-referential links and OAuth callbacks. | No | `http://localhost:3000` |
| `PORT` | Local server port. | No | `3000` |

*Note: The platform is designed with graceful degradation and boots cleanly even when no environment variables are set.*

---

## Security & Accessibility Notes

- **Zero Secret Leaks**: Verified by automated audits (`git grep` checks for `AIza`, private keys, and service roles return zero matches).
- **Zod Schema Validation**: Applied across API endpoints with extra fields stripped and sanitized JSON responses (no internal stack traces exposed).
- **WCAG 2.1 AA Compliance**:
  - Touch targets calibrated to ≥ 56px (58px primary mobile buttons).
  - High contrast ratios (≥ 4.5:1 text-to-background).
  - Full keyboard accessibility and focus rings.
  - Screen reader semantic markup with `aria-live` announcement regions and tabular numeral spacing.
  - Trilingual language tags (`lang="en"`, `lang="hi"`, `lang="ta"`).

---

## Limitations & Future Scope

1. **Skill Passport**: Blockchain or digitally signed verifiable credentials for cross-employer portability.
2. **Bhashini Integration**: Dedicated government-backed Indian language speech models for edge-case rural dialects.
3. **Web Push Notifications**: Service-worker based background push notifications for offline shift alerts.

---

## Statutory & Legal Notice

> **FairShift supports transparency and helps employers align with working-hour norms; it is not legal advice.**
