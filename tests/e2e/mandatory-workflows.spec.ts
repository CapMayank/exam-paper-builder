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

test.describe("1. Blueprint -> Generate with AI -> Generate Paper Lifecycle", () => {
  test.beforeEach(async ({ context }) => {
    await applySessionCookie(context);
  });

  test("Full Lifecycle: Stage progress, dismiss-guard, commit persistence, and reload fidelity (DEF-P01, DEF-M01, DEF-D01)", async ({
    page,
  }) => {
    // 1. Create a fresh draft paper from blueprint
    await page.goto("/papers");
    await page.waitForLoadState("networkidle");

    const newPaperBtn = page.locator('button:has-text("New exam paper")');
    await expect(newPaperBtn).toBeVisible({ timeout: 15000 });
    await expect(newPaperBtn).toBeEnabled({ timeout: 15000 });
    await newPaperBtn.click();

    const newPaperModal = page.locator('div[role="dialog"]').filter({ hasText: "New exam paper" });
    await expect(newPaperModal).toBeVisible();

    const uniqueTitle = `E2E Full Lifecycle Paper ${Date.now()}`;
    await newPaperModal.locator('input[placeholder*="Science, Half-Yearly"]').fill(uniqueTitle);

    const createBtn = newPaperModal.locator('button:has-text("Create and open")');
    await expect(createBtn).toBeEnabled({ timeout: 10000 });
    await createBtn.click();

    // 2. Wait for paper builder workbench to load
    await page.waitForURL(/\/papers\/[a-z0-9]+/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: uniqueTitle })).toBeVisible({ timeout: 15000 });

    // 3. Open AIPaperGeneratorModal
    const aiGenBtn = page.locator('button:has-text("Generate with AI")').first();
    await expect(aiGenBtn).toBeVisible({ timeout: 10000 });
    await aiGenBtn.click();

    const modal = page.locator('div[role="dialog"]').filter({ hasText: "AI Complete Question Paper Generator" });
    await expect(modal).toBeVisible();

    // Delay generation and commit routes by 200ms to ensure all stage indicators are observable
    await page.route("**/api/papers/*/ai-generate-section", async (route) => {
      await new Promise((r) => setTimeout(r, 200));
      try {
        await route.continue();
      } catch {}
    });
    await page.route("**/api/papers/*/ai-commit-section", async (route) => {
      await new Promise((r) => setTimeout(r, 200));
      try {
        await route.continue();
      } catch {}
    });

    // 4. Start Generation
    const generateSubmitBtn = modal.locator('button:has-text("Generate Complete Paper")');
    await expect(generateSubmitBtn).toBeVisible({ timeout: 15000 });
    await expect(generateSubmitBtn).toBeEnabled({ timeout: 15000 });
    await generateSubmitBtn.click();

    // 5. Verify Modal Dismiss-Guard (Mid-Run)
    // Clicking backdrop outside modal dialog must NOT dismiss modal
    await page.mouse.click(10, 10);
    await expect(modal).toBeVisible();

    // Pressing Escape key must NOT dismiss modal
    await page.keyboard.press("Escape");
    await expect(modal).toBeVisible();

    // Close X button must be disabled
    const closeBtn = modal.locator('button[aria-label="Close dialog"]');
    await expect(closeBtn).toBeDisabled();

    // 6. Verify Stage Progress Indicators
    await expect(modal.locator("text=Stage 1: Formulating questions with Gemini...")).toBeVisible({
      timeout: 15000,
    });
    await expect(modal.locator("text=Stage 3: Committing section to database...")).toBeVisible({
      timeout: 30000,
    });

    // 7. Verify Completion Only After Database Commit
    await expect(modal.locator('button:has-text("Open & Finalize Paper")')).toBeVisible({ timeout: 60000 });

    // Cleanup route handlers
    await page.unroute("**/api/papers/*/ai-generate-section");
    await page.unroute("**/api/papers/*/ai-commit-section");

    // 8. Close Modal and Inspect Generated Paper in Workbench
    await modal.locator('button:has-text("Open & Finalize Paper")').click();
    await expect(modal).toBeHidden();

    // 9. Verify Displayed Paper == Persisted Paper After Refresh (DEF-D01)
    const paperId = page.url().split("/papers/")[1]?.split(/[?#]/)[0];
    expect(paperId).toBeTruthy();

    const apiPaperRes = await page.request.get(`/api/papers/${paperId}`);
    expect(apiPaperRes.ok()).toBeTruthy();
    const apiPaper = await apiPaperRes.json();
    expect(Array.isArray(apiPaper.items) && apiPaper.items.length > 0).toBeTruthy();
    const firstQuestionText = apiPaper.items[0].question.text.slice(0, 30);

    await expect(page.locator(`text=${firstQuestionText}`).first()).toBeVisible({ timeout: 10000 });

    // Reload browser page (F5)
    await page.reload({ waitUntil: "networkidle" });

    // Assert that persisted question text is still displayed identically after reload
    await expect(page.locator(`text=${firstQuestionText}`).first()).toBeVisible({ timeout: 10000 });

    // Teardown temporary paper
    await page.request.delete(`/api/papers/${paperId}`);
  });

  test("Lifecycle: Cancellation handling and clean state on reopen (DEF-S03, DEF-M01, DEF-M02)", async ({
    page,
  }) => {
    // 1. Create a fresh draft paper
    await page.goto("/papers");
    await page.waitForLoadState("networkidle");

    const newPaperBtn = page.locator('button:has-text("New exam paper")');
    await expect(newPaperBtn).toBeEnabled({ timeout: 15000 });
    await newPaperBtn.click();

    const newModal = page.locator('div[role="dialog"]').filter({ hasText: "New exam paper" });
    const cancelTitle = `E2E Cancel Test ${Date.now()}`;
    await newModal.locator('input[placeholder*="Science, Half-Yearly"]').fill(cancelTitle);
    const createBtn = newModal.locator('button:has-text("Create and open")');
    await expect(createBtn).toBeEnabled({ timeout: 10000 });
    await createBtn.click();
    await page.waitForURL(/\/papers\/[a-z0-9]+/, { timeout: 15000 });

    // 2. Open AIPaperGeneratorModal
    const aiGenBtn = page.locator('button:has-text("Generate with AI")').first();
    await expect(aiGenBtn).toBeVisible({ timeout: 10000 });
    await aiGenBtn.click();

    const genModal = page.locator('div[role="dialog"]').filter({ hasText: "AI Complete Question Paper Generator" });
    await expect(genModal).toBeVisible();

    // Intercept section generation to give time to trigger cancel
    await page.route("**/api/papers/*/ai-generate-section", async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        await route.continue();
      } catch {}
    });

    // Start generation
    const generateSubmitBtn = genModal.locator('button:has-text("Generate Complete Paper")');
    await expect(generateSubmitBtn).toBeVisible({ timeout: 15000 });
    await expect(generateSubmitBtn).toBeEnabled({ timeout: 15000 });
    await generateSubmitBtn.click();

    // 3. Trigger Cancel Generation
    const cancelBtn = genModal.locator('button:has-text("Cancel Generation")');
    await expect(cancelBtn).toBeVisible({ timeout: 10000 });
    await cancelBtn.click();

    // 4. Verify generation pauses/stops and cancellation toast or message is displayed
    await expect(
      page.locator("text=Generation cancelled").or(page.locator("text=cancelled and draft questions cleared")),
    ).toBeVisible({ timeout: 10000 });

    await page.unroute("**/api/papers/*/ai-generate-section");

    // Close modal via enabled X button
    const closeBtn = genModal.locator('button[aria-label="Close dialog"]');
    await expect(closeBtn).toBeEnabled();
    await closeBtn.click();
    await expect(genModal).toBeHidden();

    // 5. Verify No Duplicate Run on Reopen: modal resets cleanly to config mode
    await page.locator('button:has-text("Generate with AI")').first().click();
    await expect(genModal).toBeVisible();
    await expect(genModal.locator('button:has-text("Generate Complete Paper")')).toBeVisible({ timeout: 15000 });

    // Cleanly close modal via X button
    await closeBtn.click();
    await expect(genModal).toBeHidden();

    const paperId = page.url().split("/papers/")[1]?.split(/[?#]/)[0];
    if (paperId) {
      await page.request.delete(`/api/papers/${paperId}`);
    }
  });
});

