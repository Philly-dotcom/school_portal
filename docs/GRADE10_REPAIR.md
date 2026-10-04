# Review the mistaken Grade 10 setup

The user confirmed that the class and academic year labeled “Thapelo” were accidental entries caused by the earlier generic Name labels. Screenshot evidence shows one class under each duplicate grade. Class 10A in 2027 has one enrollment and one teaching assignment; the mistaken class has neither.

Historical operator script: [archived Grade 10 repair](../archive/2026-10/review_grade10_typo.sql). Moved on 4 October without changing its contents. This guide describes the earlier specific repair, not a setup step to repeat. Its regression test still rehearses the archived copy locally.

## Preview first

Run the whole file in the dedicated School Portal SQL editor with its final `ROLLBACK;` unchanged. This exercises the repair and then undoes every change. If it fails, stop and share the error without credentials; do not bypass its guards. If the editor leaves a failed transaction open, run `ROLLBACK;` before another query.

The intended change is:

- Retain grade ID `34144959-154d-403e-b0bb-533a2782bccf` and rename it `Grade 10`.
- Preserve class 10A, its class ID, academic year, enrollment and teaching assignment.
- Remove the other grade (`3aa918e5-6cd0-45ff-a066-dc7fd21ff513`) and its mistaken class/year only when still unused.

The script checks the school and exact grade names, identifies the mistaken year via its class reference, checks all known dependencies (including terms and other classes), and uses no cascading deletes. Foreign keys also reject unexpected remaining references. Locks prevent concurrent writes to the checked tables during the transaction; lock acquisition times out after five seconds rather than waiting indefinitely.

## Apply only after review

After the preview is reviewed and cleanup approved, change only the final `ROLLBACK;` to `COMMIT;` and run the entire file. The committed transaction stores pre-change rows in `private.academic_repair_backups`, inaccessible to application roles, and writes an operator audit event. It refuses a second committed run. Recovery, if needed, should use that snapshot in a reviewed transaction; do not blindly restore into subsequently modified data.

Then run the duplicate preflight again and apply migration 006 if no collisions remain. Refresh Academic setup and verify Grade 10, class 10A and its enrollment/assignment. No hosted repair or migration 006 execution has been performed by the assistant.

## Local validation

Three embedded-PostgreSQL tests execute this exact script with fictional identifiers and a fictional typo label. They verify preview rollback, refusal when a term depends on the mistaken year, committed cleanup with unchanged enrollment/assignment rows, restricted backup access, repeated-run rejection and compatibility with migration 006.
