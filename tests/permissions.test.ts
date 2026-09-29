import { describe, expect, it } from "vitest";
import { canManageSchool, parseRoles, type Membership } from "../src/lib/permissions";

const admin: Membership = { userId: "alice", schoolId: "school-a", active: true, roles: ["school_admin", "guardian"] };

describe("school management boundary", () => {
  it("allows an active admin with multiple roles in their own school", () => {
    expect(canManageSchool(admin, "alice", "school-a")).toBe(true);
  });
  it("rejects a different school, different identity, suspended membership, and non-admin", () => {
    expect(canManageSchool(admin, "alice", "school-b")).toBe(false);
    expect(canManageSchool(admin, "mallory", "school-a")).toBe(false);
    expect(canManageSchool({ ...admin, active: false }, "alice", "school-a")).toBe(false);
    expect(canManageSchool({ ...admin, roles: ["teacher"] }, "alice", "school-a")).toBe(false);
  });
  it("does not recognize invented elevated roles", () => {
    expect(parseRoles(["super_admin", "teacher", null])).toEqual(["teacher"]);
    expect(parseRoles({ role: "school_admin" })).toEqual([]);
  });
});
