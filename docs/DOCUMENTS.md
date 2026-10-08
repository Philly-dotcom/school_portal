# Private PDF documents

Added in Phase 3 on 8 October 2026. You confirmed migration 020 was applied and agreed the document access rules before this work started. Migration **021** is prepared locally and still needs to be applied in Supabase.

## What is available

**Documents** is a separate library in the dashboard. School Admin uploads school-wide or class PDFs. Teachers upload PDFs for classes they currently teach. Students and guardians can download published documents but cannot upload.

Class documents follow current enrollment, just like announcements: a learner joining the class gains access to earlier published PDFs, and leaving removes access. Guardians need an explicit grant for the selected learner. Teachers lose class management access when their assignment ends. School Admin can still manage those documents.

Homework attachments are not included. They need homework's original-recipient rules, so they must not be added by simply linking a current-class document.

## Uploading and publishing

1. Open **Documents → New document**.
2. Choose the school or class audience, enter a title and select a PDF up to **2 MiB (2,097,152 bytes)**.
3. Upload it. A successful upload creates a staff-only draft.
4. Open the entry, download and review the file, then change its visibility to **Published**.

The file, title and audience are fixed after upload. To replace a document, upload a new entry and withdraw the old one. Files are never overwritten in place. Withdrawal hides an entry from learners and guardians; authorized staff retain access. It does not erase the stored file or copies someone already downloaded.

## If an upload is interrupted

The app reserves a document record first, uploads the bytes, then finishes the draft. These are separate operations because PostgreSQL and Storage are separate services.

If the upload fails or its result is uncertain, the list keeps an **uploading** entry visible to authorized staff only. Open it and save it as a draft. The app checks whether the stored PDF exists and matches the original size and hash. If that succeeds, you can review and publish it. If the bytes are missing or do not match, withdraw the unfinished entry and upload a new copy.

