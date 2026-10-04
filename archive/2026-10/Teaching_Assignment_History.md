# Teaching Assignment History

This migration upgrades the `teaching_assignments` table from a simple current-state record into a **history-aware and concurrency-safe teaching assignment system**. See `supabase/migrations/202610040014_teaching_assignment_lifecycle.sql` for migration code

The goal is to preserve assignment history, prevent overlapping teaching periods, safely handle teacher replacements, and ensure all lifecycle changes are auditable.

---

## Overview

Previously, a teaching assignment could be treated as a single record that was directly updated when a teacher stopped teaching a class or was replaced.

That approach risks losing historical information.

This migration changes the model so that teaching assignments are preserved over time.

Instead of overwriting an old assignment:

- the existing assignment is closed;
- its original history remains available;
- a replacement assignment is created when necessary;
- every lifecycle change is recorded in the audit log.

Example:

```text
15 Jan 2026 ───────────── 30 Jun 2026
Teacher A
Mathematics
Grade 8A
closure = replace

                           1 Jul 2026 ───────────── 10 Dec 2026
                           Teacher B
                           Mathematics
                           Grade 8A
```

This makes it possible to determine who taught a specific class at any point during the academic year.

---

# Database Changes

## New Columns

Two columns are added to:

```sql
public.teaching_assignments
```

### `record_version`

```sql
record_version integer not null default 1
```

Used for optimistic concurrency control.

Every lifecycle change increments the version.

Example:

```text
Initial assignment:
record_version = 1

After assignment change:
record_version = 2
```

Clients must provide the version they originally loaded when attempting to modify an assignment.

If the database version has changed in the meantime, the operation is rejected.

This prevents one administrator from accidentally overwriting changes made by another administrator.

---

### `closure`

```sql
closure text
```

Allowed values:

```text
end
replace
NULL
```

Meaning:

| Value | Meaning |
|---|---|
| `NULL` | Assignment has not been formally closed |
| `end` | Teaching assignment ended |
| `replace` | Teacher was replaced by another teacher |

---

# Historical Assignments

The previous unique constraint:

```text
teacher_id + subject_id + class_id
```

is removed.

This allows multiple historical records for the same teacher, subject and class, provided their date ranges do not overlap.

For example:

```text
Teacher A
Mathematics
Grade 8A
15 Jan → 30 Jun
```

and:

```text
Teacher A
Mathematics
Grade 8A
01 Aug → 10 Dec
```

can both exist.

The system now relies on date-range validation instead of permanent uniqueness.

---

# Teaching Assignment Guard

The migration introduces:

```sql
private.guard_teaching_history()
```

This trigger function runs before every:

```text
INSERT
UPDATE
```

on:

```sql
public.teaching_assignments
```

Its purpose is to protect teaching assignment integrity at the database level.

---

## Admin Validation

Authenticated users must be administrators of the affected school.

If not, PostgreSQL raises:

```text
Admin required
```

with error code:

```text
42501
```

The permission is checked both before and after acquiring the school lock.

---

# Concurrency Protection

Before validating or changing an assignment, the system locks the associated school record:

```sql
SELECT ...
FROM public.schools
FOR UPDATE;
```

This serializes teaching-assignment changes for the same school.

It prevents race conditions such as two administrators simultaneously creating overlapping assignments.

Without locking:

```text
Admin A checks → no conflict
Admin B checks → no conflict

Admin A saves
Admin B saves

Result → conflicting assignments
```

With the school lock:

```text
Admin A obtains lock

Admin B waits

Admin A validates and commits

Admin B continues
Admin B now detects the conflict
```

---

# Academic Year Validation

Every teaching assignment must have valid dates.

The database rejects assignments where:

```text
starts_on is NULL

ends_on is NULL

starts_on > ends_on
```

Infinite PostgreSQL dates are also rejected.

The assignment must also fit completely within its associated academic year.

Example:

Academic year:

```text
15 Jan 2026 → 10 Dec 2026
```

Valid assignment:

```text
01 Feb 2026 → 30 Jun 2026
```

Invalid assignment:

