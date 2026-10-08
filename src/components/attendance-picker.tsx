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
