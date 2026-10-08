"use client";
import { useActionState, useState } from "react";
import { saveAttendance } from "@/app/dashboard/attendance/actions";
import {
  attendanceStatus,
  type AttendanceRegister,
  type AttendanceStaffMode,
  type AttendanceState,
  type AttendanceStatus,
} from "@/lib/attendance-validation";

export function AttendanceForm({
  register,
  mode,
}: {
  register: AttendanceRegister;
  mode: AttendanceStaffMode;
}) {
  const [draft, setDraft] = useState<Record<string, AttendanceStatus | null>>(
    {},
  );
  const [version, setVersion] = useState(register.version);
  const [state, action, pending] = useActionState(
    async (previous: AttendanceState, form: FormData) => {
      const result = await saveAttendance(previous, form);
      if (result.saved && result.version !== undefined) {
        setVersion(result.version);
        setDraft({});
      }
      return result;
    },
    { error: "", saved: false },
  );
  const entries = Object.entries(draft).map(([studentId, status]) => ({
    studentId,
    status,
  }));
  return (
    <form action={action} className="access-form">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="classId" value={register.class_id} />
      <input type="hidden" name="date" value={register.date} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="entries" value={JSON.stringify(entries)} />
      <p className="muted">
        Only marks you change on this page are saved. Unmarked does not mean
        absent.
      </p>
      {!register.can_edit && (
        <p>
          This is a read-only register. Teachers can change today’s attendance
          only.
        </p>
      )}
      <div className="table-wrap">
        <table>
          <caption className="sr-only">
            Attendance for {register.class_label} on {register.date}
          </caption>
          <thead>
            <tr>
              <th>Learner</th>
              <th>Reference</th>
              <th>Attendance</th>
            </tr>
          </thead>
          <tbody>
            {register.rows.map((row) => (
              <tr key={row.student_id}>
                <td>{row.full_name}</td>
                <td>{row.reference}</td>
                <td>
                  {register.can_edit ? (
                    <select
                      aria-label={`Attendance for ${row.full_name} (${row.reference})`}
                      disabled={pending}
                      value={
                        (Object.hasOwn(draft, row.student_id)
                          ? draft[row.student_id]
                          : row.status) ?? ""
                      }
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          [row.student_id]:
                            event.target.value === ""
                              ? null
                              : attendanceStatus.parse(event.target.value),
                        }))
                      }
                    >
                      <option value="">Unmarked</option>
                      {attendanceStatus.options.map((status) => (
                        <option key={status} value={status}>
                          {status[0].toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    (row.status ?? "Unmarked")
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!register.rows.length && (
        <p>No enrolled learners were found on this page for this date.</p>
      )}
      {register.can_edit && (
        <>
          <label>
            Correction reason{" "}
            {register.date < register.today
              ? "(required for an older register)"
              : "(optional)"}
            <textarea
              name="reason"
              maxLength={500}
              required={register.date < register.today}
              disabled={pending}
            />
          </label>
          <button
            className="button primary"
            disabled={pending || entries.length === 0}
          >
            {pending ? "Saving…" : "Save changed marks"}
          </button>
        </>
      )}
      {state.error && (
        <p role="alert" className="error-message">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p role="status" className="success-message">
          Attendance saved.
        </p>
      )}
      {state.error && (
        <button
          type="button"
          className="button secondary"
          onClick={() => window.location.reload()}
        >
          Reload register (discard unsaved marks)
        </button>
      )}
    </form>
  );
}
