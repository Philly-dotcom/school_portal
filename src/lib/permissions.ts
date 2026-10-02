export const roles = ["school_admin", "teacher", "student", "guardian"] as const;
export type Role = (typeof roles)[number];
export const roleLabels: Record<Role, string> = {
  school_admin: "School Admin", teacher: "Teacher", student: "Student", guardian: "Parent / Guardian",
};

export type Membership = {
  userId: string;
  schoolId: string;
  active: boolean;
  roles: Role[];
};

// Action capability only. Record/relationship checks and database RLS are also required.
export function canManageSchool(membership: Membership, userId: string, schoolId: string) {
  return membership.active && membership.userId === userId && membership.schoolId === schoolId
    && membership.roles.includes("school_admin");
}

export function parseRoles(value: unknown): Role[] {
  if (!Array.isArray(value)) return [];
  return value.filter((role): role is Role => roles.includes(role as Role));
}

// The single check every administrator server action uses. It narrows a school context to
// the "ready" state, so callers can read context.school and context.userId safely afterwards.
// This is action capability only: the database re-checks admin rights in every RPC and policy.
export function isSchoolAdminContext<T extends { status: string }>(context: T): context is Extract<T, { status: "ready" }> {
  const roleList = (context as { roles?: unknown }).roles;
  return context.status === "ready" && Array.isArray(roleList) && roleList.includes("school_admin");
}
