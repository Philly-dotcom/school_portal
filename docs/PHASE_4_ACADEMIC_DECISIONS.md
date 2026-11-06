# Phase 4 — Academic Performance Decisions

**School Portal · Decision record · Reconciled 29 October 2026**

Based on the decision report supplied by the user. The source in Downloads is unchanged. Section 10 records the workflow details finalised at the user's request on 29 October. This is a planning contract, not evidence of implemented permissions or database behaviour.

This document completes the policy decisions left open in `PHASE_4_PLAN.md`. It is meant to sit alongside the existing Codex plan, not replace it. It does not prescribe files, migrations, work stages or tests.

The decisions below preserve the rules already agreed in the Phase 4 plan: the portal keeps its four existing account roles; reviewing marks requires a separate, explicitly granted permission; an authorised reviewer may review their own work; only School Admin may publish; and changing an approved mark requires another review. If the changed mark was published, the affected result and anything derived from that version must stop being presented as current immediately. The old version stays in the staff audit history.

The portal is being designed for South African schools. **This document does not invent CAPS weightings, promotion thresholds or other statutory grading formulas.** Those numerical rules must be entered from the school's applicable, approved assessment policy before the system calculates or publishes an official result. This is a deliberate decision, not a missing software default.

## 1. Grades covered and grading policy

**Decision:** The underlying model will support Grades R–12, but the first implementation is only allowed to calculate and publish for a grade/subject/year combination that has an explicitly approved grading policy. There is no universal formula for all grades or subjects.

Each policy belongs to the school and has a defined academic year, applicable grade or phase, subject where appropriate, effective period and version. It records the accepted assessment categories, mark scale and precision, permitted calculation methods, rounding, achievement bands and any policy-specific conditions. A policy may be copied into a new year for review, but changes to the copy do not rewrite historical results.

Teachers can capture raw results only against an assessment with an authorised scale. A mark cannot exceed the assessment maximum, fall below the permitted minimum or use unsupported precision. The portal should distinguish a **raw mark** (for example, 32 out of 40) from its percentage (80%) and from an official weighted result. These are not interchangeable.

A change to a grading policy creates a new controlled version. Already published academic records continue to identify the exact policy version used to calculate them; any re-calculation or correction must be deliberate and audited. Where no approved policy exists, the UI should explain that results can be prepared but official calculations and publication are unavailable.

## 2. Term and annual weighting

**Decision:** Term and annual calculations will use explicit, versioned weighting rules. The portal will not assume that assessments carry equal weight or that four terms are simply averaged.

Weighting is defined by the approved policy for the relevant grade, subject and year. Where applicable, the policy must identify which assessment categories contribute to a term result, which term or year components contribute to an annual result, and how exclusions or replacements affect the calculation. The relevant weights must pass validation before a result can be finalised. Totals are calculated on the server/database side using decimal-safe arithmetic; rounding is applied at the policy-defined stage rather than after every intermediate step by guesswork.

A term is an existing academic-period record, not a calculation rule. The first term report may be issued only when the corresponding term policy has been approved. The annual report may be issued only when the annual policy and its required component results are complete. **Promotion decisions will not be inferred from a percentage alone**; they require separately approved promotion rules and should not be treated as part of the first marks-entry feature.

**Value still to be supplied by the school:** the actual assessment weights, term/year formulas, rounding precision and promotion criteria for each applicable policy. Codex must not substitute example percentages for these values.

## 3. Missing, absent, exempt and zero marks

**Decision:** Every learner-assessment entry will have a distinct score state. No recorded score is not the same as a recorded zero.

| State | Meaning | Treatment |
| --- | --- | --- |
| **Missing / not captured** | No mark or final assessment disposition has been recorded. | Do not assume zero; block submission, approval and publication until resolved to a valid score or an authorised non-score disposition. |
| **Absent** | The learner did not attend or complete the assessment. | Record the absence separately, including any authorised resolution; do not silently award zero. |
| **Exempt** | The learner has an approved exemption under the applicable policy. | Require an authorised reason and apply the policy's explicit exclusion or substitution rule. |
| **Scored, including zero** | A valid mark was entered and may be `0` within the assessment scale. | Include the actual score in calculations as the policy directs. |

