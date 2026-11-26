import { test, expect, type APIRequestContext } from "@playwright/test";
import { createHmac } from "node:crypto";

const SESSION_SECRET = "66891132bfd6ceef60adf849088b03281489d505ef5dd6092c904de64fe68a08";
const ADMIN_USER_ID = "cmv9ghmat0000uod088sysqok"; // teacher@school.edu (ADMIN)

function sessionCookie(): string {
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
  const payload = `${ADMIN_USER_ID}.${exp}`;
  return `${payload}.${createHmac("sha256", SESSION_SECRET).update(payload).digest("hex")}`;
}

async function json<T>(req: APIRequestContext, method: "post" | "patch" | "put" | "delete", url: string, data?: unknown): Promise<T> {
  const res = await req[method](url, data === undefined ? undefined : { data });
  expect(res.ok(), `${method.toUpperCase()} ${url}`).toBeTruthy();
  return (await res.json()) as T;
}

type View = { id: string; blocks: { id: string }[]; slots: { id: string; subject: string }[] };

test.describe("Exam manager", () => {
  let examId: string | null = null;

  test.beforeEach(async ({ context }) => {
    await context.addCookies([{ name: "epb_session", value: sessionCookie(), url: "http://localhost:3100", httpOnly: true, sameSite: "Lax" }]);
  });

  test.afterEach(async ({ page }) => {
    if (examId) await page.request.delete(`/api/exams/${examId}`);
  });

  test("create an exam, schedule papers, print the date sheet, mark a paper printed", async ({ page }) => {
    const name = `E2E Exam ${Date.now()}`;

    // create the exam from the Exams page
    await page.goto("/exams");
    await page.getByRole("button", { name: "New exam" }).first().click();
    const dialog = page.locator('div[role="dialog"]').filter({ hasText: "New exam" });
    await dialog.getByPlaceholder("Half Yearly Examination December 2026").fill(name);
    await dialog.getByRole("button", { name: "Create and build date sheet" }).click();
    await page.waitForURL(/\/exams\/[a-z0-9]+\?tab=sheet/, { timeout: 20000 });
    examId = new URL(page.url()).pathname.split("/")[2];

    // build a small date sheet through the same API the builder uses
    const withBlock = await json<View>(page.request, "post", `/api/exams/${examId}/blocks`, { title: "Middle School", timeText: "11:00 am to 02:00 pm" });
    const blockId = withBlock.blocks[0].id;
    for (const d of ["2027-03-10", "2027-03-12"]) await json(page.request, "patch", `/api/exams/${examId}/blocks/${blockId}`, { addDate: d });
    await json(page.request, "patch", `/api/exams/${examId}/blocks/${blockId}`, { addClass: "Class 8" });
    await json(page.request, "put", `/api/exams/${examId}/cells`, { blockId, className: "Class 8", date: "2027-03-10", subject: "Science" });
    await json(page.request, "put", `/api/exams/${examId}/cells`, { blockId, className: "Class 8", date: "2027-03-12", subject: "Hindi" });

    // calendar: two exam days, nothing ready
    await page.goto(`/exams/${examId}?tab=calendar`);
    await expect(page.getByText("0 of 2 papers ready · 0 printed")).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("button", { name: /2027-03-10: 0 of 1 ready/ })).toBeVisible();

    // the printed date sheet
    await page.goto(`/exams/${examId}/print`);
    await expect(page.getByRole("heading", { name: /DATE SHEET/ })).toContainText(name.toUpperCase(), { timeout: 20000 });
    await expect(page.getByRole("cell", { name: "Science" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Wednesday" })).toBeVisible();

    // mark one paper printed from the day panel
    await page.goto(`/exams/${examId}?tab=calendar`);
    await page.getByRole("button", { name: /2027-03-10: 0 of 1 ready/ }).click();
    const panel = page.getByRole("dialog", { name: "Papers on 10/03/2027" });
    await panel.getByLabel("Printed").check();
    await expect(panel.getByText("Printed", { exact: true }).first()).toBeVisible();
    await panel.getByRole("button", { name: "Close" }).click();
    await expect(page.getByText("1 of 2 papers ready · 1 printed")).toBeVisible();
  });
});
