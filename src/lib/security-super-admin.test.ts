import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { describeActivity, deviceLabel, SECURITY_ENTITY_TYPES } from "./activityLog";
import { clearLoginFailures, loginBlockedFor, recordLoginFailure, resetLoginThrottle } from "./loginThrottle";
import { canManageAiSettings, canManageUsers, canViewAudit, canViewSecurityLog, isAdmin, isSuperAdmin, normalizeRole, type Actor } from "./permissions";
import { prisma } from "./prisma";

let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { POST as login } from "../app/api/auth/login/route";
import { GET as getAudit } from "../app/api/audit/route";
import { GET as getUsers, POST as postUser } from "../app/api/users/route";
import { PATCH as patchUser } from "../app/api/users/[id]/route";
import { POST as postBook } from "../app/api/books/route";
import { GET as getClasses } from "../app/api/classes/route";

const superAdmin: Actor = { id: "s", role: "SUPER_ADMIN" };
const admin: Actor = { id: "a", role: "ADMIN" };
const teacher: Actor = { id: "t", role: "TEACHER", assignments: [{ className: "Class 10", subject: "" }] };
const exam: Actor = { id: "e", role: "EXAM_CELL" };

describe("roles", () => {
  it("Super Admin keeps every Admin right and alone manages access", () => {
    expect(normalizeRole("SUPER_ADMIN")).toBe("SUPER_ADMIN");
    expect(isAdmin(superAdmin)).toBe(true);
    expect(isAdmin(admin)).toBe(true);
    expect(isSuperAdmin(admin)).toBe(false);
    expect(canManageUsers(superAdmin)).toBe(true);
    for (const a of [admin, teacher, exam]) {
      expect(canManageUsers(a)).toBe(false);
      expect(canManageAiSettings(a)).toBe(false);
      expect(canViewSecurityLog(a)).toBe(false);
    }
    expect(canViewSecurityLog(superAdmin)).toBe(true);
    expect(canViewAudit(admin)).toBe(true);
    expect(canViewAudit(exam)).toBe(true);
    expect(canViewAudit(teacher)).toBe(false);
  });
});

describe("failed sign-in limit", () => {
  beforeEach(() => resetLoginThrottle());

  it("blocks one email from one address after 5 wrong passwords for 15 minutes", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 4; i++) expect(recordLoginFailure("1.1.1.1", "a@x.in", t0 + i)).toBe(false);
    expect(loginBlockedFor("1.1.1.1", "a@x.in", t0 + 10)).toBe(0);
    expect(recordLoginFailure("1.1.1.1", "a@x.in", t0 + 5)).toBe(true);
    expect(loginBlockedFor("1.1.1.1", "A@X.in ", t0 + 6)).toBe(15);
    expect(loginBlockedFor("2.2.2.2", "b@x.in", t0 + 6)).toBe(0); // others unaffected
    expect(loginBlockedFor("1.1.1.1", "a@x.in", t0 + 15 * 60 * 1000 + 6)).toBe(0); // block ends
  });

  it("blocks an email tried from many addresses, and an address trying many emails", () => {
    const t0 = 2_000_000;
    for (let i = 0; i < 10; i++) recordLoginFailure(`9.9.9.${i}`, "victim@x.in", t0 + i);
    expect(loginBlockedFor("8.8.8.8", "victim@x.in", t0 + 20)).toBeGreaterThan(0);
    for (let i = 0; i < 20; i++) recordLoginFailure("7.7.7.7", `u${i}@x.in`, t0 + i);
    expect(loginBlockedFor("7.7.7.7", "fresh@x.in", t0 + 30)).toBeGreaterThan(0);
  });

  it("a correct password clears that account's counter", () => {
    for (let i = 0; i < 4; i++) recordLoginFailure("3.3.3.3", "c@x.in", 100 + i);
    clearLoginFailures("3.3.3.3", "c@x.in");
    expect(recordLoginFailure("3.3.3.3", "c@x.in", 200)).toBe(false);
  });
});