Draft entry may remain incomplete. Before submitting a roster for review, every eligible learner must have either a valid score or a clearly identified non-score state. A roster with unresolved **Missing** entries is not ready for approval or publication. **Absent** and **Exempt** entries may be reviewed, but their impact on a final term or annual calculation depends on the approved school policy. If that rule is not configured, the official calculation remains unavailable.

An absence, exemption or change from one state to another is treated as a recorded result change, with an actor, reason where required, and version history. A teacher should never be able to turn an outstanding mark into a zero automatically through a bulk-save action.

## 4. Reviewer scope and assignment

**Decision:** School Admin will issue explicit, school-scoped reviewer grants for a defined academic year, term, class and subject. A grant can specify its validity dates and can be revoked at any time.

Reviewer permission is **not a new account role** and does not follow automatically from being a teacher. The user must already have an active Teacher or School Admin role and an appropriate reviewer grant for the submitted assessment. Self-review is allowed, but both the person who entered a version and the person who reviewed it must be recorded, even if those are the same user.

Permissions are checked again when the reviewer opens a batch and when an approval or return decision is saved. Grant expiry or revocation takes effect immediately: a reviewer cannot approve an already-open pending batch after losing permission. The pending batch remains pending and can be assigned to another authorised reviewer; it is not approved or discarded automatically. Grants cannot give access across school boundaries.

School Admin remains the **only publisher**. A reviewer approval indicates that a specific version was accepted for publication; it is not itself publication.

## 5. Review and publication unit

**Decision:** A complete **assessment roster** is the primary unit submitted for review. It contains the results and explicit non-score states for eligible learners in one class, subject, term and assessment. An individual learner's result remains separately versioned so corrections can be traced precisely.

A teacher saves draft results in bounded pages without overwriting untouched learners, then submits the roster as one review package. The reviewer approves that exact submitted roster version or returns it with a reason. Editing anything in a submitted roster creates a new version requiring fresh review. Approving a stale version is not allowed.

After approval, School Admin deliberately publishes the approved roster version. Publication creates learner-visible records only for results eligible for release under the completeness policy. An approved roster can still be unpublished until Admin takes that action.

For a later correction to one published learner result, **only the changed learner result and summaries or reports that actually depend on it must be hidden or marked superseded immediately**. Unchanged, independently valid published learner results from the same roster remain visible. The corrected result requires a new version, another authorised review and an explicit Admin publication. The system must be able to identify these dependencies precisely; it must not accidentally withdraw unrelated learners' results.

Subject-term finalisation is a separate step after the required assessment rosters have been approved and published. An official term report is a further, versioned publication, not just a live calculation of whichever marks happen to be present.

## 6. Historical eligibility

**Decision:** Eligible learners are determined using the **assessment's effective date**, and their relevant enrolment/placement reference is retained with the assessment roster. Today's class membership must never redefine who belonged to an earlier assessment.

If a learner transfers classes after the assessment date, their earlier result remains linked to the original assessment and historical placement. A newly transferred learner does not automatically inherit assessments from a class they did not attend on the assessment date. Withdrawal likewise does not erase historical results; visibility continues to depend on permitted learner access and report-publication state.

Teaching responsibility is also historically grounded. The original teacher's assignment and the identity of the person who entered each mark are retained. A replacement teacher does not gain blanket editing rights to an earlier teacher's approved marks merely because they now teach the class. Historical corrections require explicit assignment/permission and the normal review and publication workflow.

Where a real assessment covers a period rather than one day, School Admin must choose and record its effective eligibility date when creating the assessment; it cannot be changed silently after marks exist. Exceptions, such as a learner completing an assessment after a transfer, require an explicit, auditable school decision rather than a guessed roster rule.

## 7. Report layout and visibility

**Decision:** The portal will support both **published individual assessment results** and **official term/annual report cards**, but they are distinct learner-facing outputs with separate publication status.

A report should identify the school, learner, academic year, reporting period, relevant grade/class, subjects, published results and achievement levels where the approved policy defines them. It should show the report's issue date and revision/version. The layout will allow a school logo and structured teacher/principal comments and signature fields where the school uses them; a signature label must not imply that someone actually signed or approved the report.

