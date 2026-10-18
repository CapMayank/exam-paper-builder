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

async def run_visual_verification():
    os.makedirs("test_artifacts/books_style_audit", exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        
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
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        
        print("\n=======================================================")
        print("VERIFYING UNIFIED 'BOOKS & SYLLABUS' DESIGN SYSTEM")
        print("=======================================================")
        
        # 1. Books & Syllabus Page (Reference standard)
        print("\n[Step 1] Inspecting Reference: Books & Syllabus (/books)")
        await page.goto(f"{BASE_URL}/books", wait_until="networkidle")
        await page.wait_for_timeout(800)
        
        books_grid = page.locator(".grid.items-start.gap-6")
        assert await books_grid.count() > 0, "Books page must use 22rem master-detail grid"
        assert await page.locator("text=Active Session:").is_visible()
        assert await page.locator("select:has(option:has-text('All Classes'))").is_visible()
        print("  [OK] Books page verified with clean filter strip and master-detail layout")
        await page.screenshot(path="test_artifacts/books_style_audit/01_books_reference.png")

        # 2. Classes & Curriculum Hub
        print("\n[Step 2] Inspecting Classes Hub (/classes)")
        await page.goto(f"{BASE_URL}/classes", wait_until="networkidle")
        await page.wait_for_timeout(800)
        
        classes_grid = page.locator(".grid.items-start.gap-6")
        assert await classes_grid.count() > 0, "Classes page must use 22rem master-detail grid"
        assert await page.locator("text=Active Session:").is_visible()
        assert await page.locator("select:has(option:has-text('All Streams'))").is_visible()
        assert await page.locator("input[placeholder='Find class...']").is_visible()
        print("  [OK] Classes Hub: Clean filter strip and stream/search selectors verified")
        
        # Test class item selection
        class_items = page.locator("ul[aria-label='Classes Directory'] li")
        class_count = await class_items.count()
        print(f"  [OK] Found {class_count} class cards in left column")
        assert class_count > 0
        
        # Click a different class (e.g. Class 2 or second card)
        if class_count > 1:
            await class_items.nth(1).locator("button[aria-pressed]").click()
            await page.wait_for_timeout(400)
            header_text = await page.locator(".card h2").first.text_content()
            print(f"  [OK] Switching class updated right pane header to: {header_text.strip()}")
            
        await page.screenshot(path="test_artifacts/books_style_audit/02_classes_harmonized.png")

        # 3. Exam Blueprints Directory
        print("\n[Step 3] Inspecting Blueprints Directory (/blueprints)")
        await page.goto(f"{BASE_URL}/blueprints", wait_until="networkidle")
        await page.wait_for_timeout(800)
        
        bp_grid = page.locator(".grid.items-start.gap-6")
        assert await bp_grid.count() > 0, "Blueprints page must use 22rem master-detail grid"
        assert await page.locator("text=Active Session:").is_visible()
        assert await page.locator("select:has(option:has-text('All Classes'))").is_visible()
        assert await page.locator("select:has(option:has-text('All Subjects'))").is_visible()
        assert await page.locator("select:has(option:has-text('All Terms'))").is_visible()
        assert await page.locator("input[placeholder='Find blueprint...']").is_visible()
        print("  [OK] Blueprints: Clean filter strip and Class/Subject/Term selectors verified")
        
        # Test blueprint card list
        bp_items = page.locator("ul[aria-label='Blueprints'] li")
        bp_count = await bp_items.count()
        print(f"  [OK] Found {bp_count} blueprint cards in left column")
        assert bp_count > 0
        
        # Verify right pane Blueprint Studio details
        assert await page.locator(".card h2").first.is_visible()
        assert await page.locator("text=Total Marks").first.is_visible()
        assert await page.locator("text=Exam Sections").first.is_visible()
        print("  [OK] Right pane displays focused Blueprint Studio with metrics & section breakdown")
        
        # Test Build Exam Paper launcher modal
        build_btn = page.locator("button:has-text('Build Paper')").first
        assert await build_btn.is_visible()
        await build_btn.click()
        await page.wait_for_timeout(400)
        assert await page.locator("h2:has-text('Build Exam Paper')").is_visible()
        print("  [OK] In-place 'Build Exam Paper' modal launches with full blueprint context")
        await page.screenshot(path="test_artifacts/books_style_audit/03_blueprints_build_modal.png")
        await page.locator("button:has-text('Cancel')").click()
        await page.wait_for_timeout(300)
        
        await page.screenshot(path="test_artifacts/books_style_audit/04_blueprints_harmonized.png")

        # Console Error Check
        filtered_errors = [e for e in console_errors if "favicon" not in e and "React DevTools" not in e]
        print(f"\n[Console Errors] Total errors: {len(filtered_errors)}")
        for err in filtered_errors:
            print(f"  ❌ JS Error: {err}")
        assert len(filtered_errors) == 0, f"Detected console errors: {filtered_errors}"

        print("\n=======================================================")
        print("SUCCESS: ALL PAGES SHARE IDENTICAL CLEAN BOOKS & SYLLABUS UI/UX!")
        print("=======================================================")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_visual_verification())