describe("activity wording", () => {
  it("plain sentences and devices", () => {
    expect(describeActivity({ action: "LOGIN_FAILED", entityType: "AUTH", detailsJson: '{"reason":"WRONG_PASSWORD","email":"x@y.in"}' })).toEqual({
      title: "Failed sign-in: wrong password",
      detail: "x@y.in",
    });
    expect(describeActivity({ action: "API_CHANGE", entityType: "BOOK", detailsJson: '{"method":"DELETE","path":"/api/books/cmw1lv2hr01gouo3cp55eszri"}' }).title).toBe(
      "Removed a book",
    );
    expect(describeActivity({ action: "API_CHANGE", entityType: "BOOK", detailsJson: '{"method":"POST","path":"/api/books/cmw1lv2hr01gouo3cp55eszri/chapters"}' }).title).toBe(
      "Added chapters of a book",
    );
    expect(deviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36")).toBe("Chrome on Windows");
    expect(deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1")).toBe("Safari on iPhone");
    expect(deviceLabel("Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/130.0 Safari/537.36")).toBe("Script or bot on Linux");
    expect(SECURITY_ENTITY_TYPES).toEqual(["AUTH", "USER"]);
  });
});

// ---------------------------------------------------------------------------------------------------------------
const stamp = Date.now().toString(36);
const ids: Record<string, string> = {};
const PW = "Correct-Horse-9";
const req = (url: string, method: string, json?: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: json === undefined ? undefined : JSON.stringify(json),
  });
const p = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });
async function as<T>(userId: string | null, run: () => Promise<Response>) {
  mockSessionUserId = userId;
  const res = await run();
  return { status: res.status, json: (await res.json().catch(() => ({}))) as T };
}

