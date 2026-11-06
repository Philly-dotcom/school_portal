# Phase 4 data design and test plan

The [29 October design as recorded before reconciliation](https://github.com/Philly-dotcom/school_portal/blob/8a0c5179d7db1b135288aae031a2b3d689028497/docs/PHASE_4_DATA_DESIGN.md#proposed-relationships) preserves the original diagram and provisional names. Status reconciled on 6 November against migrations 022–030. See [academic decisions](PHASE_4_ACADEMIC_DECISIONS.md) for product rules, [the plan](PHASE_4_PLAN.md) for delivery order and [the assessment checklist](ASSESSMENTS.md) for hosted evidence.

## Existing foundations

| Existing source | Reuse and important limit |
| --- | --- |
| `supabase/migrations/202610010003_academic_structure.sql` | Years, terms, grades, subjects and classes. Terms have a school/year and dates; a term is not a grading formula. |
| `202610010004_registers.sql`, `202610010009_enrollment_lifecycle.sql` | Student placement, inclusive dates, transfer/withdrawal history and overlap protection. A closed placement can still be eligible on an earlier assessment date. |
| `202610010005_teaching_assignments.sql`, `202610040014_teaching_assignment_lifecycle.sql` | Dated class/subject/teacher responsibility. A later replacement must not inherit earlier mark-editing authority. |
| `202610020010_register_membership_links.sql` | Active membership/role helpers, linked teachers/students/guardians, explicit guardian access and school-local date. |
| `202610070017_role_read_models.sql` | Narrow role-specific projections with explicit selected-child validation. Reuse the pattern, not current-week eligibility. |
| `202610080019_homework.sql` | School lock, rechecked permissions, expected versions, audited RPC writes and bounded readers. Its publication-date audience is wrong for academic results. |
| `src/lib/auth-context.ts`, `src/lib/permissions.ts`, `src/lib/portal-data.ts` | Verified request context and portal actor. Keep role modes as requested context, never authority. |
| `src/app/dashboard/documents/[id]/download/route.ts` | Authenticated private download, no-store headers and PDF integrity checks. Personal reports need their own publication-aware Storage policy. |
| `tests/homework-database.test.ts`, `tests/helpers/storage-stub.ts` | Disposable PGlite database, ordered migrations, simulated authenticated roles and fictional two-school fixtures. This is not hosted Storage or concurrent-session evidence. |

## Implemented relationships through migration 030

| Migration | Relationship in the database |
| --- | --- |
| 022 | `assessments` and `assessment_versions` retain the definition and authorised scale within the class, term and teaching assignment. |
| 023–024 | `assessment_rosters` and `assessment_roster_entries` freeze eligible placements. Entries anchor the learner’s retained `assessment_mark_versions`. `assessment_roster_amendments` records reasoned placement changes. |
| 025–026 | `assessment_correction_grants` scopes historical teacher access to an assessment and optionally a learner. `assessment_definition_amendments` records Admin changes to a frozen date or scale. |
| 027–028 | `assessment_reviewer_grants` scopes review authority. Each complete `assessment_submissions` record has `assessment_submission_entries` bound to retained mark versions and placement snapshots. `assessment_review_decisions` records approval or return of that exact submission. |
| 030 | `assessment_review_invalidations` records a reasoned Admin dispute against an existing approval. The original decision remains in history. |

The original design used the working names `assessment_results`, `assessment_result_versions` and `assessment_review_packages`. Use the roster entries, mark versions and submissions above for those responsibilities.

## Partially implemented — reporting policy

Migration 029 provides `grading_policies` and `grading_policy_versions` for school/year/grade/subject drafts, effective dates, source references and rule notes. Executable configuration, approval, unambiguous applicability, retirement and adoption into a newly reviewed package remain planned. Existing submissions review raw marks. No school weights or rounding rules have been approved.

## Proposed relationships — publication and dependent outputs

- A learner release would bind the exact mark version, submission and approval. Only School Admin may publish. Private review reasons stay out of learner payloads.
- Initial publication would release the eligible roster atomically. A correction would withdraw the affected release and dependent reports until fresh review and explicit republication. Unaffected learners retain their releases.
- Output review would require a separate scoped grant for the reporting period and class. Existing assessment reviewer and correction grants serve different purposes.

### Subject results and reports — later Phase 4 slices

- `subject_results` / `subject_result_versions`: stable learner/subject/period identity and immutable calculated snapshots. Include policy version, method version, completeness and explicit input references.
- `subject_result_inputs`: typed links to exact assessment publications; annual calculation may use explicit term-result versions. Prevent cycles and reject sources belonging to another learner, school, subject or period.
- `report_cards` / `report_versions`: learner/year/period identity and immutable issued content, policy references, comments, issue/revision details and source versions. Preserve required display values so later school/subject name changes cannot silently rewrite issued reports.
- `report_subject_inputs`: typed links to exact subject-result versions. No generic unvalidated `(table_name, record_id)` dependency store.
- Output review and publication records bind exact subject/report versions with the separate Admin output-review grant. Final names may be split by output type to keep foreign keys enforceable; no shared workflow framework is required.
- `report_artifacts`: private path, exact report version, checksum, size and generation state. A ready PDF is not automatically a published report. Generation failure leaves the report/artifact unavailable as appropriate, never resurrects a withdrawn version.
- Report availability is determined by current publication plus current caller access on every request, including direct Storage download. No public bucket or reusable signed URL for reports. Bytes already delivered cannot be recalled.

These are design names for future outputs. No learner publication, subject calculation or report generation is implemented through migration 030.

## Integrity and access enforcement

Use composite `(id, school_id)` foreign keys everywhere and stronger tuple constraints where ownership alone is insufficient. Existing classes expose `(id, school_id, academic_year_id)`; migration 019 adds an assignment identity tuple. New child references must also prove matching learner, assessment and revision. Add needed unique keys in new migrations, never by rewriting old files. Validate term/year/subject agreement in triggers or checked RPCs where the existing tuple is insufficient.

New tables use RLS and restricted grants. Staff version/audit tables are not readable by learners. Public mutation RPCs use the existing audited SQL pattern: fixed empty search path, schema-qualified names, no anonymous execute, no arbitrary actor parameter, and fresh identity/role/scope checks. SECURITY DEFINER is a controlled database boundary with explicit checks, not permission to bypass access using elevated app credentials. Direct writes to transition/version tables remain denied.

Learner readers require the existing linked Student or selected Guardian child context and return only that learner's current releases. Teacher scope must never become Guardian access. Direct API policies must independently enforce current ownership/grants even without a UI mode. Bounded readers perform authorisation before pagination and return minimal fields.

Reuse the current school-row lock order for related writes: authenticate, lock school, recheck authority, lock assessment/output, validate expected version, write revisions/dependencies/audit, commit. Existing membership, guardian-link, enrolment and assignment changes already participate in that school-lock pattern. New grant revocation must do so too. Keep transactions short; no PDF rendering or network requests while locks are held. Measure contention before changing the established lock strategy.

## Planned correction transaction for published outputs

1. Validate identity, current editing authority, reason and expected aggregate version.
2. Acquire locks in the same order as publication/grant changes and recheck authorisation/version.
3. Record Begin correction and append the new draft result version; preserve the old record.
4. Withdraw the affected current learner release. Invalidate pending package approval for changed content.
5. Follow typed dependency links to subject outputs, annual outputs and report versions. Mark all affected current publications unavailable in this transaction, even if recomputation may produce the same number.
6. Retain artefact metadata but make Storage/HTML/download authorisation reject invalidated report versions immediately. Roll back everything if any required database step fails.
7. After commit, show a neutral unavailable message. Later review, calculation and PDF generation cannot restore visibility automatically; Admin publishes explicitly.

Use the same school lock for output creation/publication so a report cannot be published concurrently from an input being withdrawn. Downloads recheck eligibility at request time; a response already authorised/in flight cannot be retroactively recalled. Avoid cross-request caches of permissions or current publication. Independent concurrent database sessions must test both correction/publish orderings.

## File plan and implementation boundaries

The October first-slice file plan is shown below as a historical reference. For actual files and later slices, use the [assessment file map](ASSESSMENTS.md#files-and-responsibilities).

| File | Responsibility |
| --- | --- |
| `src/lib/assessment-validation.ts` | Validated fields and scale/date input, not database authority. Reuse existing Zod dependency. |
| `src/lib/assessment-data.ts` | Server-only bounded authorised assessment readers using existing Supabase client. |
| `src/app/dashboard/assessments/actions.ts` | Verified context, parse input, call checked RPC, map errors and revalidate. Follow homework actions without copying its eligibility rule. |
| `src/components/assessment-panel.tsx`, `assessment-form.tsx` | Existing panel/form patterns, explicit permissions and planning/scale status. |
| `src/app/dashboard/page.tsx`, existing shell/navigation helpers | One assessment view integrated with existing mode preservation. Do not add a parallel dashboard/router. |
| Migration 022 | Assessment definitions, scale authorisation, scoped readers and writers. |
| `tests/assessment-validation.test.ts`, `assessment-actions.test.ts`, `assessment-database.test.ts` | Bounds, caller/action behaviour, actual SQL authorisation and relationships. Names provisional. |

Later marks/review/results/report files follow the existing Phase 4 plan. No new dependency, environment variable, service-role key or cloud resource is required for assessment setup. PDF library choice waits until report work. Read the installed Next.js documentation before application changes.

## Fixture plan — not a hosted seed script

Local database tests may create isolated disposable fictional A/B records, following the existing tests; they must never connect to hosted Supabase. Use school-local dates relative to the test clock, plus explicit past/future boundary fixtures, so a test does not stop working when 2026 ends. Test midnight across school timezones separately.

Hosted checks reuse the existing School A/B accounts, people, classes, enrolments and guardian grants. Before any fixture write, inventory IDs and eligibility read-only. Previous notes identify ST-003 and the 2026 class labelled 12A - 2026; they are historical pointers, not verified current data. Preserve 2027 planning records. Do not create another learner or school to make a test pass. School B's exact current usable records are not verified in this task.

Choose existing participants for Admin, assigned teacher, teacher without reviewer grant, authorised reviewer, Student, linked Guardian and Teacher/Guardian. Reuse users for multiple test roles where suitable; do not assume their roles/grants or change them silently. Use a clearly labelled fictional assessment with a temporary explicitly fictional scale; never describe test weights as approved school policy. New assessments/grants and consequential lifecycle changes need a concrete fixture plan before hosted execution. If required School B structure or an eligible current placement is absent, report the gap rather than moving existing records or weakening date rules.

## Acceptance matrix

These scenarios are the original design criteria, not a second progress tracker. See [ASSESSMENTS.md](ASSESSMENTS.md) for individual results and outstanding checks.

| ID | Scenario | Expected evidence |
| --- | --- | --- |
| P4-D01 | Assessment uses another school's class/term/assignment or mismatched year/subject | SQL rejects direct and RPC writes; no partial audit/data mutation. |
| P4-D02 | Future planning versus capture; timezone/effective-date boundaries | Planning succeeds within scope, early freeze/capture denied including Admin. |
| P4-D03 | Teacher proposes scale; Admin authorises; scale changed later | Teacher cannot authorise; changed version loses old authorisation; invalid precision/bounds denied. |
| P4-D04 | Freeze, transfer/withdrawal and later enrolment edit | Frozen eligibility retained, late joiner excluded, Admin amendment versioned. |
| P4-D05 | Partial-page save and simultaneous/stale saves | Untouched rows preserved; stale request rejected; no automatic zero. |
| P4-D06 | Missing, absent, exempt and scored zero | Correct distinct states; Missing blocks submission; absent/exempt have no invented percentage. |
| P4-D07 | No reviewer grant, wrong scope, expired/revoked grant, self-review | Denials enforced in SQL; valid self-review audited; open stale form cannot approve. |
| P4-D08 | Approve exact package, edit then publish old approval | Stale publication denied; new review required. Completed approval survives later grant expiry unless invalidated. |
| P4-D09 | Correct learner A with learner B unchanged | A and its dependent outputs hidden atomically; B stays visible; old PDF/HTML/direct Storage denied. |
| P4-D10 | Concurrent correction and report generation/publication; forced transaction failure | No mixed visibility or partially committed correction. Use independent real PostgreSQL sessions, not only one PGlite connection. |
| P4-D11 | Teacher replacement and historical grant | Replacement has no automatic earlier edit right; scoped grant allows only its intended operation/learners. |
| P4-D12 | Student/Guardian, explicit child, revoked grant, multi-role switching | Only permitted published learner data; no staff notes/drafts or teacher-roster-to-child access. |
| P4-D13 | Anonymous, School B and other learner direct reads/writes | Denied across RPC, table access, route and Storage. Hosted evidence separate from mocked/unit checks. |
| P4-D14 | Policy missing, overlaps, approved replacement, unsupported formula | Calculation/publication blocked appropriately; historical policy not silently replaced. |
| P4-D15 | Subject/report review, incomplete mandatory input, changed comment | Output-review grant required; incomplete report blocked; changed version requires fresh approval/publication. |
| P4-D16 | PDF failure/retry, old path, long names and multi-page report | Exact snapshot only; private access; stale artefact never becomes current; layout verified. |
| P4-D17 | Existing portal regression and performance | Mode/child context retained; no assessment history in profile menu; bounded queries; lint/types/full tests/build then scoped browser checks. |

For each implemented slice, record local SQL tests, hosted API/RLS tests and browser evidence separately in VERIFICATION.md. Never turn these design checkboxes into passes merely because a migration applies.

## Remaining gates

Continue from [the current handover](RESUME.md) and the unchecked assessment cases. Approval of the school’s numerical policy and binding it to a newly reviewed package must precede official calculation and publication. Local SQL tests, applied migrations and hosted acceptance are recorded separately in [VERIFICATION.md](VERIFICATION.md).