Teacher/reviewer draft notes are staff-only. Students may read only their own published results and reports. Guardians may read published results and reports **only for a learner they have explicitly been granted access to**, following the existing selected-child rules. Neither role can see drafts, pending approvals, staff-only correction notes or results withdrawn from current visibility.

The official report is a snapshot of the approved and published inputs and the grading policy version used. Its content must not change silently after issuance. It should first be rendered as a private, authenticated HTML view; a PDF can represent that same approved version. Report PDFs are **personal records**, not entries in the existing current-class Documents library. Access to a new download is checked each time. Previously downloaded copies cannot be recalled, so a superseded version must be clearly identified and no longer served as the current report.

**Layout details to confirm with the school before the final report template is approved:** logo and header wording, required comment and signature fields, subject ordering, local report terminology, and exactly which school approval labels appear. These are presentation inputs, not permission to change the academic rules.

## 8. Publication completeness

**Decision:** Draft work can be incomplete; approval and official publication cannot silently treat incomplete data as a finished academic record.

An assessment roster is eligible for review only when every learner in its frozen eligible roster has a scored, absent or exempt state. A **Missing** state remains unresolved and blocks approval/publication of that roster. Absent and exempt states are permissible as recorded dispositions, but an official calculated result may proceed only when the relevant school policy says how they are handled. Otherwise, Admin must resolve the exception first.

School Admin may publish an approved assessment roster while displaying a learner's recorded **Absent** or **Exempt** state instead of a numeric result, provided the assessment's reporting rules allow it. There must be no generated percentage for a non-score state unless the approved policy explicitly provides one.

An official subject-term result requires every assessment component mandated by the approved term policy to be accounted for and calculated correctly. An official term or annual report must not be issued as complete when a mandatory subject or component remains unresolved. The portal may show an explicit **incomplete / not yet issued** status internally or to the learner as appropriate, but it must not present a partial draft as an official report.

There is no general-purpose button for Admin to bypass missing-mark requirements. Exceptions must be one of the types permitted by the approved policy, recorded with a reason and tied to the affected learner/assessment.

## 9. Withdrawal and correction

**Decision:** Published results and reports are versioned records. They can be corrected or withdrawn through a deliberate, auditable staff workflow, not silently overwritten or deleted.

A correction request records the affected assessment/learner/result, the original published version, the proposed new mark or state, the initiating user, the date and a clear reason. If the result was already published, its current learner-facing visibility—and that of dependent published summaries and reports—must be invalidated **in the same atomic transaction as the correction begins**. Keeping the old mark in an audit table does not make it valid to keep showing it as current.

The corrected version returns to review. Only an authorised reviewer can approve that exact new version, including self-review where properly granted. Only School Admin can publish it again. Dependent summaries must be recalculated, and affected report cards must receive newly approved/published versions rather than reusing an old PDF.

Withdrawal without an immediate replacement also requires an authorised reason and an actor/timestamp record. It must remove current learner-facing access to the withdrawn result and dependent current report versions while preserving the complete staff audit trail. Where the portal shows a learner-facing explanation, use neutral wording such as **“This result is temporarily unavailable while the school reviews it.”** Do not disclose internal staff allegations, sensitive reasons or the earlier score as if it remains official.

Every save, review, publish, withdraw and correction operation must reject stale versions and recheck current permissions. A failed operation must not leave a result hidden while its dependent report remains downloadable, or vice versa.

---

**Boundary of this decision record:** These are the agreed product-policy defaults for Phase 4, subject to the school's actual approved numerical grading policies and final report presentation details. They do not change the existing Phase 4 implementation plan, the four account roles, earlier migrations or the allocation of Finance to Phase 5 and AI/automation/session controls to Phase 6.


## 10. Final workflow details and permission matrix — 29 October 2026

These decisions complete the workflow questions raised during review. They refine Sections 1–9 and the implementation plan; they do not introduce another account role or authorise development today. The school must still supply the numerical policies and final report presentation inputs listed below.

### Permission rules

Every action requires a server-verified identity, active membership in the same school and the relevant existing role. A workspace switch never grants permission. A reviewer grant gives scoped review access, not mark-entry, correction, withdrawal or publication authority. Admins also need an explicit reviewer grant to review marks.

