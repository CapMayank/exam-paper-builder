import { describe, expect, it } from "vitest";
import { changePasswordSchema, registerSchema, userProfileUpdateSchema } from "./schemas";
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

  it("recognizes USER_PASSWORD_CHANGE, USER_PASSWORD_RESET, and USER_PROFILE_UPDATE in AuditAction", () => {
    const pwChangeAction: AuditAction = "USER_PASSWORD_CHANGE";
    const pwResetAction: AuditAction = "USER_PASSWORD_RESET";
    const profileUpdateAction: AuditAction = "USER_PROFILE_UPDATE";
    expect(pwChangeAction).toBe("USER_PASSWORD_CHANGE");
    expect(pwResetAction).toBe("USER_PASSWORD_RESET");
    expect(profileUpdateAction).toBe("USER_PROFILE_UPDATE");
  });

  describe("Password Change Schema", () => {
    it("accepts valid password change input with matching confirmation", () => {
      const input = {
        currentPassword: "oldpassword123",
        newPassword: "newpassword456",
        confirmPassword: "newpassword456",
      };
      const result = changePasswordSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects when new password is shorter than 6 characters", () => {
      const input = {
        currentPassword: "oldpassword123",
        newPassword: "123",
        confirmPassword: "123",
      };
      const result = changePasswordSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 6 characters");
      }
    });

    it("rejects when new password and confirmation do not match", () => {
      const input = {
        currentPassword: "oldpassword123",
        newPassword: "newpassword456",
        confirmPassword: "differentpassword",
      };
      const result = changePasswordSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("do not match");
      }
    });

    it("rejects when current password is missing", () => {
      const input = {
        currentPassword: "",
        newPassword: "newpassword456",
        confirmPassword: "newpassword456",
      };
      const result = changePasswordSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("User Profile Update Schema", () => {
    it("accepts valid name and department updates", () => {
      const input = {
        name: "Dr. Ramesh Patel",
        department: "Mathematics",
      };
      const result = userProfileUpdateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("accepts partial updates (name only)", () => {
      const input = { name: "Dr. Ramesh Patel" };
      const result = userProfileUpdateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("accepts partial updates (department only)", () => {
      const input = { department: "Physics" };
      const result = userProfileUpdateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects name exceeding max characters", () => {
      const input = { name: "A".repeat(85) };
      const result = userProfileUpdateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
