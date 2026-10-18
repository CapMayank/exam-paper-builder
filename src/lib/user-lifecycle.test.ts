import { describe, expect, it } from "vitest";
import { registerSchema } from "./schemas";
import type { AuditAction } from "./audit";

describe("School User Registration & Lifecycle Schemas", () => {
  it("accepts valid registration input with schoolCode", () => {
    const input = {
      name: "Principal Sharma",
      email: "principal@school.edu",
      password: "strongpassword123",
      schoolCode: "772070",
    };
    const parsed = registerSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it("accepts valid registration input without schoolCode", () => {
    const input = {
      name: "Principal Sharma",
      email: "principal@school.edu",
      password: "strongpassword123",
    };
    const parsed = registerSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it("rejects password shorter than 8 characters", () => {
    const input = {
      name: "Teacher",
      email: "teacher@school.edu",
      password: "short",
    };
    const parsed = registerSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid email formats", () => {
    const input = {
      name: "Teacher",
      email: "not-an-email",
      password: "strongpassword123",
    };
    const parsed = registerSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it("recognizes USER_DELETE in AuditAction", () => {
    const deleteAction: AuditAction = "USER_DELETE";
    expect(deleteAction).toBe("USER_DELETE");
  });
});