| Action | School Admin | Teacher | Student | Guardian |
| --- | --- | --- | --- | --- |
| Create/edit draft grading policies; authorise assessment scales | Yes, school-scoped and audited | Read applicable approved policy; cannot approve or alter it | No staff policy access | No staff policy access |
| Approve/retire grading policy versions | Yes; record source policy reference, actor and effective scope | No | No | No |
| Issue/revoke reviewer or historical-correction grants | Yes; may grant self-review explicitly | No | No | No |
| Plan/edit an unfrozen assessment | Yes | Only within the teacher's dated class/subject assignment | No | No |
| Freeze the initial assessment roster | Yes | Only within current entry authority described below | No | No |
| Amend a frozen roster, eligibility date or assessment scale | Admin-controlled amendment with reason and impact review | Request amendment; cannot apply it | No | No |
| Enter/save draft marks and submit a complete roster | Yes | Current entry authority or an explicit historical-correction grant | No | No |
| Read submitted work; approve or return it | Explicit matching reviewer grant required | Explicit matching reviewer grant required | No | No |
| Initiate a correction to an approved/published result | Yes, with reason | Current entry authority or an explicit historical-correction grant; reason required | No | No |
| Withdraw publication without a replacement | Yes, with reason and dependency invalidation | No; raise the issue with Admin | No | No |
| Publish/re-publish assessment results | Yes, only the exact approved and currently valid version | No | No | No |
| Prepare subject-term results and report snapshots | Yes, using approved policies and published inputs | No report issuance authority; may supply permitted draft subject comments | No | No |
| Review a complete subject-term result or report snapshot | Yes, with a separate explicit output-review grant | No in the first implementation | No | No |
| Publish/re-publish subject-term results or report cards | Yes, after version-specific output review | No | No | No |
| Read staff drafts/history | School-scoped | Only entry, correction or review scope; no school-wide access | No | No |
| Read/download learner-facing results and reports | School-scoped | Only permitted staff scope | Own currently published records | Selected learner with a current explicit access grant |

An output-review grant is a permission for an existing Admin membership scoped to the academic year, reporting period and class. It is distinct from an assessment reviewer grant, and does not bypass publication checks. Self-review remains allowed and recorded. This keeps whole-report review simple for Version 1 without giving a subject teacher access to unrelated subjects. Admin may enter draft principal/general comments; a teacher may enter draft subject comments only within their permitted subject scope. Report content changes invalidate its review.

### Teacher entry and historical correction authority

Ordinary teacher entry requires the teacher's retained assessment assignment to cover the assessment effective date and still provide current class/subject access on the school-local date of the request. This permits future assessment planning when an assignment covers the planned date, but does not permit future mark entry: capture cannot begin before the assessment effective date. Admin follows the same date and score-validity rules for mark entry.

Once that assignment ends, authorship alone grants no further editing rights. Admin can issue an explicit historical-correction grant to an active teacher for a named assessment and, where appropriate, a named learner. Record the reason, validity dates, issuer and revocation. This grant permits the scoped historical entry/correction and submission only; it does not grant review or publication. Replacement teachers need this grant to edit earlier work. Permission is checked again on every save; expiry/revocation blocks already-open forms too.

### Roster freeze and amendment

1. While an assessment is planned, show an eligibility preview from dated enrolments. Label it as a preview, not a frozen or final roster. Future-year planning does not require a completed class list today.
2. At or after the assessment effective date, an authorised staff member explicitly freezes the roster before entering marks. Retain each learner, enrolment/placement reference, effective date and responsible teaching assignment. Freeze and capture must not silently happen on a page read.
3. Frozen membership does not change when enrolments are later edited or learners transfer. Reject ambiguous overlapping placements for resolution rather than choosing one arbitrarily.
4. A frozen-roster amendment is Admin-only and requires a reason, affected-learner preview and a new roster version. Keep removed entries and their history. Revalidate eligibility and scale; never truncate marks automatically.
5. An amendment invalidates pending approval of the changed package. If it changes a published learner result, its eligibility or interpretation, invalidate that result and dependent publications atomically. Preserve unrelated valid publications. New eligible learners begin Missing and block the amended package until resolved.

### Complete review packages and targeted corrections