```text
01 Jan 2026 → 30 Jun 2026
```

The invalid assignment begins before the academic year.

The database raises:

```text
Assignment must fit within its academic year
```

---

# Overlap Protection

The system prevents overlapping assignments for the same:

```text
school
teacher
subject
class
```

Example existing assignment:

```text
Teacher A
Mathematics
Grade 8A
01 Jan → 30 Jun
```

This assignment would be rejected:

```text
Teacher A
Mathematics
Grade 8A
15 Jun → 30 Nov
```

because the periods overlap.

This assignment is allowed:

```text
Teacher A
Mathematics
Grade 8A
01 Jul → 30 Nov
```

The overlap check uses inclusive date ranges:

```sql
existing.starts_on <= new.ends_on
AND
new.starts_on <= existing.ends_on
```

If an overlap is found, PostgreSQL raises:

```text
Teaching assignment dates overlap
```

---

# Timetable Protection

Existing timetable lessons must remain inside their associated teaching assignment period.

Suppose an assignment covers:

```text
01 Jan → 30 Jun
```

and a timetable lesson exists on:

```text
25 Jun
```

Attempting to shorten the assignment to:

```text
01 Jan → 20 Jun
```

will be rejected.

The database raises:

```text
Existing lessons extend beyond the assignment
```

This prevents timetable lessons from referencing a teaching assignment that was no longer active at the lesson date.

---

# Changing an Assignment

Teaching assignment lifecycle changes are handled through:

```sql
public.change_teaching_assignment(...)
```

Function signature:

```sql
change_teaching_assignment(
    target_school uuid,
    target_assignment uuid,
    expected_version integer,
    change_kind text,
    change_date date,
    replacement_teacher uuid default null
)
```

Supported actions:

```text
end
replace
```

Direct lifecycle changes should not be performed using arbitrary `UPDATE` or `DELETE` operations.

---

# Ending an Assignment

Use:

```text
change_kind = 'end'
```

Example:

Existing assignment:

```text
Teacher: Mr Dlamini
Subject: Mathematics
Class: Grade 8A
Period: 15 Jan → 10 Dec
record_version: 1
```

Request:

```sql
change_teaching_assignment(
    school_id,
    assignment_id,
    1,
    'end',
    '2026-06-30',
    NULL
);
```

Result:

```text
Teacher: Mr Dlamini
Subject: Mathematics
Class: Grade 8A
Period: 15 Jan → 30 Jun
closure: end
record_version: 2
```

No replacement assignment is created.

---

# Replacing a Teacher

Use:

```text
change_kind = 'replace'
```

Example:

Teacher A currently teaches:

```text
Mathematics
Grade 8A
15 Jan → 10 Dec
```

Teacher B takes over on:

```text
01 Jul
```

The system closes the previous record:

```text
Teacher A
15 Jan → 30 Jun
closure = replace
```

and creates a new assignment:

```text
Teacher B
01 Jul → 10 Dec
closure = NULL
```

The old assignment ends one day before the replacement begins.

This guarantees that the two date ranges do not overlap.

---

# Replacement Validation

A replacement request is rejected if:

- the replacement date is on or before the original assignment start date;
- no replacement teacher is supplied;
- the replacement teacher is the same teacher;
- the replacement teacher does not belong to the same school.

Example error:

```text
Choose another school teacher and a later start date
```

---

# Optimistic Concurrency

The `expected_version` parameter protects against stale updates.

Example:

Two administrators open:

```text
record_version = 3
```

Administrator A changes the assignment.

The database updates it to:

```text
record_version = 4
```

Administrator B then submits their older form with:

```text
expected_version = 3
```

The function compares:

```text
expected version = 3
current version  = 4
```

and rejects the request with:

```text
Assignment changed; reload
```

This prevents accidental overwriting of newer changes.

---

# Audit Logging

Every successful lifecycle change creates a record in:

```sql
public.audit_events
```

The audit entry includes:

- school;
- user who performed the change;
- action performed;
- original assignment ID;
- previous assignment state;
- change date;
- replacement teacher;
- newly created replacement assignment ID.