describe("Super Admin, sign-in logging and automatic change logging (API)", () => {
  beforeAll(async () => {
    const { hash } = await import("bcryptjs");
    const passwordHash = await hash(PW, 4);
    for (const [k, role] of [["superAdmin", "SUPER_ADMIN"], ["admin", "ADMIN"], ["exam", "EXAM_CELL"]] as const) {
      ids[k] = (await prisma.user.create({ data: { name: `${k} ${stamp}`, email: `sec-${k}-${stamp}@test.internal`, passwordHash, role } })).id;
    }
    resetLoginThrottle();
  });

  afterAll(async () => {
    const userIds = Object.values(ids);
    await prisma.book.deleteMany({ where: { className: `Sec Class ${stamp}` } });
    // adding a book registers its class; without this every run left a "Sec Class …" in teachers' class pickers
    await prisma.academicClass.deleteMany({ where: { name: `Sec Class ${stamp}` } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { userName: { contains: stamp } }] } });
    await prisma.user.deleteMany({ where: { OR: [{ id: { in: userIds } }, { email: { contains: stamp } }] } });
  });

  it("an Admin route still works for the Super Admin; account management is Super Admin only", async () => {
    expect((await as(ids.superAdmin, () => getClasses(req("/api/classes", "GET"), p()))).status).toBe(200);
    expect((await as(ids.superAdmin, () => getUsers(req("/api/users", "GET"), p()))).status).toBe(200);
    expect((await as(ids.admin, () => getUsers(req("/api/users", "GET"), p()))).status).toBe(403);
    const made = await as(ids.admin, () =>
      postUser(req("/api/users", "POST", { name: "Sneaky", email: `sneaky-${stamp}@test.internal`, password: "Password-123", role: "SUPER_ADMIN" }), p()),
    );
    expect(made.status).toBe(403);
  });

  it("the last active Super Admin cannot be demoted, and a role change ends that user's sessions", async () => {
    const others = await prisma.user.count({ where: { role: "SUPER_ADMIN", active: true, NOT: { id: ids.superAdmin } } });
    if (others === 0) {
      const res = await as<{ error: string }>(ids.superAdmin, () => patchUser(req(`/api/users/${ids.superAdmin}`, "PATCH", { role: "ADMIN" }), p({ id: ids.superAdmin })));
      expect(res.status).toBe(400);
    }
    const before = (await prisma.user.findUniqueOrThrow({ where: { id: ids.exam } })).sessionVersion;
    const res = await as(ids.superAdmin, () => patchUser(req(`/api/users/${ids.exam}`, "PATCH", { role: "ADMIN" }), p({ id: ids.exam })));
    expect(res.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: ids.exam } })).sessionVersion).toBe(before + 1);
    await prisma.user.update({ where: { id: ids.exam }, data: { role: "EXAM_CELL" } });
  });

  it("logs sign-ins, failed sign-ins with the address, and blocks after 5 wrong passwords", async () => {
    const email = `sec-admin-${stamp}@test.internal`;
    const from = { "x-forwarded-for": "203.0.113.7", "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/130.0" };
    expect((await as(null, () => login(req("/api/auth/login", "POST", { email, password: PW }, from), p()))).status).toBe(200);
    for (let i = 0; i < 4; i++) {
      expect((await as(null, () => login(req("/api/auth/login", "POST", { email, password: "wrong-pass-1" }, from), p()))).status).toBe(401);
    }
    const fifth = await as(null, () => login(req("/api/auth/login", "POST", { email, password: "wrong-pass-1" }, from), p()));
    expect(fifth.status).toBe(401);
    const blocked = await as<{ error: string }>(null, () => login(req("/api/auth/login", "POST", { email, password: PW }, from), p()));
    expect(blocked.status).toBe(429); // even the right password waits out the block
    expect(blocked.json.error).toMatch(/Try again in 15 minutes/);

    const rows = await prisma.auditLog.findMany({ where: { userId: ids.admin, entityType: "AUTH" }, orderBy: { createdAt: "asc" } });
    expect(rows.map((r) => r.action)).toEqual(["LOGIN_SUCCESS", "LOGIN_FAILED", "LOGIN_FAILED", "LOGIN_FAILED", "LOGIN_FAILED", "LOGIN_FAILED"]);
    expect(await prisma.auditLog.count({ where: { action: "LOGIN_BLOCKED", detailsJson: { contains: email } } })).toBe(1);
    resetLoginThrottle();

    const unknown = await as(null, () => login(req("/api/auth/login", "POST", { email: `nobody-${stamp}@test.internal`, password: "wrong-pass-1" }), p()));
    expect(unknown.status).toBe(401);
    expect(await prisma.auditLog.count({ where: { action: "LOGIN_FAILED", userName: `nobody-${stamp}@test.internal` } })).toBe(1);
  });

  it("a change without its own log entry is still logged with who made it", async () => {
    const res = await as<{ id: string }>(ids.admin, () =>
      postBook(req("/api/books", "POST", { title: "Sec Book", subject: "Science", className: `Sec Class ${stamp}`, academicSession: "2026–27" }), p()),
    );
    expect(res.status).toBe(200);
    const row = await prisma.auditLog.findFirst({ where: { userId: ids.admin, action: "API_CHANGE" }, orderBy: { createdAt: "desc" } });
    expect(row?.entityType).toBe("BOOK");
    expect(JSON.parse(row!.detailsJson)).toEqual({ method: "POST", path: "/api/books" });
  });

  it("sign-ins and account changes are visible to the Super Admin only", async () => {
    const forAdmin = await as<{ logs: Array<{ entityType: string; ipAddress?: string }>; full: boolean }>(ids.admin, () =>
      getAudit(req(`/api/audit?search=${stamp}&limit=200`, "GET"), p()),
    );
    expect(forAdmin.status).toBe(200);
    expect(forAdmin.json.full).toBe(false);
    expect(forAdmin.json.logs.some((l) => l.entityType === "AUTH" || l.entityType === "USER")).toBe(false);
    expect(forAdmin.json.logs.every((l) => l.ipAddress === undefined)).toBe(true);

    const forSuper = await as<{ logs: Array<{ entityType: string; action: string }>; full: boolean }>(ids.superAdmin, () =>
      getAudit(req(`/api/audit?category=SIGN_IN&search=${stamp}&limit=200`, "GET"), p()),
    );
    expect(forSuper.json.full).toBe(true);
    expect(forSuper.json.logs.length).toBeGreaterThanOrEqual(6);
    expect(forSuper.json.logs.every((l) => l.entityType === "AUTH")).toBe(true);

    const csv = await (mockSessionUserId = ids.superAdmin, getAudit(req(`/api/audit?category=SIGN_IN&search=${stamp}&format=csv`, "GET"), p()));
    expect(csv.headers.get("content-type")).toMatch(/text\/csv/);
    const text = await csv.text();
    expect(text.split("\r\n")[0]).toContain('"IP address"');
    expect(text).toContain("Failed sign-in: wrong password");
  });
});
