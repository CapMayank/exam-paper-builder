import { test, expect } from "@playwright/test";
import { createHmac } from "node:crypto";

const SESSION_SECRET = "66891132bfd6ceef60adf849088b03281489d505ef5dd6092c904de64fe68a08";
const TEACHER_USER_ID = "cmv9ghmat0000uod088sysqok"; // teacher@school.edu (ADMIN)

/**
 * Generates HMAC-signed session cookie for deterministic offline E2E authentication
 */
function generateSessionCookie(): string {
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
  const payload = `${TEACHER_USER_ID}.${exp}`;
  const sig = createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

async function applySessionCookie(context: any) {
  const cookieValue = generateSessionCookie();
  await context.addCookies([
    {
      name: "epb_session",
      value: cookieValue,
      url: "http://localhost:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

test.describe("Blueprint UI Modes E2E Verification (/blueprints and /blueprints/new)", () => {
  test.beforeEach(async ({ context }) => {
    await applySessionCookie(context);
  });

  test("1. Blueprints directory page loads and provides access to creation", async ({ page }) => {
    await page.goto("/blueprints");
    await page.waitForLoadState("networkidle");

    // Verify page header or title is visible
    await expect(page.getByRole("heading", { name: /blueprints/i }).first()).toBeVisible({ timeout: 15000 });

    // Verify New Blueprint link exists
    const newBlueprintLink = page.locator('a[href="/blueprints/new"]');
    await expect(newBlueprintLink.first()).toBeVisible({ timeout: 10000 });
  });

  test("2. Mode 1: Standard MPBSE Pattern configurator works correctly", async ({ page }) => {
    await page.goto("/blueprints/new");
    await page.waitForLoadState("networkidle");

    // Verify the 3 mode buttons are visible
    const mode1Btn = page.locator('button:has-text("Mode 1: Standard MPBSE Pattern")');
    const mode2Btn = page.locator('button:has-text("Mode 2: Custom School Exam")');
    const mode3Btn = page.locator('button:has-text("Mode 3: Blank Custom Blueprint")');

    await expect(mode1Btn).toBeVisible({ timeout: 15000 });
    await expect(mode2Btn).toBeVisible({ timeout: 10000 });
    await expect(mode3Btn).toBeVisible({ timeout: 10000 });

    // Click Mode 1
    await mode1Btn.click();

    // Verify StandardMpbseConfigurator heading
    const mpbseHeading = page.locator('h3:has-text("Official MPBSE Board Blueprint Configurator")');
    await expect(mpbseHeading).toBeVisible({ timeout: 10000 });

    // Verify 1-Click Load Official Blueprint button is present
    const loadBtn = page.locator('button:has-text("1-Click Load Official Blueprint")');
    await expect(loadBtn).toBeVisible({ timeout: 10000 });
    await loadBtn.click();

    // Verify sections and question types header is populated
    await expect(page.locator('h2:has-text("Sections & Question Types")')).toBeVisible({ timeout: 10000 });
  });

  test("3. Mode 2: Custom School Exam configurator adapts terms and target marks", async ({ page }) => {
    await page.goto("/blueprints/new");
    await page.waitForLoadState("networkidle");

    // Click Mode 2
    const mode2Btn = page.locator('button:has-text("Mode 2: Custom School Exam")');
    await expect(mode2Btn).toBeVisible({ timeout: 15000 });
    await mode2Btn.click();

    // Verify CustomSchoolTermConfigurator heading
    const customHeading = page.locator('h3:has-text("Custom School Term Examination Configurator")');
    await expect(customHeading).toBeVisible({ timeout: 10000 });

    // Verify term buttons
    const quarterlyBtn = page.locator('button:has-text("Quarterly (त्रैमासिक)")');
    const unitTestBtn = page.locator('button:has-text("Unit Test (इकाई परीक्षा)")');

    await expect(quarterlyBtn).toBeVisible({ timeout: 10000 });
    await expect(unitTestBtn).toBeVisible({ timeout: 10000 });

    // Click Quarterly (50 marks)
    await quarterlyBtn.click();
    const targetMarksInput = page.locator('input[type="number"]').first();
    await expect(targetMarksInput).toHaveValue("50");

    // Click Unit Test (25 marks)
    await unitTestBtn.click();
    await expect(targetMarksInput).toHaveValue("25");
  });

  test("4. Mode 3: Blank Custom Blueprint mode allows complete manual authoring", async ({ page }) => {
    await page.goto("/blueprints/new");
    await page.waitForLoadState("networkidle");

    // Click Mode 3
    const mode3Btn = page.locator('button:has-text("Mode 3: Blank Custom Blueprint")');
    await expect(mode3Btn).toBeVisible({ timeout: 15000 });
    await mode3Btn.click();

    // Verify neither Mode 1 nor Mode 2 configurator headings are visible
    await expect(page.locator('h3:has-text("Official MPBSE Board Blueprint Configurator")')).toBeHidden();
    await expect(page.locator('h3:has-text("Custom School Term Examination Configurator")')).toBeHidden();

    // In Blank mode, standard blueprint editor form sections are present
    await expect(page.locator('button:has-text("Add section")')).toBeVisible({ timeout: 10000 });

    // Feasibility status alert is present
    await expect(page.locator("text=Examination Feasibility Notice").first()).toBeVisible({ timeout: 10000 });
  });
});
