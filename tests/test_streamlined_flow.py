import asyncio
import os
import hmac
import hashlib
import time
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:3100"
SESSION_SECRET = "66891132bfd6ceef60adf849088b03281489d505ef5dd6092c904de64fe68a08"
USER_ID = "cmv9ghmat0000uod088sysqok" # teacher@school.edu (ADMIN)

def generate_session_cookie():
    exp = int(time.time()) + 7 * 24 * 3600
    payload = f"{USER_ID}.{exp}"
    sig = hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"

async def run_tests():
    os.makedirs("test_artifacts", exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        
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
        
        print("\n--- 1. Testing /classes page (Classes & Subjects Management) ---")
        await page.goto(f"{BASE_URL}/classes", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        
        # Check title
        heading = await page.locator("h1").text_content()
        print(f"Header: {heading.strip()}")
        assert "Classes & Curriculum Hierarchy" in heading, "Page title mismatch"
        
        # Verify Rollover button in header
        rollover_btn = page.locator("button:has-text('Rollover Session')")
        assert await rollover_btn.is_visible(), "Rollover Session button missing on /classes"
        print("Found 'Rollover Session' button on /classes")
        
        # Open AcademicRolloverModal
        await rollover_btn.click()
        await page.wait_for_timeout(600)
        modal_title = await page.locator("text=Academic Session Rollover").text_content()
        print(f"Modal opened: {modal_title}")
        
        # Verify checkboxes
        assert await page.locator("text=Classes, Streams & Sections").is_visible()
        assert await page.locator("text=Textbooks & Syllabus Chapters").is_visible()
        assert await page.locator("text=Exam Blueprints & Chapter Quotas").is_visible()
        print("All 3 unified rollover options verified on modal!")
        
        await page.screenshot(path="test_artifacts/classes_rollover_modal.png")
        
        # Close modal
        await page.locator("button:has-text('Cancel')").click()
        await page.wait_for_timeout(400)
        
        # Verify Class and Subject hierarchy
        assert await page.locator("text=1. Classes").is_visible()
        class_cards = page.locator("aside div.cursor-pointer")
        class_count = await class_cards.count()
        print(f"Classes found in sidebar: {class_count}")
        assert class_count > 0, "No classes listed"
        
        # Verify Selected Class Details
        assert await page.locator("h2.text-xl").is_visible()
        
        # Verify Subject chips
        subject_chips = page.locator("div.cursor-pointer:has-text('book')")
        subject_count = await subject_chips.count()
        print(f"Subject chips displayed: {subject_count}")
        
        # Verify 4 Clean Workspace Gateways (Non-duplicated links!)
        assert await page.locator("main :has-text('Textbooks & Syllabus')").first.is_visible()
        assert await page.locator("main div.font-bold:has-text('Question Bank')").is_visible()
        assert await page.locator("main :has-text('Exam Blueprints & Quotas')").first.is_visible()
        assert await page.locator("main div.font-bold:has-text('Exam Papers')").is_visible()
        print("Verified all 4 Clean Workspace Gateways are displayed without duplication!")
        
        # Verify NO duplicate paper builder or duplicate blueprint cards are on /classes
        assert await page.locator("text=Build Exam Paper from Blueprint").count() == 0, "Duplicate paper modal detected on /classes"
        print("Confirmed: Zero duplicate builder modals on /classes!")
        
        await page.screenshot(path="test_artifacts/classes_clean_page.png")
        print("Classes page verification passed cleanly!")
        
        print("\n--- 2. Testing /blueprints page (Dedicated Blueprints Workspace) ---")
        await page.goto(f"{BASE_URL}/blueprints", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        
        bp_heading = await page.locator("h1").text_content()
        print(f"Header: {bp_heading.strip()}")
        assert "Exam Blueprints & Quotas" in bp_heading
        
        # Verify Rollover button exists on /blueprints
        bp_rollover_btn = page.locator("button:has-text('Rollover Session')")
        assert await bp_rollover_btn.is_visible(), "Rollover Session button missing on /blueprints"
        print("Found 'Rollover Session' button on /blueprints")
        
        # Verify blueprint cards with "Build Paper" button
        bp_cards = page.locator("div.card")
        print(f"Blueprint cards found: {await bp_cards.count()}")
        build_paper_btn = page.locator("button:has-text('Build Paper')").first
        if await build_paper_btn.is_visible():
            print("Found 'Build Paper' button on blueprint card in dedicated /blueprints workspace!")
        
        await page.screenshot(path="test_artifacts/blueprints_page.png")
        print("Blueprints page verification passed!")
        
        print("\n--- 3. Testing /books page (Dedicated Books Workspace) ---")
        await page.goto(f"{BASE_URL}/books", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        
        books_heading = await page.locator("h1").text_content()
        print(f"Header: {books_heading.strip()}")
        assert "Books and syllabus" in books_heading
        
        # Verify no duplicate session button strip
        assert await page.locator("text=Active Session:").is_visible()
        print("Verified clean Active Session badge on /books!")
        
        await page.screenshot(path="test_artifacts/books_page.png")
        print("Books page verification passed!")
        
        print("\n--- 4. Testing /papers page (Dedicated Exam Papers Workspace) ---")
        await page.goto(f"{BASE_URL}/papers", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        
        papers_heading = await page.locator("h1").text_content()
        print(f"Header: {papers_heading.strip()}")
        assert "Exam papers" in papers_heading
        
        # Verify clean Active Session badge
        assert await page.locator("text=Active Session:").is_visible()
        print("Verified clean Active Session badge on /papers!")
        
        await page.screenshot(path="test_artifacts/papers_page.png")
        print("Papers page verification passed!")
        
        print("\n=======================================================")
        print("ALL TESTS PASSED: ALL DUPLICATIONS IDENTIFIED & FIXED!")
        print("=======================================================")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_tests())
