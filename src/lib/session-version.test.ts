import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.SESSION_SECRET ||= "test-secret-for-session-version-0123456789";

const { parseSessionCookie, sessionUserId } = await import("./session");
const { prisma } = await import("./prisma");

const sign = (payload: string) => createHmac("sha256", process.env.SESSION_SECRET!).update(payload).digest("hex");
const exp = () => Math.floor(Date.now() / 1000) + 3600;
const cookieReq = (value: string) => new Request("http://localhost/api/me", { headers: { cookie: `epb_session=${encodeURIComponent(value)}` } });

describe("session cookies", () => {
  let userId = "";
  beforeAll(async () => {
    userId = (await prisma.user.create({ data: { name: "sess", email: `sess-${Date.now()}@test.internal`, passwordHash: "x", sessionVersion: 0 } })).id;
  });
  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
  });

  it("reads versioned cookies and cookies from before versioning (as version 0)", () => {
    const e = exp();
    expect(parseSessionCookie(`${userId}.2.${e}.${sign(`${userId}.2.${e}`)}`)).toEqual({ userId, version: 2 });
    expect(parseSessionCookie(`${userId}.${e}.${sign(`${userId}.${e}`)}`)).toEqual({ userId, version: 0 });
  });

  it("rejects a forged signature, a changed version and an expired cookie", () => {
    const e = exp();
    expect(parseSessionCookie(`${userId}.0.${e}.${"0".repeat(64)}`)).toBeNull();
    expect(parseSessionCookie(`${userId}.5.${e}.${sign(`${userId}.0.${e}`)}`)).toBeNull();
    const past = Math.floor(Date.now() / 1000) - 10;
    expect(parseSessionCookie(`${userId}.0.${past}.${sign(`${userId}.0.${past}`)}`)).toBeNull();
  });

  it("an old cookie stops working once the user's session version is raised", async () => {
    const e = exp();
    const old = `${userId}.${e}.${sign(`${userId}.${e}`)}`; // a session from before the deploy
    expect(await sessionUserId(cookieReq(old))).toBe(userId); // nobody is signed out by the upgrade
    await prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } }); // e.g. password reset
    expect(await sessionUserId(cookieReq(old))).toBeNull();
    const fresh = `${userId}.1.${e}.${sign(`${userId}.1.${e}`)}`;
    expect(await sessionUserId(cookieReq(fresh))).toBe(userId);
  });
});