The first submission contains the complete frozen roster, its result-version references, assessment definition/scale version and relevant policy version. Missing blocks submission as well as approval and publication. There is no missing-mark override: an approved exception must first be recorded as a permitted non-score disposition with its reason and authority.

A correction produces a new complete roster review package with an explicit list of changed learner versions. The reviewer sees the roster and change summary; approval binds to this exact package. Unchanged published learner versions stay visible while the changed versions are reviewed. Publication releases the changed eligible versions; it does not silently replace or withdraw unchanged ones.

A result cannot be published from an obsolete package. Return, correction, definition change and invalidation advance the expected version. Concurrent staff actions must fail cleanly rather than overwrite another save. Bounded-page saves update only the named rows and reject stale expected versions.

### Correction initiation and withdrawal

Opening a correction form or reporting a suspected mistake does not change publication. The authorised, deliberate **Begin correction** action, with a reason and expected version, creates the correction record/draft and invalidates affected current visibility in one transaction. Leaving that draft unfinished does not restore the previous result automatically. Any restoration requires fresh review and deliberate Admin publication.

Withdrawal without replacement is Admin-only and records the reason, actor, timestamp and original published version. A teacher can raise an issue with Admin without acquiring withdrawal authority. Learner-facing wording stays neutral; staff reasons and previous withdrawn scores are not exposed.

### Approval validity after permission changes

A review is valid only if the grant and membership were valid when the decision was saved. Later expiry, role removal or grant revocation blocks new reviews but does not erase or automatically invalidate a completed approval. Admin may publish against that recorded approval if the package, policies and inputs remain valid. Publication still checks the publisher's current authority.

If an approval itself is disputed, Admin must explicitly invalidate it with a reason. Invalidate dependent current publication atomically where applicable and require another review. Never change the original approval record to pretend the earlier decision did not happen.

### Policy and report approval

Admin records and approves the school's supplied grading policy; the software does not establish that the policy is legally correct. Keep its source/reference and scope. A draft or copied policy has no approval by inheritance. Self-approval is allowed and audited. At most one approved policy may resolve a given grade/subject/year/effective-date calculation context; ambiguous overlap blocks calculation rather than selecting an arbitrary policy.

Raw entry requires an Admin-authorised assessment scale even if the wider grading policy is still awaiting approval. Official publication, including raw assessment release, requires the applicable approved reporting policy. A newly approved policy does not rewrite earlier publications; deliberate adoption/recalculation identifies and invalidates the affected versions.

Use a limited set of supported calculation methods with validated configuration and decimal-safe arithmetic. No arbitrary executable formulas or universal CAPS defaults. Unsupported school rules block the dependent calculation until deliberately implemented and tested.

Subject-term outputs and term/annual reports have their own draft, reviewed and published versions. An explicitly output-authorised Admin reviews the complete snapshot, completeness, calculations, comments and policy/source versions; School Admin then deliberately publishes. Those may be the same person, but remain separate recorded actions. Approval never implies a handwritten or digital signature.

A changed input invalidates all current dependent outputs, including HTML, summaries and PDF download access, in the same database transaction. Keep dependency references even where the resulting number happens not to change. Unrelated learners' outputs remain valid. Recalculation and PDF creation can occur later, but the old artifact must already be inaccessible to learner downloads. A failed calculation or PDF job cannot restore visibility. Historical artifacts remain staff-only within authorised scope.

### What is still required from the school

Grade 10 Mathematics for 2027 is the proposed pilot. The applicable programme, calculation rules and worked examples are being researched with a teacher. Record the year and source of each answer before using it to draft a school policy for approval. Use the [teacher questionnaire](TEACHER_REPORTING_POLICY_QUESTIONS.md) for that conversation.

- The first grade/subject/year policy to implement: approved scales, assessment categories, weights/formulas, rounding and precision, bands, absent/exempt resolution, replacement/exclusion rules and required components.
- Any promotion rules, before promotion is implemented or inferred. A percentage alone is insufficient.
- Final report header/logo, subject order, required comments, signature presentation and approval labels.

The permissions and workflow above are settled planning decisions. Numerical policy values and final report presentation are still outstanding. Schema relationships, migrations and tests remain implementation-design work; nothing in this document means they already exist.
