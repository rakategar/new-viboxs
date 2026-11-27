# Pending deploy: v4 WP03 + WP04 (branch `v4-wp03-wp04`)

**Context:** written on 27 Nov 2026 from a Claude Code account that has no Supabase MCP. The SQL below has **not been applied** and the tests have **not been run**. Only `tsc` and `vite build` passed for `build:studio` and `build:edu`.

> **Warning:** do not merge this branch to `main` before steps 1–4 are done. The new UI calls `st_my_payments`, `st_review_draft`, the `format_fields`/`cover_*` columns, and the `st-program-media`/`edu-media` buckets. Without the migrations, the Earnings, Payouts, Program saya and Review EDU pages will error in production.

## Deploy order (account with Supabase MCP: project `lbouqcovrnuhahrcnpki`)

### 1. Apply the migrations

Use `apply_migration`, in this order:

| # | Migration name | Source file |
|---|---|---|
| 1 | `20261127e_proof_internal_only` | `supabase/migrations/20261127e_proof_internal_only.sql` |
| 2 | `20261127f_program_formats_media` | `supabase/migrations/20261127f_program_formats_media.sql` |

`20261127f` patches `st_release_program_payable` by text replacement. It fails loudly if the live definition differs from what it expects.

### 2. Deploy the edge function `st-notify`

Deploy `supabase/functions/st-notify/index.ts` with `verify_jwt=false`. It adds two templates:

- `payout.paid` ("Pembayaran berhasil", sent without the proof attachment);
- `program.published` ("Program tayang").

If this step is skipped, those emails retry 5 times and then end in `failed`. Commander can resend them later with "Coba kirim lagi".

### 3. Run the tests

Run each file through `execute_sql`. Every test file ends with `rollback`. Expected result: every row has `ok = true`.

| Test file | What it covers | Expected |
|---|---|---|
| `supabase/tests/v4_proof_internal_only.sql` | V4-BP-005..010, V4-MG-001, RAN-012 | all `ok = true` |
| `supabase/tests/v4_publish_formats.sql` | V4-PF-001..015 | all `ok = true` |
| `supabase/tests/commander_mfa.sql` | MFA regression | 21 RPCs guarded (18 + `st_set_staff_permission`, `st_payment_add_proof`, `st_review_draft`) |
| `v4_demo_isolation.sql`, `v4_activation.sql`, `v4_company_application.sql`, `edu_company_firewall.sql`, `edu_publish_learning_flow.sql` | Regression | unchanged |

Note: `v4_publish_formats.sql` and `v4_proof_internal_only.sql` insert rows directly into `storage.objects` to simulate uploads. If storage rejects direct inserts, replace that part with an upload through the API.

### 4. Check the advisors

Run `get_advisors` for security, then performance. The expected new objects are:

- **Tables:** `st_staff_permissions`, `st_payment_proofs`, `st_program_reviews`. All have RLS enabled.
- **Buckets:** `st-program-media` (private) and `edu-media` (public).

### 5. Merge and deploy the frontend

Merge `v4-wp03-wp04` into `main`, push, and wait for Vercel to report READY.

### 6. Check in the browser

Do these checks with the demo accounts (credentials are in the internal RAHASIA file):

- **Contributor:** for each format (ebook, webinar, workshop, kit, ecourse):
  - only the relevant fields appear;
  - the cover can be cropped and saved;
  - submitting without a cover is rejected.
- **Commander:**
  - "Setujui & tayangkan" publishes the program in one click;
  - the cover appears on EDU with the correct aspect ratio;
  - "Tayangkan ulang" does not create a duplicate.
- **Ranger/Contributor Earnings:** shows "Pembayaran berhasil" with a masked reference and no proof button.
- **Commander Payouts:**
  - "Lihat bukti" opens a 60-second link;
  - "Ganti bukti" creates version 2.

## Behaviour changes to be aware of

- **Program approval publishes immediately.** There is no longer a "Kirim ke EDU" step followed by a separate publish in the CMS. Drafts that are already in `publish_queued` are published when "Tayangkan ulang" is pressed.
- **Old drafts in `submitted` cannot be approved yet.** They have no cover upload or format fields. Ask the contributor to revise them.
- **Ranger/Contributor can no longer open transfer proofs at all.** Old signed URLs expire on their own (300 seconds).
- **Access to proofs ("evidence"):**
  - Commander has access.
  - An Operator has access only with the `FINANCE_EVIDENCE` permission, granted via `st_set_staff_permission`.
  - There is no UI yet for granting that permission.
- **KIT is treated as a digital product**, like an e-book: it appears in the Digital Library, uses the 7-day refund window for profit sharing, and is delivered as a file through `edu-private`.

## Known gaps (follow-ups)

- **Media validation is client-side only.** Magic bytes are checked in the browser and the cover is re-encoded to WebP, which strips EXIF. The server enforces only the bucket MIME allowlist and the 5 MB limit. A `media-intake` edge function with server-side scanning (ADR-3) does not exist yet.
- **Old public cover files are not deleted.** When a cover is replaced, the old file stays in `edu-media`.