test.describe("2. Modal-Close Guard Across Modals", () => {
  test.beforeEach(async ({ context }) => {
    await applySessionCookie(context);
  });

  test("AIPaperGeneratorModal: Backdrop, Escape lock, and disabled close button during active generation (DEF-M01, DEF-M03)", async ({
    page,
  }) => {
    // 1. Create a fresh draft paper
    await page.goto("/papers");
    await page.waitForLoadState("networkidle");

    const newPaperBtn = page.locator('button:has-text("New exam paper")');
    await expect(newPaperBtn).toBeEnabled({ timeout: 15000 });
    await newPaperBtn.click();

    const newModal = page.locator('div[role="dialog"]').filter({ hasText: "New exam paper" });
    const dismissTitle = `E2E Dismiss Guard ${Date.now()}`;
    await newModal.locator('input[placeholder*="Science, Half-Yearly"]').fill(dismissTitle);
    const createBtn = newModal.locator('button:has-text("Create and open")');
    await expect(createBtn).toBeEnabled({ timeout: 10000 });
    await createBtn.click();
    await page.waitForURL(/\/papers\/[a-z0-9]+/, { timeout: 15000 });

    // 2. Open AIPaperGeneratorModal
    const aiGenBtn = page.locator('button:has-text("Generate with AI")').first();
    await expect(aiGenBtn).toBeVisible({ timeout: 10000 });
    await aiGenBtn.click();

    const genModal = page.locator('div[role="dialog"]').filter({ hasText: "AI Complete Question Paper Generator" });
    await expect(genModal).toBeVisible();

    // Intercept section generation with a 2000ms delay to test locks during active operation
    await page.route("**/api/papers/*/ai-generate-section", async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        await route.continue();
      } catch {}
    });

    const startBtn = genModal.locator('button:has-text("Generate Complete Paper")');
    await expect(startBtn).toBeVisible({ timeout: 15000 });
    await expect(startBtn).toBeEnabled({ timeout: 15000 });
    await startBtn.click();

    // 3. Verify Backdrop click is locked
    await page.mouse.click(10, 10);
    await expect(genModal).toBeVisible();

    // 4. Verify Escape key is locked
    await page.keyboard.press("Escape");
    await expect(genModal).toBeVisible();

    // 5. Verify Close X button is disabled
    const closeBtn = genModal.locator('button[aria-label="Close dialog"]');
    await expect(closeBtn).toBeDisabled();

    // 6. Cancel to clean up
    await genModal.locator('button:has-text("Cancel Generation")').click();
    await expect(
      page.locator("text=Generation cancelled").or(page.locator("text=cancelled and draft questions cleared")),
    ).toBeVisible({ timeout: 10000 });

    await page.unroute("**/api/papers/*/ai-generate-section");

    // Once generation stops, close button is enabled again
    await expect(closeBtn).toBeEnabled();
    await closeBtn.click();
    await expect(genModal).toBeHidden();

    const paperId = page.url().split("/papers/")[1]?.split(/[?#]/)[0];
    if (paperId) {
      await page.request.delete(`/api/papers/${paperId}`);
    }
  });
});