Example action values:

```text
teaching_assignments.end

teaching_assignments.replace
```

Example audit details:

```json
{
  "before": {
    "teacher_id": "...",
    "subject_id": "...",
    "class_id": "...",
    "starts_on": "2026-01-15",
    "ends_on": "2026-12-10",
    "record_version": 1
  },
  "change_date": "2026-07-01",
  "replacement_teacher": "...",
  "replacement_id": "..."
}
```

This provides a complete history of important teaching-assignment changes.

---

# Security Model

The change function is defined as:

```sql
SECURITY DEFINER
```

The function itself performs explicit school-admin checks.

Execution is removed from:

```text
public
anon
```

and granted to:

```text
authenticated
```

However, being authenticated alone is not sufficient.

The user must also pass:

```sql
private.is_school_admin(target_school)
```

Existing Row Level Security policies remain in place.

---

# Application Usage

Applications should treat teaching assignments as historical records.

Do not replace teachers by directly changing:

```sql
teacher_id
```

and do not delete historical assignments simply because they are no longer active.

Instead use:

```sql
public.change_teaching_assignment(...)
```

for assignment lifecycle changes.

---

# Recommended Application Flow

When loading an assignment, retrieve:

```text
id
school_id
teacher_id
subject_id
class_id
academic_year_id
starts_on
ends_on
record_version
closure
```

When the user selects:

```text
End Assignment
```

call:

```text
change_teaching_assignment(
    assignment.school_id,
    assignment.id,
    assignment.record_version,
    'end',
    selected_date,
    NULL
)
```

When the user selects:

```text
Replace Teacher
```

call:

```text
change_teaching_assignment(
    assignment.school_id,
    assignment.id,
    assignment.record_version,
    'replace',
    selected_start_date,
    replacement_teacher_id
)
```

If the function returns:

```text
Assignment changed; reload
```

the frontend should refresh the assignment and ask the administrator to review the latest version.

---

# Lifecycle

A teaching assignment now follows this general lifecycle:

```text
Assignment created
       |
       v
Active assignment
       |
       +-------------------+
       |                   |
       v                   v
      END               REPLACE
       |                   |
       v                   v
Historical record      Old record closed
                           |
                           v
                    Replacement created
                           |
                           v
                    New active assignment
```

---

# Integrity Rules

The database guarantees that:

1. Teaching assignment dates are valid.

2. Assignments remain inside their academic year.

3. Equivalent teacher/subject/class assignments cannot overlap.

4. Existing timetable lessons cannot exist outside the assignment period.

5. Teacher replacements preserve the original assignment history.

6. Replacement teachers belong to the same school.

7. Concurrent administrative changes cannot silently overwrite each other.

8. Lifecycle changes are recorded in the audit log.

9. Closed historical assignments remain available for reporting and historical queries.

---

# Why This Design Exists

Teaching assignments are historical school records.

The system may later need to answer questions such as:

```text
Who currently teaches Grade 9 Mathematics?
```

but also:

```text
Who taught Grade 9 Mathematics during Term 2?
```

or:

```text
When did Teacher B replace Teacher A?
```

Overwriting the current assignment would make those historical questions difficult or impossible to answer reliably.

By preserving assignment periods and lifecycle events, the database becomes suitable for:

- historical reporting;
- timetable integrity;
- audit trails;
- teacher replacement workflows;
- academic-year reporting;
- administrative accountability.

---

# Migration Transaction

The entire migration runs inside:

```sql
BEGIN;
...
COMMIT;
```

This ensures the schema and function changes are applied as a single transaction.

If an error occurs before `COMMIT`, PostgreSQL can roll back the migration instead of leaving the teaching-assignment system partially upgraded.

---

## Summary

This migration changes `teaching_assignments` from a simple editable table into a controlled historical record system.

The key design principle is:

> Do not erase teaching history. Close the previous assignment, preserve it, and create the next assignment when necessary.

This gives the school portal stronger data integrity, safer concurrent administration, reliable timetable relationships, and a complete historical audit trail.