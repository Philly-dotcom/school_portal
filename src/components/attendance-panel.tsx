import Link from "next/link";
import { z } from "zod";
import { getSchoolContext } from "@/lib/auth-context";
import { loadPortalActor } from "@/lib/portal-data";
import {
  availablePortalModes,
  portalModeSchema,
  selectedChildSchema,
} from "@/lib/portal-validation";
import {
  loadAttendanceRegister,
  loadMyAttendance,
} from "@/lib/attendance-data";
import { attendanceHref } from "@/lib/attendance-validation";
import { schoolDate } from "@/lib/school-date";
import { maxListPage } from "@/lib/list-pagination";
import { AttendancePicker } from "@/components/attendance-picker";
import { AttendanceForm } from "@/components/attendance-form";
import { ChildSelector } from "@/components/child-selector";
import { RoleOverview } from "@/components/role-overview";

export type AttendanceParams = {
  mode?: string | string[];
  child?: string | string[];
  attendanceClass?: string | string[];
  attendanceDate?: string | string[];
  attendancePage?: string | string[];
};

export async function AttendancePanel({
  params,
}: {
  params: AttendanceParams;
}) {
  const context = await getSchoolContext();
  if (context.status !== "ready")
    return <p role="alert">Attendance access could not be verified.</p>;
  const modes = availablePortalModes(context.roles);
  const mode =
    params.mode ??
    (context.roles.includes("school_admin") ? "school_admin" : modes[0]);
  const unavailable = (
    <p role="alert">
      This attendance view is unavailable. Check your role and selected learner.
    </p>
  );
  if (
    typeof mode !== "string" ||
    !context.roles.includes(mode as (typeof context.roles)[number])
  )
    return unavailable;

  if (mode === "school_admin" || mode === "teacher") {
    if (params.child !== undefined) return unavailable;
    const today = schoolDate(context.school.timezone);
    const date = z.iso.date().safeParse(params.attendanceDate ?? today);
    const classId =
      params.attendanceClass === undefined
        ? undefined
        : z.uuid().safeParse(params.attendanceClass);
    if (!date.success || (classId && !classId.success))
      return <p role="alert">Choose a valid register date and class.</p>;
    const register = classId?.success
      ? await loadAttendanceRegister(
          context.school.id,
          mode,
          classId.data,
          date.data,
          params.attendancePage,
        )
      : null;
    return (
      <section className="content-panel">
        <h2>Daily class attendance</h2>
        <p className="muted">
          Teachers mark today’s register and may read history covered by their
          current assignment. School Admin can correct older registers with a
          reason.
        </p>
        <AttendancePicker
          key={`${mode}-${classId?.success ? classId.data : ""}-${date.data}`}
          mode={mode}
          date={date.data}
          today={today}
          initialChoice={
            register
              ? { id: register.class_id, label: register.class_label }
              : null
          }
        />
        {classId?.success && !register && (
          <p role="alert">
            The register could not be loaded. Check your assignment, the date
            and school access, then try again.
          </p>
        )}
        {register && (
          <>
            <h3 style={{ marginTop: 24 }}>
              {register.class_label} · {register.date}
            </h3>
            <AttendanceForm
              key={`${mode}-${register.class_id}-${register.date}-${register.page}`}
              register={register}
              mode={mode}
            />
            <nav aria-label="Attendance pages" className="flex flex-wrap gap-3">
              {register.page > 1 && (
                <Link
                  href={attendanceHref(mode, {
                    classId: register.class_id,
                    date: register.date,
                    page: register.page - 1,
                  })}
                >
                  Previous
                </Link>
              )}
              <span>
                Page {register.page} · save changes before changing pages
              </span>
              {register.has_next && register.page < maxListPage && (
                <Link
                  href={attendanceHref(mode, {
                    classId: register.class_id,
                    date: register.date,
                    page: register.page + 1,
                  })}
                >
                  Next
                </Link>
              )}
            </nav>
          </>
        )}
      </section>
    );
  }

  const parsedMode = portalModeSchema.safeParse(mode);
  const child =
    params.child === undefined
      ? undefined
      : selectedChildSchema.safeParse(params.child);
  if (!parsedMode.success || (child && !child.success)) return unavailable;
  const actor = await loadPortalActor(
    parsedMode.data,
    child?.success ? child.data : undefined,
  );
  if (actor.status !== "ready")
    return <RoleOverview actor={actor} availableModes={modes} />;
  const selectedChild =
    actor.mode === "guardian" ? actor.selectedChild?.id : undefined;
  const needsChild = actor.mode === "guardian" && !selectedChild;
  const history = needsChild
    ? null
    : await loadMyAttendance(actor, params.attendancePage);
  return (
    <section className="content-panel">
      <h2>Attendance history</h2>
      {actor.mode === "guardian" && (
        <ChildSelector
          learners={actor.children}
          selectedChildId={selectedChild}
          mode="guardian"
          view="attendance"
        />
      )}
      {needsChild ? (
        <p>Choose a learner to view attendance.</p>
      ) : !history ? (
        <p role="alert">
          Attendance history could not be loaded. Please try again.
        </p>
      ) : (
        <>
          <p className="muted">
            Recorded marks for{" "}
            {actor.mode === "guardian"
              ? actor.selectedChild?.fullName
              : actor.person.fullName}
            . A missing date does not mean absent.
          </p>
          {history.rows.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Class</th>
                    <th>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {history.rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.attendance_date}</td>
                      <td>{row.class_name}</td>
                      <td>{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No recorded attendance was found on this page.</p>
          )}
          <nav
            aria-label="Attendance history pages"
            className="flex flex-wrap gap-3"
          >
            {history.page > 1 && (
              <Link
                href={attendanceHref(mode, {
                  child: selectedChild,
                  page: history.page - 1,
                })}
              >
                Previous
              </Link>
            )}
            <span>Page {history.page}</span>
            {history.hasNext && history.page < maxListPage && (
              <Link
                href={attendanceHref(mode, {
                  child: selectedChild,
                  page: history.page + 1,
                })}
              >
                Next
              </Link>
            )}
          </nav>
        </>
      )}
    </section>
  );
}