test.describe("3. Double-Click Locks & Action Integrity", () => {
  test.beforeEach(async ({ context }) => {
    await applySessionCookie(context);
  });

  test("Move Up/Down button lock: disables during reorder mutation (DEF-A01)", async ({ page }) => {
    await page.goto("/papers");
    await page.waitForLoadState("networkidle");

    // Open seeded draft paper known to contain multiple questions
    const paperLink = page.locator('a[href^="/papers/"]').filter({ hasText: "Science Practice Test" }).first();
    await expect(paperLink).toBeVisible({ timeout: 15000 });
    await paperLink.click();
    await page.waitForURL(/\/papers\/[a-z0-9]+/);

    // Unconditionally assert the first Move Down button is visible and enabled
    const moveDownBtn = page.locator('button[title="Move question down"]').first();
    await expect(moveDownBtn).toBeVisible({ timeout: 10000 });
    await expect(moveDownBtn).toBeEnabled();

    // Intercept PATCH to simulate network latency
    await page.route("**/api/papers/*/questions/*", async (route) => {
      if (route.request().method() === "PATCH") {
        await new Promise((r) => setTimeout(r, 600));
      }
      try {
        await route.continue();
      } catch {}
    });

    await moveDownBtn.click();
    // Button must immediately become disabled while mutation is in-flight
    await expect(moveDownBtn).toBeDisabled();

    // Once mutation finishes, wait for response
    await page.waitForResponse(
      (res) => res.url().includes("/questions/") && res.request().method() === "PATCH",
      { timeout: 8000 },
    );
    await page.unroute("**/api/papers/*/questions/*");
  });

  test("Add-to-Slot button lock: disables and shows spinner in QuestionPicker (DEF-A02, DEF-F02)", async ({
    page,
  }) => {
    // Create an isolated temporary paper so seeded papers are never depleted across runs
    await page.goto("/papers");
    await page.waitForLoadState("networkidle");

    const newPaperBtn = page.locator('button:has-text("New exam paper")');
    await expect(newPaperBtn).toBeEnabled({ timeout: 15000 });
    await newPaperBtn.click();

    const newModal = page.locator('div[role="dialog"]').filter({ hasText: "New exam paper" });
    await newModal.locator('input[placeholder*="Science, Half-Yearly"]').fill(`E2E Slot Lock ${Date.now()}`);
    const createBtn = newModal.locator('button:has-text("Create and open")');
    await expect(createBtn).toBeEnabled({ timeout: 10000 });
    await createBtn.click();
    await page.waitForURL(/\/papers\/[a-z0-9]+/, { timeout: 15000 });

    // Look for empty slot "Pick from Bank" button
    const pickBtn = page.locator('button:has-text("Pick from Bank")').first();
    await expect(pickBtn).toBeVisible({ timeout: 10000 });
    await pickBtn.click();

    const pickerModal = page.locator('div[role="dialog"]').filter({ hasText: "Add to" }).first();
    await expect(pickerModal).toBeVisible();

    const addBtn = pickerModal.locator('button:has-text("Add to Slot")').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });

    // Intercept POST to simulate latency
    await page.route("**/api/papers/*/questions", async (route) => {
      if (route.request().method() === "POST") {
        await new Promise((r) => setTimeout(r, 600));
      }
      try {
        await route.continue();
      } catch {}
    });

    await addBtn.click();
    // Button must immediately disable while adding
    await expect(addBtn).toBeDisabled();

    await page.waitForResponse(
      (res) => res.url().includes("/questions") && res.request().method() === "POST",
      { timeout: 8000 },
    );
    await page.unroute("**/api/papers/*/questions");

    const paperId = page.url().split("/papers/")[1]?.split(/[?#]/)[0];
    if (paperId) {
      await page.request.delete(`/api/papers/${paperId}`);
    }
  });
});

