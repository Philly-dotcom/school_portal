import { describe, expect, it } from "vitest";
import { isSchoolAdminContext, parseRoles } from "../src/lib/permissions";

describe("school management boundary", () => {
  it("accepts only a ready context holding school_admin", () => {
    expect(
      isSchoolAdminContext({
        status: "ready",
        roles: ["teacher", "school_admin"],
      }),
    ).toBe(true);
    expect(isSchoolAdminContext({ status: "ready", roles: ["teacher"] })).toBe(
      false,
    );
    expect(isSchoolAdminContext({ status: "forbidden" })).toBe(false);
    expect(
      isSchoolAdminContext({ status: "ready", roles: "school_admin" }),
    ).toBe(false);
    expect(isSchoolAdminContext({ status: "ready" })).toBe(false);
  });
  it("does not recognize invented elevated roles", () => {
    expect(parseRoles(["super_admin", "teacher", null])).toEqual(["teacher"]);
    expect(parseRoles({ role: "school_admin" })).toEqual([]);
  });
});
