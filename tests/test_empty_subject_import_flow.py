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

async def run_empty_subject_test():
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
        print("TEST: Empty Subject Flow -> Import -> Blueprint")
        print("=======================================================")
        
        # Navigate to /books for Class 10 Science (which has 0 books currently)
        await page.goto(f"{BASE_URL}/books?className=Class%2010&subject=Science", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        await page.screenshot(path="test_artifacts/empty_subject_landing.png")

        # Verify empty subject card is shown in the center
        empty_banner = page.locator("text=No textbooks added for Science yet")
        assert await empty_banner.is_visible(), "Empty subject banner not displayed for Science"
        print("Empty subject banner verified: 'No textbooks added for Science yet'")

        # Verify both action buttons are present: Add Textbook for Science, Import Syllabus
        assert await page.locator("button:has-text('Add Textbook for Science')").is_visible(), "Add Textbook button missing"
        import_btn = page.locator("button:has-text('Import Syllabus (CBSE / NCERT)')")
        assert await import_btn.is_visible(), "Import Syllabus button missing"
        print("Verified empty state action buttons.")

        # Click Import Syllabus
        await import_btn.click()
        await page.wait_for_timeout(600)

        # Modal is open
        modal = page.locator("div.fixed:has(button:has-text('Cancel'))").first
        assert await modal.is_visible(), "Syllabus import modal did not open"
        print("Syllabus import modal opened.")

        await page.screenshot(path="test_artifacts/empty_subject_modal.png")

        # Check that Science preset (cbse-10-science, 13 chapters) is pre-selected
        preset_title = await modal.locator("text=Science (NCERT Class X)").first.is_visible()
        print(f"Science NCERT Class X preset visible: {preset_title}")

        # Check import button
        import_submit = modal.locator("button:has-text('Import Selected')").first
        assert await import_submit.is_visible(), "Import submit button not visible"

        # Click Import Selected
        print("Clicking Import Selected...")
        await import_submit.click()
        await page.wait_for_timeout(2000)
        await page.wait_for_load_state("networkidle")

        await page.screenshot(path="test_artifacts/empty_subject_after_import.png")

        # Verify that Science book is now displayed with 13 chapters
        science_book_header = page.locator("section#book-details-section h2:has-text('Science')")
        assert await science_book_header.is_visible(), "Science book details not visible after import"
        print("Science textbook successfully displayed in details panel after import!")

        # Verify Create Blueprint button
        create_bp = page.locator("section#book-details-section a:has-text('Create Blueprint')").first
        assert await create_bp.is_visible(), "Create Blueprint button missing"
        print("Found Create Blueprint button.")

        await create_bp.click()
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(1000)

        bp_url = page.url
        print(f"Blueprint URL: {bp_url}")
        assert "className=Class%2010" in bp_url and "subject=Science" in bp_url, f"Unexpected BP URL: {bp_url}"

        await page.screenshot(path="test_artifacts/empty_subject_bp_prefilled.png")
        print("SUCCESS: Full empty subject -> import -> blueprint pipeline passed!")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_empty_subject_test())