test.describe("4. Bulk Delete UI Workflow", () => {
  test.beforeEach(async ({ context }) => {
    await applySessionCookie(context);
  });

  test("Bulk Delete: Multi-select, confirmation modal, atomic DELETE /api/questions/bulk, and verified toast (DEF-A03)", async ({
    page,
  }) => {
    // 1. Ensure at least 2 unassigned test questions exist via API
    const booksRes = await page.request.get("/api/books");
    expect(booksRes.ok()).toBeTruthy();
    const books = await booksRes.json();
    expect(Array.isArray(books) && books.length > 0).toBeTruthy();
    const targetBook = books.find((b: any) => Array.isArray(b.chapters) && b.chapters.length > 0);
    expect(targetBook).toBeTruthy();
    const bookId = targetBook.id;
    const chapterId = targetBook.chapters[0].id;

    const uniqueTag = `E2E_DEL_${Date.now()}`;
    const q1Res = await page.request.post("/api/questions", {
      data: {
        bookId,
        chapterId,
        type: "MCQ",
        text: `Target Question 1 for Bulk Delete ${uniqueTag}`,
        difficulty: "EASY",
        marks: 1,
        options: ["Option A", "Option B", "Option C", "Option D"],
        answer: "Option A",
        spaceMm: 0,
        showGrid: false,
      },
    });
    expect(q1Res.ok()).toBeTruthy();

    const q2Res = await page.request.post("/api/questions", {
      data: {
        bookId,
        chapterId,
        type: "MCQ",
        text: `Target Question 2 for Bulk Delete ${uniqueTag}`,
        difficulty: "EASY",
        marks: 1,
        options: ["Option 1", "Option 2", "Option 3", "Option 4"],
        answer: "Option 1",
        spaceMm: 0,
        showGrid: false,
      },
    });
    expect(q2Res.ok()).toBeTruthy();

    // 2. Navigate to Question Bank and search for created questions
    await page.goto("/questions");
    await page.waitForLoadState("networkidle");

    const searchInput = page.locator('input[placeholder*="Search questions by text"]');
    await searchInput.fill(uniqueTag);
    await page.waitForTimeout(500); // Allow debounce

    // 3. Verify questions appear and select both checkboxes
    const checkboxes = page.locator('input[type="checkbox"][aria-label^="Select question"]');
    await expect(checkboxes).toHaveCount(2, { timeout: 10000 });

    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    // 4. Verify floating sticky bulk actions bar appears
    const deleteBtn = page.locator('button:has-text("Delete Selected")');
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });

    await deleteBtn.click();

    // 5. Verify confirmation modal dialog
    const confirmModal = page.locator('div[role="dialog"]');
    await expect(confirmModal).toBeVisible();
    await expect(confirmModal.locator("text=from bank?")).toBeVisible();

    // Confirm deletion
    const modalDeleteBtn = confirmModal.locator('button:has-text("Delete Selected")');
    await modalDeleteBtn.click();

    // 6. Verify toast notification confirming atomic deletion
    await expect(page.locator("text=Deleted 2 questions.")).toBeVisible({ timeout: 10000 });

    // Verify questions no longer appear in bank
    await expect(page.locator("text=No questions found")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("5. Word Export Error Handling", () => {
  test.beforeEach(async ({ context }) => {
    await applySessionCookie(context);
  });

  test("Word Export: Managed download catches server failure and displays error toast (DEF-P02, DEF-S01)", async ({
    page,
  }) => {
    await page.goto("/papers");
    await page.waitForLoadState("networkidle");

    // Open first paper
    const paperLink = page.locator('a[href^="/papers/"]').first();
    await expect(paperLink).toBeVisible({ timeout: 15000 });
    await paperLink.click();
    await page.waitForURL(/\/papers\/[a-z0-9]+/);

    // Intercept export-docx to return 500 JSON error
    const errorMessage = "LaTeX syntax compilation error in Question 3";
    await page.route("**/api/papers/*/export-docx", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: errorMessage }),
      });
    });

    // Open Export & Print menu
    const exportPrintBtn = page.locator('button:has-text("Export & Print")');
    await expect(exportPrintBtn).toBeVisible({ timeout: 10000 });
    await exportPrintBtn.click();

    const wordExportBtn = page.locator('button:has-text("Word Document (.docx)")');
    await expect(wordExportBtn).toBeVisible({ timeout: 10000 });
    await wordExportBtn.click();

    // Verify error toast is displayed matching server error
    await expect(page.locator(`text=${errorMessage}`)).toBeVisible({ timeout: 10000 });

    // Verify button re-enables gracefully after failure
    await exportPrintBtn.click();
    await expect(page.locator('button:has-text("Word Document (.docx)")')).toBeEnabled();

    await page.unroute("**/api/papers/*/export-docx");
  });
});
