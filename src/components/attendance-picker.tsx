"use client";
import { RecordSearchSelect } from "@/components/record-search-select";
import { searchAttendanceClasses } from "@/app/dashboard/attendance/search-actions";
import type { AttendanceStaffMode } from "@/lib/attendance-validation";
import type { RecordChoice } from "@/lib/record-search";

export function AttendancePicker({
  mode,
  date,
  today,
  initialChoice,
}: {
  mode: AttendanceStaffMode;
  date: string;
  today: string;
  initialChoice: RecordChoice | null;
}) {
  return (
    <form method="get" action="/dashboard" className="access-form">
      <input type="hidden" name="view" value="attendance" />
      <input type="hidden" name="mode" value={mode} />
      <RecordSearchSelect
        kind="classes"
        name="attendanceClass"
        label="Class"
        initialChoice={initialChoice}
        searchAction={(query, page) =>
          searchAttendanceClasses(mode, query, page)
        }
      />
      <p className="small muted">
        {mode === "teacher"
          ? "Only classes covered by a current teaching assignment are listed. If no classes match, check the search and ask School Admin to check your assignment dates. Future assignments do not allow attendance today."
          : "Classes may belong to past, current or future years. The register date must fall within the class's academic year and cannot be in the future."}
      </p>
      <label>
        Register date
        <input
          type="date"
          name="attendanceDate"
          defaultValue={date}
          max={today}
          required
        />
      </label>
      <button className="button secondary">Open register</button>
    </form>
  );
}
