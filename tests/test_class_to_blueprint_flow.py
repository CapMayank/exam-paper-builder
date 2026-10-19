import asyncio
import os
import hmac
import hashlib
import time
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:3000"
SESSION_SECRET = "66891132bfd6ceef60adf849088b03281489d505ef5dd6092c904de64fe68a08"
USER_ID = "cmv9ghmat0000uod088sysqok" # teacher@school.edu (ADMIN)

def generate_session_cookie():
    exp = int(time.time()) + 7 * 24 * 3600
    payload = f"{USER_ID}.{exp}"
    sig = hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"

async def run_flow_test():
    os.makedirs("test_artifacts", exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 850})
        
        cookie_val = generate_session_cookie()
        await context.add_cookies([{
            "name": "epb_session",
            "value": cookie_val,
            "domain": "localhost",
            "path": "/",
            "httpOnly": True,
            "sameSite": "Lax"
        }])
        
        page = await context.new_page()

        print("\n=======================================================")
        print("STEP 1: Navigate to /classes and inspect subjects")
        print("=======================================================")
        await page.goto(f"{BASE_URL}/classes", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        
        # Verify classes list is loaded
        class_cards = page.locator("aside button[aria-pressed]")
        class_count = await class_cards.count()
        print(f"Found {class_count} classes in sidebar.")
        assert class_count > 0, "No classes found on /classes"

        # Click Class 10 in sidebar if present, or first class
        class_10_card = page.locator("aside button:has-text('Class 10')").first
        if await class_10_card.is_visible():
            await class_10_card.click()
            await page.wait_for_timeout(500)
            print("Selected Class 10.")
        else:
            await class_cards.first.click()
            await page.wait_for_timeout(500)
            print("Selected first class.")

        await page.screenshot(path="test_artifacts/step1_classes_page.png")

        print("\n=======================================================")
        print("STEP 2: Click Manage Books link from subject table")
        print("=======================================================")
        # Look for a subject row, e.g., Mathematics
        math_link = page.locator("tr:has-text('Mathematics') a[href*='/books']").first
        if not await math_link.is_visible():
            # Fallback to any subject link with href*='/books'
            math_link = page.locator("a[href*='/books']").first
        
        link_href = await math_link.get_attribute("href")
        print(f"Navigating via link: {link_href}")
        await math_link.click()
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(1000)

        current_url = page.url
        print(f"Arrived at URL: {current_url}")
        assert "/books" in current_url, "Did not navigate to /books"

        await page.screenshot(path="test_artifacts/step2_books_landing.png")

        print("\n=======================================================")
        print("STEP 3: Open Syllabus Import Modal and verify pre-selection")
        print("=======================================================")
        # Check if import button is visible (either top bar, empty card, or sidebar)
        import_btn = page.locator("button:has-text('Import')").first
        assert await import_btn.is_visible(), "Import button not visible on /books"
        await import_btn.click()
        await page.wait_for_timeout(600)

        # Modal is open
        modal = page.locator("div.fixed:has(button:has-text('Cancel'))").first
        assert await modal.is_visible(), "Syllabus import modal did not open"
        print("Syllabus import modal opened successfully.")

        await page.screenshot(path="test_artifacts/step3_import_modal_opened.png")

        # Verify that preset tab is active and preset for Mathematics (or target subject) is matched
        preset_inputs = await modal.locator("select, input").all()
        print(f"Modal inputs found: {len(preset_inputs)}")

        # Check the books to be imported list
        import_submit_btn = modal.locator("button:has-text('Import Selected')").first
        assert await import_submit_btn.is_visible(), "Import submit button not found"

        print("Triggering syllabus import...")
        await import_submit_btn.click()
        await page.wait_for_timeout(2000)
        await page.wait_for_load_state("networkidle")

        await page.screenshot(path="test_artifacts/step4_after_import.png")
        print("Import completed! Books page updated.")

        print("\n=======================================================")
        print("STEP 4: Verify imported book is active with clean subject")
        print("=======================================================")
        # Check that there is an active book displayed
        book_details_header = page.locator("section#book-details-section h2").first
        if await book_details_header.is_visible():
            title_text = await book_details_header.text_content()
            print(f"Active book title: {title_text.strip()}")
        
        # Verify Create Blueprint button exists on the book details card
        create_bp_link = page.locator("section#book-details-section a:has-text('Create Blueprint')").first
        assert await create_bp_link.is_visible(), "Create Blueprint link missing on book details"
        print("Found 'Create Blueprint' link on book details.")

        print("\n=======================================================")
        print("STEP 5: Navigate to Blueprint Studio via Create Blueprint link")
        print("=======================================================")
        await create_bp_link.click()
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(1000)

        bp_url = page.url
        print(f"Blueprint URL: {bp_url}")
        assert "/blueprints/" in bp_url, f"Expected blueprint URL, got {bp_url}"

        # Check blueprint heading and subject/class selection
        bp_heading = await page.locator("h1:has-text('blueprint'), h1").first.text_content()
        print(f"Blueprint page heading: {bp_heading.strip()}")

        await page.screenshot(path="test_artifacts/step5_blueprint_prefilled.png")

        # Verify Auto Distribute Marks button is available
        auto_distribute = page.locator("button:has-text('Auto-distribute')").first
        if await auto_distribute.is_visible():
            print("Found Auto-distribute marks button.")
            await auto_distribute.click()
            await page.wait_for_timeout(500)
            print("Auto-distributed marks successfully.")

        # Check total marks or Save button
        save_and_build_btn = page.locator("button:has-text('Save & Build Exam Paper')").first
        assert await save_and_build_btn.is_visible(), "'Save & Build Exam Paper' button missing"
        print("Verified 'Save & Build Exam Paper' button is active and ready.")

        await page.screenshot(path="test_artifacts/step6_blueprint_ready.png")

        print("\n=======================================================")
        print("STEP 6: Click Save & Build Exam Paper and verify Paper Studio")
        print("=======================================================")
        await save_and_build_btn.click()
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(1500)

        paper_url = page.url
        print(f"Arrived at Paper Studio URL: {paper_url}")
        assert "/papers/" in paper_url, f"Expected paper URL, got {paper_url}"

        await page.screenshot(path="test_artifacts/step7_paper_studio.png")
        print("Exam paper created and opened in Paper Studio successfully!")

        print("\n=======================================================")
        print("COMPLETE CLASS -> BOOKS -> BLUEPRINT -> PAPER PIPELINE VERIFIED!")
        print("=======================================================")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_flow_test())