Check the list before retrying after a connection failure. The first request may have succeeded even if the browser did not receive its result. There is no automatic physical cleanup job in this release. Withdrawn and unfinished files count toward storage usage and need an agreed retention policy before live use. When physical cleanup is needed, use the Storage API or dashboard, not SQL deletes against `storage.objects`; SQL removes metadata without deleting the underlying file. [Supabase storage schema guidance](https://supabase.com/docs/guides/storage/schema/design)

## Supabase setup

- Run `supabase/migrations/202610080021_documents.sql` once, after 020, in the dedicated School Portal project. Leave all earlier migrations intact.
- The migration creates the **school-documents** private bucket, a 2 MiB limit, the `application/pdf` MIME allowlist, document metadata, permission functions and Storage policies. It does not upload any files.
- If a bucket with that exact name already exists, the migration deliberately fails instead of silently changing an existing bucket. Investigate its purpose and configuration before proceeding.
- Confirm the bucket is **private** and that its allowed type and size limit are correct. Supabase's global upload limit must also allow a 2 MiB file.
- No new environment variables, packages or service-role key are needed. Normal operations use the signed-in user's Supabase context.
- The Next.js server-action request limit is now 3 MiB to allow multipart overhead. The actual PDF limit remains 2 MiB in application validation and the bucket. If your running development server does not pick up the config change, restart it before testing.

Bucket restrictions and RLS follow [Supabase's bucket configuration](https://supabase.com/docs/guides/storage/buckets/creating-buckets) and [Storage access-control guidance](https://supabase.com/docs/guides/storage/security/access-control).

## How access is enforced

Document records carry school ownership and an optional class. A generated path contains the school UUID and document UUID; the user's original filename is not used as a storage path. Table reads, upload reservations, publication changes and Storage reads each check access. A prepared row authorizes only its creator to upload to that exact path while the entry is unfinished.

Downloads pass through an authenticated route under `/dashboard/documents/`. It checks the requested mode and selected learner, fetches the private file with the user's credentials, checks its size and hash, and returns an attachment with private/no-store headers. The app does not create public or signed download links. Direct Storage access still follows the account's actual combined permissions; the portal's selected-role feed and download route apply the narrower selected role.

The upload form checks the PDF filename/type, size, header and end marker. These are basic format checks, not a full PDF parser or malware scanner. Bucket MIME restrictions also do not prove file contents are safe. Use trusted fictional PDFs for testing; decide on scanning and file-retention procedures before live school use. Storage HTTP behaviour, bucket limits and direct API access still need hosted testing—local SQL tests cannot prove those parts.

## Files added

| File | What it does |
| --- | --- |
| `supabase/migrations/202610080021_documents.sql` | Creates the bucket, metadata, read/write functions and Storage policies. |
| `src/lib/document-validation.ts` | Shared types, form limits, bucket name, generated paths and page/download links. |
| `src/lib/document-file.ts` | Checks PDF format hints and size, then calculates the content hash. Server-only. |
| `src/lib/document-data.ts` | Reads a permitted page or one document through the role-aware database function. |
| `src/app/dashboard/documents/actions.ts` | Uploads a draft, finishes interrupted uploads, validates stored bytes and changes visibility. |
| `src/app/dashboard/documents/[id]/download/route.ts` | Authenticated download with role/learner checks and no public URL. |
| `src/components/document-form.tsx` | Upload form and fixed-file visibility controls. |
| `src/components/document-panel.tsx` | Staff management and learner/guardian library feeds. |
| `tests/documents-database.test.ts` | Fictional school isolation, transfers, guardian grants, Storage policies, failed uploads and atomic audit checks. |
| `tests/documents-actions.test.ts` | File validation, upload failures, hash mismatches, download authorization and response headers. |
| `tests/documents-panel.test.ts` | Escaped titles, learner restrictions, guardian selection and visibility controls. |
| `tests/helpers/storage-stub.ts` | Minimal Storage metadata tables for PGlite. Existing full-migration suites now use this fixture too. It is test-only and does not model the Storage HTTP service or actual file bytes. |

Documents reuse the existing announcement class picker and current-class permission helpers because the agreed access rules are the same. The dashboard, sidebar and role overview link to the new library.

## Browser and hosted checks

- [ ] Apply 021 and inspect the private bucket configuration.
- [ ] Upload a small trusted fictional PDF as Admin. Confirm it starts as a draft and downloads correctly for Admin.
- [ ] Check students, guardians and unrelated teachers cannot read that draft, including by its direct download path and Storage API.
- [ ] Publish a school-wide PDF. Confirm each permitted role can download it, while teachers cannot edit its visibility.
- [ ] Upload and publish a class PDF as a currently assigned teacher. A different class must not be selectable.
- [ ] Try a non-PDF file, a renamed text file and a PDF over 2 MiB. They must fail. Check the boundary with a valid file near 2 MiB too.
- [ ] Check learners cannot upload by using a forged form or direct Storage request.
- [ ] Use a guardian account with one explicit learner grant and try another learner's ID. Repeat with a combined teacher/guardian account in Guardian mode.
- [ ] Transfer a fictional learner. Access must leave the old class and follow the new class on the effective date. Revoke a guardian grant and confirm new download requests fail.
- [ ] End a teacher assignment, respecting existing timetable constraints. The teacher must lose class-document management and downloads derived solely from that assignment.
- [ ] Withdraw a published PDF. Learner downloads must fail afterwards. Staff should still be able to review or republish it.
- [ ] Test an interrupted upload and the unfinished-entry recovery described above. Never expose the incomplete entry to learners.
- [ ] Open visibility controls in two tabs. A stale save must not overwrite a newer change.
- [ ] Test direct reads, guessed paths, uploads, overwrite and deletion attempts with School A and School B users. Check anonymous/public URLs fail. The app does not issue signed URLs; if someone creates one through other tooling, its lifetime is a separate hosted behaviour to review.

Keep these results separate from the automated test run. Phase 3 is not accepted as complete until the outstanding browser and hosted checks are finished.
